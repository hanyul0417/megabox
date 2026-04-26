from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Path, Query, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_admin
from app.modules.admin import schemas, services
from app.modules.auth.models import User
from app.utils.audit import write_audit_log

router = APIRouter(tags=["유저관리"])


# ── 직원 CRUD ─────────────────────────────────────────────────────────────
@router.post(
    "/users/create",
    response_model=schemas.UserOut,
    status_code=status.HTTP_201_CREATED,
    summary="유저 생성 (관리자 직접 생성 → 즉시 APPROVED)",
)
def create_user(
    payload: schemas.UserCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    try:
        user = services.create_user(db, payload)
        write_audit_log(db, "ADMIN_USER_CREATED", actor_id=admin.id, target_user_id=user.id)
        db.commit()
        db.refresh(user)
        return user
    except ValueError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=500, detail="DB error")


@router.patch(
    "/users/wage/bulk",
    response_model=schemas.BulkWageUpdateResult,
    summary="시급 일괄 적용 (전체 또는 미설정 직원)",
)
def bulk_update_wage(
    payload: schemas.BulkWageUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    try:
        count = services.bulk_update_wage(db, payload.wage, payload.zero_only)
        write_audit_log(
            db,
            "ADMIN_WAGE_BULK_UPDATED",
            actor_id=admin.id,
            details={
                "wage": payload.wage,
                "zero_only": payload.zero_only,
                "updated_count": count,
            },
        )
        db.commit()
        return {"updated_count": count}
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=500, detail="DB error")


@router.get("/users", response_model=schemas.PaginatedUsers, summary="유저 목록 조회")
def list_users(
    q:      Optional[str] = Query(None),
    limit:  int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    total, items = services.list_users(db, q, limit, offset)
    return {"total": total, "items": items}


@router.get("/users/{memberId}", response_model=schemas.UserDetailOut, summary="유저 단일 조회")
def get_user_detail(
    memberId: int = Path(..., ge=1),
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    try:
        return services.get_user_detail(db, memberId)
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.patch("/users/{memberId}", response_model=schemas.UserOut, summary="유저 정보 수정")
def update_user(
    memberId: int = Path(..., ge=1),
    payload: schemas.UserUpdate = ...,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    try:
        user = services.update_user(db, memberId, payload)
        write_audit_log(db, "ADMIN_USER_UPDATED", actor_id=admin.id, target_user_id=memberId)
        db.commit()
        return user
    except LookupError as e:
        db.rollback()
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.delete(
    "/users/{memberId}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="유저 삭제",
)
def delete_user(
    memberId: int = Path(..., ge=1),
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    try:
        services.delete_user(db, memberId)
        write_audit_log(db, "ADMIN_USER_DELETED", actor_id=admin.id, target_user_id=memberId)
        db.commit()
    except LookupError as e:
        db.rollback()
        raise HTTPException(status_code=404, detail=str(e))


# ── 유니폼 관리 ───────────────────────────────────────────────────────────
@router.get("/uniforms", response_model=List[schemas.UniformWithUserOut], summary="유니폼 목록 (크루·리더)")
def list_uniforms(
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    return services.list_uniforms(db)


@router.put("/uniforms/{user_id}", response_model=schemas.UniformWithUserOut, summary="유니폼 저장 (upsert)")
def upsert_uniform(
    user_id: int = Path(..., ge=1),
    payload: schemas.UniformUpdate = ...,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    try:
        result = services.upsert_uniform(db, user_id, payload)
        db.commit()
        return result
    except LookupError as e:
        db.rollback()
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/uniform-stock", response_model=List[schemas.UniformStockOut], summary="유니폼 재고 목록")
def list_stock(
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    return services.list_stock(db)


@router.put("/uniform-stock/{item_key}", response_model=schemas.UniformStockOut, summary="유니폼 재고 수정")
def update_stock(
    item_key: str = Path(...),
    payload: schemas.UniformStockUpdate = ...,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    try:
        result = services.update_stock(db, item_key, payload.quantity)
        db.commit()
        return result
    except LookupError as e:
        db.rollback()
        raise HTTPException(status_code=404, detail=str(e))


# ── 가입 승인 관리 ────────────────────────────────────────────────────────
@router.get(
    "/pending-users",
    response_model=schemas.PaginatedPendingUsers,
    summary="가입 승인 대기 목록",
)
def list_pending_users(
    limit:  int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    total, items = services.list_pending_users(db, limit, offset)
    return {"total": total, "items": items}


@router.post("/users/{memberId}/approve", response_model=schemas.UserOut, summary="가입 승인")
def approve_user(
    memberId: int = Path(..., ge=1),
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    try:
        user = services.approve_user(db, memberId, admin.id)
        write_audit_log(db, "USER_APPROVED", actor_id=admin.id, target_user_id=memberId)
        db.commit()
        return user
    except LookupError as e:
        db.rollback()
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/users/{memberId}/reject", response_model=schemas.UserOut, summary="가입 거절")
def reject_user(
    memberId: int = Path(..., ge=1),
    payload: schemas.RejectRequest = schemas.RejectRequest(),
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    try:
        user = services.reject_user(db, memberId, admin.id, reason=payload.reason)
        write_audit_log(
            db, "USER_REJECTED", actor_id=admin.id, target_user_id=memberId,
            details={"reason": payload.reason},
        )
        db.commit()
        return user
    except LookupError as e:
        db.rollback()
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/users/{memberId}/suspend", response_model=schemas.UserOut, summary="계정 정지")
def suspend_user(
    memberId: int = Path(..., ge=1),
    payload: schemas.SuspendRequest = schemas.SuspendRequest(),
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    try:
        user = services.suspend_user(db, memberId, admin.id, reason=payload.reason)
        write_audit_log(
            db, "USER_SUSPENDED", actor_id=admin.id, target_user_id=memberId,
            details={"reason": payload.reason},
        )
        db.commit()
        return user
    except LookupError as e:
        db.rollback()
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/users/{memberId}/unsuspend", response_model=schemas.UserOut, summary="계정 정지 해제")
def unsuspend_user(
    memberId: int = Path(..., ge=1),
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    try:
        user = services.unsuspend_user(db, memberId, admin.id)
        write_audit_log(db, "USER_UNSUSPENDED", actor_id=admin.id, target_user_id=memberId)
        db.commit()
        return user
    except LookupError as e:
        db.rollback()
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
