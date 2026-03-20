from typing import List, Union

from fastapi import APIRouter, Depends, HTTPException, Path, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_admin, get_current_user
from app.modules.payroll.models import PayrollPayDate
from app.modules.payroll.schemas import (
    PayrollAdminUpdateInput,
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
