from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_admin
from app.modules.wage import models, schemas, services

router = APIRouter()
admin_router = APIRouter()


@router.post(
    "/user", response_model=schemas.UserWageResponse, summary="유저 전용 시급 설정"
)  #
def create_user_wage(
    data: schemas.UserWageCreate,
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin),
):
    record = models.UserWage(**data.dict())
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.get(
    "/user/{user_id}",
    response_model=list[schemas.UserWageResponse],
    summary="유저 전용 시급 조회",
)  # 유저 전용 시급 조회
def get_user_wage_list(
    user_id: int, db: Session = Depends(get_db), admin=Depends(get_current_admin)
):
    records = db.query(models.UserWage).filter(models.UserWage.user_id == user_id).all()
    return records


@admin_router.get(
    "/current",
    response_model=schemas.DefaultWageResponse,
    summary="현재 연도 최저임금 조회",
)
def get_current_year_default_wage(
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin),
):
    """현재 연도(서버 기준)의 최저임금을 반환합니다."""
    year = date.today().year
    record = (
        db.query(models.DefaultWage)
        .filter(models.DefaultWage.year == year)
        .first()
    )
    if not record:
        raise HTTPException(
            status_code=404,
            detail=f"{year}년 최저임금이 등록되지 않았습니다.",
        )
    return record


@admin_router.post(
    "/",
    response_model=schemas.DefaultWageResponse,
    status_code=status.HTTP_201_CREATED,
    summary="최저임금 등록",
)
def sync_default_wage(
    year: int, db: Session = Depends(get_db), admin=Depends(get_current_admin)
):
    """
    연도만 입력하면
    - 최저임금위원회 사이트에서 자동 수집
    - DB에 upsert
    """

    wage = services.fetch_minimum_wage_by_year(year)

    record = (
        db.query(models.DefaultWage).filter(models.DefaultWage.year == year).first()
    )

    if record:
        record.wage = wage
    else:
        record = models.DefaultWage(
            year=year,
            wage=wage,
        )
        db.add(record)

    db.commit()
    db.refresh(record)
    return record


@admin_router.get(
    "/",
    response_model=list[schemas.DefaultWageResponse],
    summary="연도별 최저임금 조회",
)  # 연도별 최저임금 조회
def list_default_wages(db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    return db.query(models.DefaultWage).order_by(models.DefaultWage.year.desc()).all()


@admin_router.post(
    "/all",
    status_code=status.HTTP_201_CREATED,
    summary="최저임금 불러오기",
)
def sync_all_default_wages(
    db: Session = Depends(get_db), admin=Depends(get_current_admin)
):
    """
    최저임금위원회 사이트 기준
    존재하는 모든 연도 최저임금 DB에 등록
    """

    data = services.fetch_all_minimum_wages()
    saved = 0
    updated = 0

    for year, wage in data.items():
        record = (
            db.query(models.DefaultWage).filter(models.DefaultWage.year == year).first()
        )

        if record:
            if record.wage != wage:
                record.wage = wage
                updated += 1
        else:
            db.add(
                models.DefaultWage(
                    year=year,
                    wage=wage,
                )
            )
            saved += 1

    db.commit()

    return {
        "total": len(data),
        "inserted": saved,
        "updated": updated,
    }
