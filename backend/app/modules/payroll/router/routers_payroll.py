from typing import List, Union

from fastapi import APIRouter, Depends, HTTPException, Path, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import now_kst
from app.core.database import get_db
from app.core.security import get_current_admin, get_current_user
from app.modules.payroll.models import PayrollBulkEmailLog, PayrollPayDate
from app.modules.payroll.schemas import (
    PayrollAdminUpdateInput,
    PayrollBulkEmailLogResponse,
    PayrollBulkEmailResponse,
    PayrollEmailResult,
    PayrollPayDateCreate,
    PayrollPayDateResponse,
    PayrollPayDateUpdate,
    PayrollPayResponse,
    PayrollResponse,
)
from app.modules.payroll.services.payroll_service import PayrollService
from app.utils.permission_utils import is_system

router = APIRouter()


# ── 급여 조회 ──────────────────────────────────────────────
@router.get(
    "/",
    response_model=Union[List[PayrollResponse], PayrollPayResponse],
    summary="관리자: 전체조회 / 직원: 본인조회",
)
def get_payrolls(
    year: int = Query(...),
    month: int | None = Query(None),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    if is_system(user):
        raise HTTPException(status_code=403, detail="조회할 수 없는 계정입니다.")

    return PayrollService.get_payrolls(db=db, user=user, year=year, month=month)


# ── 관리자 급여 수정 ────────────────────────────────────────
@router.patch(
    "/{payroll_id}",
    response_model=PayrollResponse,
    summary="[관리자] 급여 항목 수정",
)
def update_payroll(
    payroll_id: int = Path(...),
    data: PayrollAdminUpdateInput = ...,
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    """
    관리자가 특정 직원의 급여 항목을 수정합니다.
    - gross_pay, total_deduction, net_pay 는 수정 불가 (자동 재계산)
    - 수정 후 변경된 PayrollResponse 반환
    """
    return PayrollService.update_payroll(db=db, payroll_id=payroll_id, data=data)


# ── 관리자 급여 삭제 ────────────────────────────────────────
@router.delete(
    "/{payroll_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="[관리자] 급여 내역 삭제",
)
def delete_payroll(
    payroll_id: int = Path(...),
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    """특정 직원의 급여 내역을 삭제합니다."""
    from app.modules.payroll.models import Payroll

    payroll = db.get(Payroll, payroll_id)
    if not payroll:
        raise HTTPException(status_code=404, detail="급여 기록을 찾을 수 없습니다.")
    db.delete(payroll)
    db.commit()


# ── 관리자 급여 전체 재계산 ─────────────────────────────────
@router.post(
    "/recalculate",
    summary="[관리자] 특정 연월 전직원 급여 재계산",
)
def recalculate_payroll(
    year: int = Query(...),
    month: int = Query(...),
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    """
    해당 연월에 급여 레코드가 존재하는 모든 직원의 payroll을
    출퇴근 이벤트 기반으로 재계산합니다.
    """
    from app.modules.payroll.models import Payroll
    from app.modules.workstatus.services import AttendanceService

    payrolls = (
        db.query(Payroll)
        .filter(Payroll.year == year, Payroll.month == month)
        .all()
    )
    if not payrolls:
        raise HTTPException(status_code=404, detail="해당 기간의 급여 데이터가 없습니다.")

    for p in payrolls:
        AttendanceService.recalculate_payroll_for_month(
            db=db, user_id=p.user_id, year=year, month=month
        )

    db.commit()
    return {"recalculated": len(payrolls), "year": year, "month": month}


# ── 관리자 엑셀 다운로드 ────────────────────────────────────
@router.get(
    "/export",
    summary="[관리자] 전직원 급여 엑셀 다운로드",
)
def export_payroll_excel(
    year: int = Query(...),
    month: int = Query(...),
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    """전직원 급여 데이터를 엑셀로 다운로드합니다."""
    from app.modules.auth.models import User
    from app.modules.payroll.models import Payroll

    payrolls_raw = (
        db.query(Payroll)
        .join(User, Payroll.user_id == User.id)
        .filter(Payroll.year == year, Payroll.month == month)
        .order_by(User.name)
        .all()
    )

    payrolls = [PayrollService._to_admin_response(p, db) for p in payrolls_raw]
    output = PayrollService.export_to_excel(payrolls, year, month)

    filename = f"payroll_{year}_{month:02d}.xlsx"
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


# ── 급여 지급일 관리 ────────────────────────────────────────
@router.post(
    "/pay-dates",
    response_model=PayrollPayDateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="급여 지급일 등록",
)
def create_payroll_pay_date(
    payload: PayrollPayDateCreate,
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    pay_date = PayrollPayDate(
        year=payload.year,
        month=payload.month,
        pay_date=payload.pay_date,
    )
    try:
        db.add(pay_date)
        db.commit()
        db.refresh(pay_date)
        return pay_date
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="해당 연월의 급여 지급일이 이미 존재합니다",
        )


@router.patch(
    "/pay-dates/{year}/{month}",
    response_model=PayrollPayDateResponse,
    summary="급여 지급일 수정",
)
def update_payroll_pay_date(
    year: int = Path(...),
    month: int = Path(...),
    payload: PayrollPayDateUpdate = ...,
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    pay_date = (
        db.query(PayrollPayDate)
        .filter(PayrollPayDate.year == year, PayrollPayDate.month == month)
        .first()
    )
    if not pay_date:
        raise HTTPException(status_code=404, detail="급여 지급일이 존재하지 않습니다")

    pay_date.pay_date = payload.pay_date
    db.commit()
    db.refresh(pay_date)
    return pay_date


@router.delete(
    "/pay-dates/{year}/{month}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="급여 지급일 삭제",
)
def delete_payroll_pay_date(
    year: int = Path(...),
    month: int = Path(...),
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    pay_date = (
        db.query(PayrollPayDate)
        .filter(PayrollPayDate.year == year, PayrollPayDate.month == month)
        .first()
    )
    if not pay_date:
        raise HTTPException(status_code=404, detail="급여 지급일이 존재하지 않습니다")

    db.delete(pay_date)
    db.commit()


# ── 급여명세서 이메일 발송 ─────────────────────────────────

@router.post(
    "/send-email-bulk",
    response_model=PayrollBulkEmailResponse,
    summary="[관리자] 급여명세서 이메일 일괄 발송",
)
def send_payroll_email_bulk(
    year: int = Query(...),
    month: int = Query(...),
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    """해당 연월의 전 직원 급여명세서를 이메일로 일괄 발송합니다."""
    from app.core.email_service import is_email_configured, send_payslip_email
    from app.modules.auth.models import User
    from app.modules.payroll.models import Payroll
    from app.modules.payroll.services.pdf_service import generate_payslip_pdf

    if not is_email_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="이메일 설정이 구성되지 않았습니다. 관리자에게 문의해주세요.",
        )

    payrolls_raw = (
        db.query(Payroll)
        .join(User, Payroll.user_id == User.id)
        .filter(Payroll.year == year, Payroll.month == month)
        .order_by(User.name)
        .all()
    )

    if not payrolls_raw:
        raise HTTPException(status_code=404, detail="해당 기간의 급여 데이터가 없습니다.")

    results: list[PayrollEmailResult] = []
    success_count = 0
    fail_count = 0
    skip_count = 0

    for payroll in payrolls_raw:
        try:
            payroll_data = PayrollService._to_admin_response(payroll, db)

            if not payroll_data.email:
                skip_count += 1
                results.append(PayrollEmailResult(
                    user_id=payroll.user_id,
                    name=payroll_data.name or "",
                    email=None,
                    success=False,
                    error="이메일 주소 없음",
                ))
                continue

            pdf_bytes = generate_payslip_pdf(payroll_data, year, month)
            send_payslip_email(
                to_email=payroll_data.email,
                employee_name=payroll_data.name,
                year=year,
                month=month,
                pdf_bytes=pdf_bytes,
            )
            success_count += 1
            results.append(PayrollEmailResult(
                user_id=payroll.user_id,
                name=payroll_data.name or "",
                email=payroll_data.email,
                success=True,
            ))
        except Exception as e:
            fail_count += 1
            results.append(PayrollEmailResult(
                user_id=payroll.user_id,
                name="",
                email=None,
                success=False,
                error=str(e),
            ))

    # 발송 이력 저장
    log = PayrollBulkEmailLog(
        year=year,
        month=month,
        sent_by_id=_admin.id,
        sent_at=now_kst(),
        success_count=success_count,
        fail_count=fail_count,
        skip_count=skip_count,
    )
    db.add(log)
    db.commit()

    return PayrollBulkEmailResponse(
        total=len(payrolls_raw),
        success_count=success_count,
        fail_count=fail_count,
        skip_count=skip_count,
        results=results,
    )


@router.get(
    "/send-email-bulk/history",
    response_model=List[PayrollBulkEmailLogResponse],
    summary="[관리자] 급여명세서 일괄 발송 이력 조회",
)
def get_bulk_email_history(
    year: int = Query(...),
    month: int = Query(...),
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    """해당 연월의 일괄 발송 이력을 최신순으로 반환합니다."""
    logs = (
        db.query(PayrollBulkEmailLog)
        .filter(PayrollBulkEmailLog.year == year, PayrollBulkEmailLog.month == month)
        .order_by(PayrollBulkEmailLog.sent_at.desc())
        .all()
    )
    return [
        PayrollBulkEmailLogResponse(
            id=log.id,
            year=log.year,
            month=log.month,
            sent_by_name=log.sent_by.name if log.sent_by else "알 수 없음",
            sent_at=log.sent_at,
            success_count=log.success_count,
            fail_count=log.fail_count,
            skip_count=log.skip_count,
        )
        for log in logs
    ]


@router.post(
    "/{payroll_id}/send-email",
    summary="[관리자] 급여명세서 이메일 단일 발송",
    status_code=status.HTTP_200_OK,
)
def send_payroll_email(
    payroll_id: int = Path(...),
    year: int = Query(...),
    month: int = Query(...),
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    """특정 직원에게 급여명세서 PDF를 이메일로 발송합니다."""
    from app.core.email_service import is_email_configured, send_payslip_email
    from app.modules.payroll.models import Payroll
    from app.modules.payroll.services.pdf_service import generate_payslip_pdf

    if not is_email_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="이메일 설정이 구성되지 않았습니다. 관리자에게 문의해주세요.",
        )

    payroll = db.get(Payroll, payroll_id)
    if not payroll:
        raise HTTPException(status_code=404, detail="급여 기록을 찾을 수 없습니다.")

    payroll_data = PayrollService._to_admin_response(payroll, db)

    if not payroll_data.email:
        raise HTTPException(status_code=400, detail="해당 직원의 이메일 주소가 등록되어 있지 않습니다.")

    try:
        pdf_bytes = generate_payslip_pdf(payroll_data, year, month)
        send_payslip_email(
            to_email=payroll_data.email,
            employee_name=payroll_data.name,
            year=year,
            month=month,
            pdf_bytes=pdf_bytes,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"이메일 발송 실패: {str(e)}")

    return {"success": True, "message": f"{payroll_data.name}님께 급여명세서를 발송했습니다."}
