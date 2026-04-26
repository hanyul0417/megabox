from datetime import date

import requests
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.security import get_current_admin, get_current_user
from app.modules.admin import models, schemas, services
from app.modules.admin.models import InsuranceRate, ShiftPreset
from app.modules.admin.schemas import (
    DayoffSettingOut,
    DayoffSettingUpdate,
    InsuranceRateCreate,
    InsuranceRateResponse,
    ShiftPresetCreate,
    ShiftPresetOut,
    ShiftPresetUpdate,
)

router = APIRouter()
holiday_router = APIRouter()
shift_preset_router = APIRouter()
dayoff_setting_router = APIRouter()


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
    return services.update_dayoff_setting(db, payload.monthly_limit)
