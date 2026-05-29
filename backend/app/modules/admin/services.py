# app/modules/admin/services.py
from datetime import date, datetime, timedelta
from typing import List, Optional, Tuple

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import now_kst
from app.modules.admin import schemas
from app.modules.admin.models import DayoffSetting, Holiday, InsuranceRate, UserUniform, UniformStock
from app.modules.admin.schemas import InsuranceRateCreate, InsuranceRateUpdate
from app.modules.auth.models import PositionEnum, StatusEnum, User
from app.modules.auth.services import decrypt_ssn, encrypt_ssn, hash_password, verify_password


# ── unavailable_times 헬퍼 ───────────────────────────────────────────────
def _times_to_days(unavailable_times: dict) -> list[int]:
    """unavailable_times에서 all_day=True인 요일 번호 추출"""
    if not unavailable_times:
        return []
    return sorted(int(k) for k, v in unavailable_times.items() if v.get("all_day", False))


def _serialize_times(unavailable_times) -> dict | None:
    """Pydantic 모델 또는 dict를 JSON 저장 가능한 순수 dict로 변환"""
    if unavailable_times is None:
        return None
    if isinstance(unavailable_times, dict):
        result = {}
        for k, v in unavailable_times.items():
            if hasattr(v, "model_dump"):
                result[str(k)] = v.model_dump()
            else:
                result[str(k)] = v
        return result
    return unavailable_times


# ── User (직원 관리) ──────────────────────────────────────────────────────
def create_user(db: Session, data: schemas.UserCreate) -> User:
    serialized_times = _serialize_times(data.unavailable_times)
    computed_days = data.unavailable_days
    if serialized_times is not None:
        computed_days = _times_to_days(serialized_times)

    user = User(
        username=data.username,
        password=hash_password(data.password),
        name=data.name,
        position=data.position,
        gender=data.gender,
        birth_date=data.birth_date,
        ssn=encrypt_ssn(data.ssn) if data.ssn else None,
        phone=data.phone,
        email=str(data.email) if data.email else None,
        bank_name=data.bank_name,
        account_number=data.account_number,
        hire_date=data.hire_date,
        retire_date=data.retire_date,
        unavailable_days=computed_days,
        unavailable_times=serialized_times,
        health_cert_expire=data.health_cert_expire,
        weekend_dayoff_limit=data.weekend_dayoff_limit,
        is_active=data.is_active,
        status=StatusEnum.approved,  # 관리자가 직접 생성 → 즉시 승인
    )
    db.add(user)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise ValueError("이미 사용 중인 username 입니다.")
    return user


def get_user_detail(db: Session, memberId: int) -> User:
    user = db.get(User, memberId)
    if not user or user.deleted_at is not None:
        raise LookupError("사용자를 찾을 수 없습니다.")
    if user.ssn:
        user.ssn = decrypt_ssn(user.ssn)
    return user


def list_users(
    db: Session, q: Optional[str], limit: int, offset: int
) -> Tuple[int, List[User]]:
    stmt = select(User).where(User.deleted_at == None)  # noqa: E711
    if q:
        like = f"%{q}%"
        stmt = stmt.where(
            (User.name.ilike(like))
            | (User.username.ilike(like))
            | (User.email.ilike(like))
        )
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = db.execute(count_stmt).scalar_one()
    items = (
        db.execute(
            stmt.order_by(User.position, func.isnull(User.hire_date), User.hire_date)
            .limit(limit)
            .offset(offset)
        )
        .scalars()
        .all()
    )
    # SSN 복호화 (목록에서도 상세 정보 표시를 위해)
    for user in items:
        if user.ssn:
            try:
                user.ssn = decrypt_ssn(user.ssn)
            except Exception:
                user.ssn = None
    return total, items


def update_user(db: Session, user_id: int, data: schemas.UserUpdate) -> User:
    user = db.get(User, user_id)
    if not user:
        raise LookupError("해당 사용자가 존재하지 않습니다.")
    payload = data.model_dump(exclude_unset=True)

    if "password" in payload:
        if payload["password"]:
            payload["password"] = hash_password(payload["password"])
        else:
            del payload["password"]  # 빈 문자열이면 변경하지 않음

    if "ssn" in payload:
        if payload["ssn"]:
            payload["ssn"] = encrypt_ssn(payload["ssn"])
        else:
            payload["ssn"] = None

    # unavailable_times가 포함된 경우 unavailable_days도 자동 동기화
    if "unavailable_times" in payload:
        serialized = _serialize_times(payload["unavailable_times"])
        payload["unavailable_times"] = serialized
        payload["unavailable_days"] = _times_to_days(serialized) if serialized else []

    for k, v in payload.items():
        setattr(user, k, v)  # wage 포함 모든 필드를 User 모델에 직접 반영

    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise ValueError("중복 또는 제약조건 위반입니다.")
    return user


def bulk_update_wage(db: Session, wage: int, zero_only: bool) -> int:
    """
    전체 또는 시급 미설정(0) 직원의 시급을 일괄 변경.
    시스템 계정(PositionEnum.system)은 제외.
    """
    stmt = (
        select(User)
        .where(User.deleted_at == None)  # noqa: E711
        .where(User.status == StatusEnum.approved)
        .where(User.position != PositionEnum.system)
    )
    if zero_only:
        stmt = stmt.where(User.wage == 0)
    users = db.execute(stmt).scalars().all()
    for user in users:
        user.wage = wage
    db.flush()
    return len(users)


SOFT_DELETE_RETENTION_DAYS = 30


def delete_user(db: Session, user_id: int, admin: User, admin_password: str, delete_reason: Optional[str] = None) -> None:
    """관리자 비밀번호 검증 후 소프트 삭제 (30일 후 자동 하드 삭제)"""
    if not verify_password(admin_password, admin.password):
        raise PermissionError("관리자 비밀번호가 올바르지 않습니다.")
    user = db.get(User, user_id)
    if not user:
        raise LookupError("해당 사용자가 존재하지 않습니다.")
    if user.deleted_at is not None:
        raise LookupError("이미 삭제된 사용자입니다.")
    if user.id == admin.id:
        raise ValueError("자기 자신은 삭제할 수 없습니다.")
    user.deleted_at    = now_kst()
    user.deleted_by    = admin.id
    user.delete_reason = delete_reason




def list_deleted_users(db: Session, limit: int, offset: int):
    """소프트 삭제된 직원 목록 (30일 이내 복구 가능)"""
    cutoff = now_kst() - timedelta(days=SOFT_DELETE_RETENTION_DAYS)
    stmt = (
        select(User)
        .where(User.deleted_at != None)  # noqa: E711
        .where(User.deleted_at >= cutoff)
        .order_by(User.deleted_at.desc())
    )
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = db.execute(count_stmt).scalar_one()
    items = db.execute(stmt.limit(limit).offset(offset)).scalars().all()
    from datetime import timezone
    now = now_kst()
    result = []
    for u in items:
        deleted_dt = u.deleted_at
        if deleted_dt.tzinfo is None:
            from app.core.config import KST
            deleted_dt = deleted_dt.replace(tzinfo=KST)
        if now.tzinfo is None:
            from app.core.config import KST
            now = now.replace(tzinfo=KST)
        days_elapsed = (now - deleted_dt).days
        days_remaining = max(0, SOFT_DELETE_RETENTION_DAYS - days_elapsed)
        result.append({
            "id": u.id,
            "username": u.username,
            "name": u.name,
            "position": u.position,
            "hire_date": u.hire_date,
            "deleted_at": u.deleted_at,
            "delete_reason": u.delete_reason,
            "days_remaining": days_remaining,
        })
    return total, result


def restore_user(db: Session, user_id: int) -> User:
    """소프트 삭제된 직원 복구"""
    cutoff = now_kst() - timedelta(days=SOFT_DELETE_RETENTION_DAYS)
    user = db.get(User, user_id)
    if not user or user.deleted_at is None:
        raise LookupError("삭제된 사용자를 찾을 수 없습니다.")
    deleted_dt = user.deleted_at
    if deleted_dt.tzinfo is None:
        from app.core.config import KST
        deleted_dt = deleted_dt.replace(tzinfo=KST)
    if deleted_dt < cutoff:
        raise ValueError("복구 가능 기간(30일)이 지났습니다.")
    user.deleted_at    = None
    user.deleted_by    = None
    user.delete_reason = None
    db.flush()
    return user


def purge_expired_deleted_users(db: Session) -> int:
    """30일 초과 소프트 삭제 직원 하드 삭제 (스케줄러에서 주기적으로 호출)"""
    cutoff = now_kst() - timedelta(days=SOFT_DELETE_RETENTION_DAYS)
    stmt = select(User).where(User.deleted_at != None).where(User.deleted_at < cutoff)  # noqa: E711
    expired = db.execute(stmt).scalars().all()
    count = len(expired)
    for user in expired:
        db.delete(user)
    db.flush()
    return count


# ── 가입 승인 관리 ────────────────────────────────────────────────────────
def list_pending_users(
    db: Session, limit: int, offset: int
) -> Tuple[int, List[User]]:
    stmt = select(User).where(User.status == StatusEnum.pending).where(User.deleted_at == None)  # noqa: E711
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = db.execute(count_stmt).scalar_one()
    items = (
        db.execute(stmt.order_by(User.id.desc()).limit(limit).offset(offset))
        .scalars()
        .all()
    )
    return total, items


def approve_user(db: Session, user_id: int, admin_id: int) -> User:
    user = db.get(User, user_id)
    if not user:
        raise LookupError("사용자를 찾을 수 없습니다.")
    if user.status != StatusEnum.pending:
        raise ValueError("승인 대기 중인 사용자가 아닙니다.")
    user.status      = StatusEnum.approved
    user.approved_by = admin_id
    user.approved_at = now_kst()
    db.flush()
    return user


def reject_user(db: Session, user_id: int, admin_id: int, reason: Optional[str] = None) -> User:
    user = db.get(User, user_id)
    if not user:
        raise LookupError("사용자를 찾을 수 없습니다.")
    if user.status != StatusEnum.pending:
        raise ValueError("승인 대기 중인 사용자가 아닙니다.")
    user.status           = StatusEnum.rejected
    user.approved_by      = admin_id
    user.approved_at      = now_kst()
    user.rejection_reason = reason
    db.flush()
    return user


def suspend_user(db: Session, user_id: int, admin_id: int, reason: Optional[str] = None) -> User:
    user = db.get(User, user_id)
    if not user:
        raise LookupError("사용자를 찾을 수 없습니다.")
    if user.status == StatusEnum.suspended:
        raise ValueError("이미 정지된 계정입니다.")
    if user.status != StatusEnum.approved:
        raise ValueError("활성 계정만 정지할 수 있습니다.")
    user.status        = StatusEnum.suspended
    user.suspended_by  = admin_id
    user.suspended_at  = now_kst()
    user.suspend_reason = reason
    db.flush()
    return user


def unsuspend_user(db: Session, user_id: int, admin_id: int) -> User:
    user = db.get(User, user_id)
    if not user:
        raise LookupError("사용자를 찾을 수 없습니다.")
    if user.status != StatusEnum.suspended:
        raise ValueError("정지된 계정이 아닙니다.")
    user.status         = StatusEnum.approved
    user.suspended_by   = None
    user.suspended_at   = None
    user.suspend_reason = None
    db.flush()
    return user


# ── 유니폼 지급 현황 ──────────────────────────────────────────
# (item_key, category, variant, {col: val, ...})
_STOCK_CONFIGS: List[tuple] = [
    # 모자
    ("hat_헌팅캡", "모자", "헌팅캡", {"hat": "헌팅캡"}),
    ("hat_페도라",  "모자", "페도라",  {"hat": "페도라"}),
    # 벨트
    ("belt_남", "멜빵", "남", {"belt": "남"}),
    ("belt_여", "멜빵", "여", {"belt": "여"}),
    # 긴팔 데님 – 남 (95~115)
    ("top_데님_남_95",  "긴팔", "데님 남 95",  {"top_style": "데님", "top_size": "95"}),
    ("top_데님_남_100", "긴팔", "데님 남 100", {"top_style": "데님", "top_size": "100"}),
    ("top_데님_남_105", "긴팔", "데님 남 105", {"top_style": "데님", "top_size": "105"}),
    ("top_데님_남_110", "긴팔", "데님 남 110", {"top_style": "데님", "top_size": "110"}),
    ("top_데님_남_115", "긴팔", "데님 남 115", {"top_style": "데님", "top_size": "115"}),
    # 긴팔 데님 – 여 (44~77)
    ("top_데님_여_44", "긴팔", "데님 여 44", {"top_style": "데님", "top_size": "44"}),
    ("top_데님_여_55", "긴팔", "데님 여 55", {"top_style": "데님", "top_size": "55"}),
    ("top_데님_여_66", "긴팔", "데님 여 66", {"top_style": "데님", "top_size": "66"}),
    ("top_데님_여_77", "긴팔", "데님 여 77", {"top_style": "데님", "top_size": "77"}),
    # 긴팔 체크 – 남 (95~115)
    ("top_체크_남_95",  "긴팔", "체크 남 95",  {"top_style": "체크", "top_size": "95"}),
    ("top_체크_남_100", "긴팔", "체크 남 100", {"top_style": "체크", "top_size": "100"}),
    ("top_체크_남_105", "긴팔", "체크 남 105", {"top_style": "체크", "top_size": "105"}),
    ("top_체크_남_110", "긴팔", "체크 남 110", {"top_style": "체크", "top_size": "110"}),
    ("top_체크_남_115", "긴팔", "체크 남 115", {"top_style": "체크", "top_size": "115"}),
    # 긴팔 체크 – 여 (44~77)
    ("top_체크_여_44", "긴팔", "체크 여 44", {"top_style": "체크", "top_size": "44"}),
    ("top_체크_여_55", "긴팔", "체크 여 55", {"top_style": "체크", "top_size": "55"}),
    ("top_체크_여_66", "긴팔", "체크 여 66", {"top_style": "체크", "top_size": "66"}),
    ("top_체크_여_77", "긴팔", "체크 여 77", {"top_style": "체크", "top_size": "77"}),
    # 반팔 데님 – 남 (95~115)
    ("short_데님_남_95",  "반팔", "데님 남 95",  {"short_sleeve_style": "데님", "short_sleeve_size": "95"}),
    ("short_데님_남_100", "반팔", "데님 남 100", {"short_sleeve_style": "데님", "short_sleeve_size": "100"}),
    ("short_데님_남_105", "반팔", "데님 남 105", {"short_sleeve_style": "데님", "short_sleeve_size": "105"}),
    ("short_데님_남_110", "반팔", "데님 남 110", {"short_sleeve_style": "데님", "short_sleeve_size": "110"}),
    ("short_데님_남_115", "반팔", "데님 남 115", {"short_sleeve_style": "데님", "short_sleeve_size": "115"}),
    # 반팔 데님 – 여 (44~77)
    ("short_데님_여_44", "반팔", "데님 여 44", {"short_sleeve_style": "데님", "short_sleeve_size": "44"}),
    ("short_데님_여_55", "반팔", "데님 여 55", {"short_sleeve_style": "데님", "short_sleeve_size": "55"}),
    ("short_데님_여_66", "반팔", "데님 여 66", {"short_sleeve_style": "데님", "short_sleeve_size": "66"}),
    ("short_데님_여_77", "반팔", "데님 여 77", {"short_sleeve_style": "데님", "short_sleeve_size": "77"}),
    # 반팔 체크 – 남 (95~115)
    ("short_체크_남_95",  "반팔", "체크 남 95",  {"short_sleeve_style": "체크", "short_sleeve_size": "95"}),
    ("short_체크_남_100", "반팔", "체크 남 100", {"short_sleeve_style": "체크", "short_sleeve_size": "100"}),
    ("short_체크_남_105", "반팔", "체크 남 105", {"short_sleeve_style": "체크", "short_sleeve_size": "105"}),
    ("short_체크_남_110", "반팔", "체크 남 110", {"short_sleeve_style": "체크", "short_sleeve_size": "110"}),
    ("short_체크_남_115", "반팔", "체크 남 115", {"short_sleeve_style": "체크", "short_sleeve_size": "115"}),
    # 반팔 체크 – 여 (44~77)
    ("short_체크_여_44", "반팔", "체크 여 44", {"short_sleeve_style": "체크", "short_sleeve_size": "44"}),
    ("short_체크_여_55", "반팔", "체크 여 55", {"short_sleeve_style": "체크", "short_sleeve_size": "55"}),
    ("short_체크_여_66", "반팔", "체크 여 66", {"short_sleeve_style": "체크", "short_sleeve_size": "66"}),
    ("short_체크_여_77", "반팔", "체크 여 77", {"short_sleeve_style": "체크", "short_sleeve_size": "77"}),
    # 하의 – 남 (29~36)
    ("bottom_남_29", "하의", "남 29", {"bottom_style": "남", "bottom_size": "29"}),
    ("bottom_남_30", "하의", "남 30", {"bottom_style": "남", "bottom_size": "30"}),
    ("bottom_남_32", "하의", "남 32", {"bottom_style": "남", "bottom_size": "32"}),
    ("bottom_남_34", "하의", "남 34", {"bottom_style": "남", "bottom_size": "34"}),
    ("bottom_남_36", "하의", "남 36", {"bottom_style": "남", "bottom_size": "36"}),
    # 하의 – 여 (44~77)
    ("bottom_여_44", "하의", "여 44", {"bottom_style": "여", "bottom_size": "44"}),
    ("bottom_여_55", "하의", "여 55", {"bottom_style": "여", "bottom_size": "55"}),
    ("bottom_여_66", "하의", "여 66", {"bottom_style": "여", "bottom_size": "66"}),
    ("bottom_여_77", "하의", "여 77", {"bottom_style": "여", "bottom_size": "77"}),
    # 넥타이
    ("necktie_남", "넥타이", "남", {"necktie": "남"}),
    ("necktie_여", "넥타이", "여", {"necktie": "여"}),
]


def list_uniforms(db: Session) -> List[dict]:
    # 퇴사자 포함 — 크루·리더 전체 (status 무관, is_active 무관, 소프트 삭제 제외)
    stmt = (
        select(User)
        .where(User.position.in_([PositionEnum.crew, PositionEnum.leader]))
        .where(User.is_active == True)  # noqa: E712
        .where(User.deleted_at == None)  # noqa: E711
        .order_by(User.position, func.isnull(User.hire_date), User.hire_date)
    )
    users = db.execute(stmt).scalars().all()
    result = []
    for user in users:
        uni = db.query(UserUniform).filter_by(user_id=user.id).first()
        result.append({
            "user_id":             user.id,
            "name":                user.name,
            "position":            user.position.value,
            "gender":              user.gender.value if user.gender else None,
            "is_active":           user.is_active,
            "hat":                 uni.hat                if uni else None,
            "belt":                uni.belt               if uni else None,
            "top_style":           uni.top_style          if uni else None,
            "top_size":            uni.top_size           if uni else None,
            "short_sleeve_style":  uni.short_sleeve_style if uni else None,
            "short_sleeve_size":   uni.short_sleeve_size  if uni else None,
            "bottom_style":        uni.bottom_style       if uni else None,
            "bottom_size":         uni.bottom_size        if uni else None,
            "necktie":             uni.necktie            if uni else None,
        })
    return result


def _count_issued(db: Session, filters: dict) -> int:
    q = db.query(func.count(UserUniform.id))
    for col, val in filters.items():
        q = q.filter(getattr(UserUniform, col) == val)
    return q.scalar() or 0


def list_stock(db: Session) -> List[dict]:
    result = []
    for item_key, category, variant, filters in _STOCK_CONFIGS:
        stock = db.query(UniformStock).filter_by(item_key=item_key).first()
        qty = stock.quantity if stock else 0
        issued = _count_issued(db, filters)
        result.append({
            "item_key":  item_key,
            "category":  category,
            "variant":   variant,
            "quantity":  qty,
            "issued":    issued,
            "remaining": qty - issued,
        })
    return result


def update_stock(db: Session, item_key: str, quantity: int) -> dict:
    config = next((c for c in _STOCK_CONFIGS if c[0] == item_key), None)
    if not config:
        raise LookupError("존재하지 않는 항목입니다.")
    _, category, variant, filters = config

    stock = db.query(UniformStock).filter_by(item_key=item_key).first()
    if stock:
        stock.quantity = quantity
    else:
        stock = UniformStock(item_key=item_key, quantity=quantity)
        db.add(stock)
    db.flush()

    issued = _count_issued(db, filters)
    return {
        "item_key":  item_key,
        "category":  category,
        "variant":   variant,
        "quantity":  quantity,
        "issued":    issued,
        "remaining": quantity - issued,
    }


def upsert_uniform(db: Session, user_id: int, data: schemas.UniformUpdate) -> dict:
    user = db.get(User, user_id)
    if not user:
        raise LookupError("사용자를 찾을 수 없습니다.")
    uni = db.query(UserUniform).filter_by(user_id=user_id).first()
    payload = data.model_dump()
    if uni:
        for k, v in payload.items():
            setattr(uni, k, v)
        uni.updated_at = now_kst()
    else:
        uni = UserUniform(user_id=user_id, updated_at=now_kst(), **payload)
        db.add(uni)
    db.flush()
    return {
        "user_id":            user.id,
        "name":               user.name,
        "position":           user.position.value,
        "gender":             user.gender.value if user.gender else None,
        "is_active":          user.is_active,
        "hat":                uni.hat,
        "belt":               uni.belt,
        "top_style":          uni.top_style,
        "top_size":           uni.top_size,
        "short_sleeve_style": uni.short_sleeve_style,
        "short_sleeve_size":  uni.short_sleeve_size,
        "bottom_style":       uni.bottom_style,
        "bottom_size":        uni.bottom_size,
        "necktie":            uni.necktie,
    }


# ── 공휴일 ────────────────────────────────────────────────────────────────
def create_holiday(db: Session, data: schemas.HolidayCreate) -> Holiday:
    h = Holiday(label=data.label, date=data.date)
    db.add(h)
    db.flush()
    return h


def list_holidays(
    db: Session, start: Optional[date], end: Optional[date]
) -> List[Holiday]:
    stmt = select(Holiday)
    if start:
        stmt = stmt.where(Holiday.date >= start)
    if end:
        stmt = stmt.where(Holiday.date <= end)
    return db.execute(stmt.order_by(Holiday.date.desc())).scalars().all()


def update_holiday(db: Session, holiday_id: int, data: schemas.HolidayUpdate) -> Holiday:
    h = db.get(Holiday, holiday_id)
    if not h:
        raise LookupError("해당 공휴일이 존재하지 않습니다.")
    payload = data.model_dump(exclude_unset=True)
    if not payload:
        raise ValueError("변경할 값이 없습니다.")
    for k, v in payload.items():
        setattr(h, k, v)
    db.flush()
    return h


def delete_holiday(db: Session, holiday_id: int) -> None:
    h = db.get(Holiday, holiday_id)
    if not h:
        raise LookupError("해당 공휴일이 존재하지 않습니다.")
    db.delete(h)


# ── 4대보험 요율 ──────────────────────────────────────────────────────────
def get_insurance_rates(db: Session) -> list[InsuranceRate]:
    stmt = select(InsuranceRate).order_by(InsuranceRate.year.desc())
    return db.execute(stmt).scalars().all()


def get_insurance_rate_by_year(db: Session, year: int) -> InsuranceRate | None:
    stmt = select(InsuranceRate).where(InsuranceRate.year == year)
    return db.execute(stmt).scalars().first()


def create_insurance_rate(db: Session, payload: InsuranceRateCreate) -> InsuranceRate:
    rate = InsuranceRate(
        year=payload.year,
        national_pension_rate=payload.national_pension_rate,
        health_insurance_rate=payload.health_insurance_rate,
        long_term_care_rate=payload.long_term_care_rate,
        employment_insurance_rate=payload.employment_insurance_rate,
    )
    db.add(rate)
    db.commit()
    db.refresh(rate)
    return rate


def update_insurance_rate_full(
    db: Session, rate: InsuranceRate, payload: InsuranceRateCreate
) -> InsuranceRate:
    rate.national_pension_rate    = payload.national_pension_rate
    rate.health_insurance_rate    = payload.health_insurance_rate
    rate.long_term_care_rate      = payload.long_term_care_rate
    rate.employment_insurance_rate = payload.employment_insurance_rate
    db.commit()
    db.refresh(rate)
    return rate


def update_insurance_rate_partial(
    db: Session, rate: InsuranceRate, payload: InsuranceRateUpdate
) -> InsuranceRate:
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(rate, field, value)
    db.commit()
    db.refresh(rate)
    return rate


def delete_insurance_rate(db: Session, rate: InsuranceRate) -> None:
    db.delete(rate)
    db.commit()


# ── 휴무 한도 설정 ────────────────────────────────────────────────────────
def get_dayoff_setting(db: Session) -> DayoffSetting:
    setting = db.get(DayoffSetting, 1)
    if not setting:
        setting = DayoffSetting(id=1, monthly_limit=2, default_annual_leave_hours=5.50)
        db.add(setting)
        db.commit()
        db.refresh(setting)
    return setting


VALID_ANNUAL_LEAVE_PAY_METHODS = {"scheduled", "daily_avg", "daily_avg_min_scheduled"}


def update_dayoff_setting(
    db: Session,
    monthly_limit: int,
    default_annual_leave_hours: Optional[float] = None,
    annual_leave_pay_method: Optional[str] = None,
) -> DayoffSetting:
    setting = get_dayoff_setting(db)
    setting.monthly_limit = monthly_limit
    if default_annual_leave_hours is not None:
        setting.default_annual_leave_hours = default_annual_leave_hours
    if annual_leave_pay_method is not None and annual_leave_pay_method in VALID_ANNUAL_LEAVE_PAY_METHODS:
        setting.annual_leave_pay_method = annual_leave_pay_method
    db.commit()
    db.refresh(setting)
    return setting
