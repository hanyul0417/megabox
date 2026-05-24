from datetime import date

import requests
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.security import get_current_admin, get_current_user
from app.modules.admin import models, schemas, services
from app.modules.admin.models import ChecklistCheck, ChecklistItem, InsuranceRate, KioskNotice, ShiftPreset
from app.modules.admin.schemas import (
    ChecklistItemCreate,
    ChecklistItemOut,
    ChecklistItemUpdate,
    ChecklistItemWithStatus,
    ChecklistToggleResponse,
    DayoffSettingOut,
    DayoffSettingUpdate,
    InsuranceRateCreate,
    InsuranceRateResponse,
    KioskNoticeCreate,
    KioskNoticeOut,
    KioskNoticeUpdate,
    ShiftPresetCreate,
    ShiftPresetOut,
    ShiftPresetUpdate,
)

router = APIRouter()
holiday_router = APIRouter()
shift_preset_router = APIRouter()
dayoff_setting_router = APIRouter()
kiosk_notice_router = APIRouter()
checklist_router = APIRouter()

MAX_KIOSK_NOTICES = 5
MAX_CHECKLIST_PER_DAY = 5


HOLIDAY_API_KEY = settings.HOLIDAY_API_KEY

if not HOLIDAY_API_KEY:
    raise RuntimeError("HOLIDAY_API_KEY is not set")


# ---------- 공휴일 ----------


@holiday_router.post(
    "/holidays/all",
    status_code=status.HTTP_201_CREATED,
    summary="공휴일 자동 등록",
)
def sync_holidays(
    year: int,
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    url = (
        "https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo"
    )

    params = {
        "serviceKey": HOLIDAY_API_KEY,
        "solYear": year,
        "_type": "json",
        "numOfRows": 100,
    }

    try:
        res = requests.get(url, params=params, timeout=20)
        res.raise_for_status()
    except requests.RequestException:
        raise HTTPException(status_code=502, detail="공휴일 API 호출 실패")

    body = res.json()["response"]["body"]
    items = body.get("items")
    if not items:
        return {"year": year, "saved": 0}

    saved = 0
    for item in items["item"]:
        ymd = str(item["locdate"])
        holiday = models.Holiday(
            date=date(int(ymd[:4]), int(ymd[4:6]), int(ymd[6:])),
            label=item["dateName"],
        )
        try:
            with db.begin_nested():
                db.add(holiday)
            saved += 1
        except IntegrityError:
            continue

    db.commit()
    return {"year": year, "saved": saved}


@holiday_router.post(
    "/holidays",
    response_model=schemas.HolidayOut,
    status_code=status.HTTP_201_CREATED,
    summary="공휴일 수동 등록",
)
def create_holiday_manual(
    payload: schemas.HolidayCreate,
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    exists = (
        db.query(models.Holiday).filter(models.Holiday.date == payload.date).first()
    )
    if exists:
        raise HTTPException(status_code=409, detail="이미 존재하는 공휴일입니다")

    holiday = models.Holiday(**payload.dict())
    db.add(holiday)
    db.commit()
    db.refresh(holiday)
    return holiday


@holiday_router.get(
    "/holidays",
    response_model=list[schemas.HolidayOut],
    summary="공휴일 조회",
)
def list_holidays(
    year: int, db: Session = Depends(get_db), admin=Depends(get_current_admin)
):
    start = date(year, 1, 1)
    end = date(year, 12, 31)

    return (
        db.query(models.Holiday)
        .filter(models.Holiday.date.between(start, end))
        .order_by(models.Holiday.date)
        .all()
    )


@holiday_router.put(
    "/holidays/{holiday_id}",
    response_model=schemas.HolidayOut,
    summary="공휴일 수정",
)
def update_holiday(
    holiday_id: int,
    payload: schemas.HolidayUpdate,
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    holiday = db.query(models.Holiday).get(holiday_id)
    if not holiday:
        raise HTTPException(status_code=404, detail="공휴일 없음")

    if payload.date is not None:
        holiday.date = payload.date
    if payload.label is not None:
        holiday.label = payload.label

    db.commit()
    db.refresh(holiday)
    return holiday


@holiday_router.delete(
    "/holidays/{holiday_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="공휴일 삭제",
)
def delete_holiday(
    holiday_id: int,
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    holiday = db.query(models.Holiday).get(holiday_id)
    if not holiday:
        raise HTTPException(status_code=404, detail="공휴일 없음")

    db.delete(holiday)
    db.commit()


# ---------- 4대보험 ----------


@router.post(
    "/insurance-rates",
    response_model=InsuranceRateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="4대보험 요율 생성",
)
def create_insurance_rate(
    payload: InsuranceRateCreate,
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    exists = db.query(InsuranceRate).filter_by(year=payload.year).first()
    if exists:
        raise HTTPException(status_code=409, detail="이미 존재하는 연도입니다")

    rate = InsuranceRate(**payload.dict())
    db.add(rate)
    db.commit()
    db.refresh(rate)
    return rate


@router.get(
    "/insurance-rates/{year}",
    response_model=InsuranceRateResponse,
    summary="4대보험 요율 연도 조회",
)
def get_insurance_rate(
    year: int, db: Session = Depends(get_db), _admin=Depends(get_current_admin)
):
    rate = db.query(InsuranceRate).filter_by(year=year).first()
    if not rate:
        raise HTTPException(status_code=404, detail="Insurance rate not found")
    return rate


@router.get(
    "/insurance-rates",
    response_model=list[InsuranceRateResponse],
    summary="4대보험 요율 전체 조회",
)
def list_insurance_rates(
    db: Session = Depends(get_db), _admin=Depends(get_current_admin)
):
    return db.query(InsuranceRate).order_by(InsuranceRate.year.desc()).all()


@router.put(
    "/insurance-rates/{year}",
    response_model=InsuranceRateResponse,
    summary="4대보험 요율 수정",
)
def update_insurance_rate(
    year: int,
    payload: InsuranceRateCreate,
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    rate = db.query(InsuranceRate).filter_by(year=year).first()
    if not rate:
        raise HTTPException(status_code=404, detail="Insurance rate not found")

    for field, value in payload.dict().items():
        setattr(rate, field, value)

    db.commit()
    db.refresh(rate)
    return rate


@router.delete(
    "/insurance-rates/{year}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="4대보험 요율 삭제",
)
def delete_insurance_rate(
    year: int,
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    rate = db.query(InsuranceRate).filter_by(year=year).first()
    if not rate:
        raise HTTPException(status_code=404, detail="Insurance rate not found")

    db.delete(rate)
    db.commit()


# ---------- 시프트 프리셋 ----------

MAX_SHIFT_PRESETS = 8


@shift_preset_router.get(
    "/shift-presets",
    response_model=list[ShiftPresetOut],
    summary="시프트 프리셋 목록 조회",
)
def list_shift_presets(
    db: Session = Depends(get_db),
    _user=Depends(get_current_user),
):
    return (
        db.query(ShiftPreset)
        .order_by(ShiftPreset.sort_order, ShiftPreset.id)
        .all()
    )


@shift_preset_router.post(
    "/shift-presets",
    response_model=ShiftPresetOut,
    status_code=status.HTTP_201_CREATED,
    summary="시프트 프리셋 생성",
)
def create_shift_preset(
    payload: ShiftPresetCreate,
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    count = db.query(ShiftPreset).count()
    if count >= MAX_SHIFT_PRESETS:
        raise HTTPException(
            status_code=400,
            detail=f"시프트 프리셋은 최대 {MAX_SHIFT_PRESETS}개까지 등록할 수 있습니다.",
        )

    preset = ShiftPreset(**payload.dict())
    db.add(preset)
    db.commit()
    db.refresh(preset)
    return preset


@shift_preset_router.put(
    "/shift-presets/{preset_id}",
    response_model=ShiftPresetOut,
    summary="시프트 프리셋 수정",
)
def update_shift_preset(
    preset_id: int,
    payload: ShiftPresetUpdate,
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    preset = db.query(ShiftPreset).get(preset_id)
    if not preset:
        raise HTTPException(status_code=404, detail="시프트 프리셋을 찾을 수 없습니다.")

    for field, value in payload.dict(exclude_unset=True).items():
        setattr(preset, field, value)

    db.commit()
    db.refresh(preset)
    return preset


@shift_preset_router.delete(
    "/shift-presets/{preset_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="시프트 프리셋 삭제",
)
def delete_shift_preset(
    preset_id: int,
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    preset = db.query(ShiftPreset).get(preset_id)
    if not preset:
        raise HTTPException(status_code=404, detail="시프트 프리셋을 찾을 수 없습니다.")

    db.delete(preset)
    db.commit()


# ---------- 휴무 한도 설정 ----------


@dayoff_setting_router.get(
    "/dayoff-setting",
    response_model=DayoffSettingOut,
    summary="주말/공휴일 휴무 한도 조회",
)
def get_dayoff_setting(
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    return services.get_dayoff_setting(db)


@dayoff_setting_router.put(
    "/dayoff-setting",
    response_model=DayoffSettingOut,
    summary="주말/공휴일 휴무 한도 수정",
)
def update_dayoff_setting(
    payload: DayoffSettingUpdate,
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    return services.update_dayoff_setting(
        db,
        payload.monthly_limit,
        payload.default_annual_leave_hours,
        payload.annual_leave_pay_method,
    )


# ---------- 키오스크 공지사항 ----------


@kiosk_notice_router.get(
    "/kiosk-notices",
    response_model=list[KioskNoticeOut],
    summary="키오스크 공지사항 전체 목록 (관리자)",
)
def list_kiosk_notices(
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    return (
        db.query(KioskNotice)
        .order_by(KioskNotice.sort_order, KioskNotice.id)
        .all()
    )


@kiosk_notice_router.get(
    "/kiosk-notices/active",
    response_model=list[KioskNoticeOut],
    summary="현재 활성 공지사항 조회 (키오스크용, 인증 필요)",
)
def get_active_kiosk_notices(
    db: Session = Depends(get_db),
    _user=Depends(get_current_user),
):
    today = date.today()
    return (
        db.query(KioskNotice)
        .filter(
            KioskNotice.is_active == True,  # noqa: E712
            KioskNotice.start_date <= today,
            KioskNotice.end_date >= today,
        )
        .order_by(KioskNotice.sort_order, KioskNotice.id)
        .all()
    )


@kiosk_notice_router.post(
    "/kiosk-notices",
    response_model=KioskNoticeOut,
    status_code=status.HTTP_201_CREATED,
    summary="키오스크 공지사항 생성",
)
def create_kiosk_notice(
    payload: KioskNoticeCreate,
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    count = db.query(KioskNotice).count()
    if count >= MAX_KIOSK_NOTICES:
        raise HTTPException(
            status_code=400,
            detail=f"공지사항은 최대 {MAX_KIOSK_NOTICES}개까지 등록할 수 있습니다.",
        )
    if payload.end_date < payload.start_date:
        raise HTTPException(status_code=400, detail="종료일이 시작일보다 앞설 수 없습니다.")

    notice = KioskNotice(**payload.dict())
    db.add(notice)
    db.commit()
    db.refresh(notice)
    return notice


@kiosk_notice_router.put(
    "/kiosk-notices/{notice_id}",
    response_model=KioskNoticeOut,
    summary="키오스크 공지사항 수정",
)
def update_kiosk_notice(
    notice_id: int,
    payload: KioskNoticeUpdate,
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    notice = db.query(KioskNotice).get(notice_id)
    if not notice:
        raise HTTPException(status_code=404, detail="공지사항을 찾을 수 없습니다.")

    data = payload.dict(exclude_unset=True)
    start = data.get("start_date", notice.start_date)
    end = data.get("end_date", notice.end_date)
    if end < start:
        raise HTTPException(status_code=400, detail="종료일이 시작일보다 앞설 수 없습니다.")

    for field, value in data.items():
        setattr(notice, field, value)

    db.commit()
    db.refresh(notice)
    return notice


@kiosk_notice_router.delete(
    "/kiosk-notices/{notice_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="키오스크 공지사항 삭제",
)
def delete_kiosk_notice(
    notice_id: int,
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    notice = db.query(KioskNotice).get(notice_id)
    if not notice:
        raise HTTPException(status_code=404, detail="공지사항을 찾을 수 없습니다.")

    db.delete(notice)
    db.commit()


# ---------- 요일별 체크리스트 ----------


@checklist_router.get(
    "/checklist",
    response_model=list[ChecklistItemOut],
    summary="체크리스트 전체 목록 (관리자)",
)
def list_checklist_items(
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    return (
        db.query(ChecklistItem)
        .order_by(ChecklistItem.day_of_week, ChecklistItem.sort_order, ChecklistItem.id)
        .all()
    )


@checklist_router.get(
    "/checklist/today",
    response_model=list[ChecklistItemWithStatus],
    summary="오늘 체크리스트 + 완료 여부 (키오스크용)",
)
def get_today_checklist(
    db: Session = Depends(get_db),
    _user=Depends(get_current_user),
):
    today = date.today()
    day = today.weekday()  # 0=Mon(월) ~ 6=Sun(일)

    items = (
        db.query(ChecklistItem)
        .filter(ChecklistItem.day_of_week == day, ChecklistItem.is_active == True)  # noqa: E712
        .order_by(ChecklistItem.sort_order, ChecklistItem.id)
        .all()
    )
    if not items:
        return []

    checked_ids = {
        row[0]
        for row in db.query(ChecklistCheck.item_id)
        .filter(
            ChecklistCheck.check_date == today,
            ChecklistCheck.item_id.in_([i.id for i in items]),
        )
        .all()
    }

    return [
        ChecklistItemWithStatus(
            id=item.id,
            content=item.content,
            sort_order=item.sort_order,
            is_checked=item.id in checked_ids,
        )
        for item in items
    ]


@checklist_router.post(
    "/checklist",
    response_model=ChecklistItemOut,
    status_code=status.HTTP_201_CREATED,
    summary="체크리스트 항목 생성",
)
def create_checklist_item(
    payload: ChecklistItemCreate,
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    count = (
        db.query(ChecklistItem)
        .filter(ChecklistItem.day_of_week == payload.day_of_week)
        .count()
    )
    if count >= MAX_CHECKLIST_PER_DAY:
        raise HTTPException(
            status_code=400,
            detail=f"요일당 최대 {MAX_CHECKLIST_PER_DAY}개까지 등록 가능합니다.",
        )

    item = ChecklistItem(**payload.dict())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@checklist_router.put(
    "/checklist/{item_id}",
    response_model=ChecklistItemOut,
    summary="체크리스트 항목 수정",
)
def update_checklist_item(
    item_id: int,
    payload: ChecklistItemUpdate,
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    item = db.query(ChecklistItem).get(item_id)
    if not item:
        raise HTTPException(status_code=404, detail="항목을 찾을 수 없습니다.")

    for field, value in payload.dict(exclude_unset=True).items():
        setattr(item, field, value)

    db.commit()
    db.refresh(item)
    return item


@checklist_router.delete(
    "/checklist/{item_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="체크리스트 항목 삭제",
)
def delete_checklist_item(
    item_id: int,
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    item = db.query(ChecklistItem).get(item_id)
    if not item:
        raise HTTPException(status_code=404, detail="항목을 찾을 수 없습니다.")

    db.delete(item)
    db.commit()


@checklist_router.post(
    "/checklist/{item_id}/toggle",
    response_model=ChecklistToggleResponse,
    summary="체크/언체크 토글 (키오스크용)",
)
def toggle_checklist_check(
    item_id: int,
    db: Session = Depends(get_db),
    _user=Depends(get_current_user),
):
    item = db.query(ChecklistItem).get(item_id)
    if not item:
        raise HTTPException(status_code=404, detail="항목을 찾을 수 없습니다.")

    today = date.today()
    existing = (
        db.query(ChecklistCheck)
        .filter(ChecklistCheck.item_id == item_id, ChecklistCheck.check_date == today)
        .first()
    )

    if existing:
        db.delete(existing)
        db.commit()
        return ChecklistToggleResponse(item_id=item_id, checked=False)
    else:
        check = ChecklistCheck(item_id=item_id, check_date=today)
        db.add(check)
        db.commit()
        return ChecklistToggleResponse(item_id=item_id, checked=True)
