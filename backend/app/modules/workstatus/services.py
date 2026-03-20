"""
근태 서비스 — 이벤트 기반 근무시간 계산
---------------------------------------
- CLOCK_IN / BREAK_START / BREAK_END / CLOCK_OUT 이벤트로 근무 추적
- 야간(22:00~06:00), 공휴일, 근로자의날(5/1) 분류
- 퇴근 시 Payroll 월 누적 + 주휴수당 재계산
"""

from __future__ import annotations

from datetime import date, datetime, timedelta
from decimal import ROUND_HALF_UP, Decimal
from typing import Dict, List, Optional

from sqlalchemy.orm import Session

from app.modules.admin.models import Holiday
from app.modules.payroll.models import Payroll
from app.modules.wage.models import DefaultWage, UserWage
from app.modules.workstatus.models import AttendanceEvent, EventType

# 근로자의 날 (5월 1일)
LABOR_DAY_MONTH = 5
LABOR_DAY_DAY = 1


# ─────────────────────────────────────────────────────────
# AttendanceService
# ─────────────────────────────────────────────────────────
class AttendanceService:

    @staticmethod
    def get_events_for_date(
        db: Session,
        user_id: int,
        work_date: date,
    ) -> Dict[EventType, AttendanceEvent]:
        """특정 날짜의 모든 이벤트를 {EventType: AttendanceEvent} 딕셔너리로 반환"""
        events = (
            db.query(AttendanceEvent)
            .filter_by(user_id=user_id, work_date=work_date)
            .all()
        )
        return {e.event_type: e for e in events}

    @staticmethod
    def get_today_summary(
        db: Session,
        user_id: int,
        today: date,
    ) -> Optional[Dict]:
        """오늘 근태 상태 요약 반환. 이벤트 없으면 None."""
        events = AttendanceService.get_events_for_date(db, user_id, today)
        if not events:
            return None

        clock_in = events.get(EventType.CLOCK_IN)
        break_start = events.get(EventType.BREAK_START)
        break_end = events.get(EventType.BREAK_END)
        clock_out = events.get(EventType.CLOCK_OUT)

        return {
            "work_date": today,
            "check_in": clock_in.event_time if clock_in else None,
            "break_start": break_start.event_time if break_start else None,
            "break_end": break_end.event_time if break_end else None,
            "check_out": clock_out.event_time if clock_out else None,
        }

    @staticmethod
    def calc_work_minutes(
        events: Dict[EventType, AttendanceEvent],
        work_date: date,
    ) -> tuple[int, int, int]:
        """
        이벤트에서 근무시간 계산
        Returns: (day_minutes, night_minutes, break_minutes)
        - 야간: 22:00 ~ 익일 06:00
        - 휴게시간은 주간에서 차감
        """
        clock_in_ev = events.get(EventType.CLOCK_IN)
        clock_out_ev = events.get(EventType.CLOCK_OUT)

        if not clock_in_ev or not clock_out_ev:
            return 0, 0, 0

        check_in = datetime.combine(work_date, clock_in_ev.event_time)
        check_out = datetime.combine(work_date, clock_out_ev.event_time)

        if check_out < check_in:
            check_out += timedelta(days=1)

        # 휴게 시간 계산
        break_minutes = 0
        break_start_ev = events.get(EventType.BREAK_START)
        break_end_ev = events.get(EventType.BREAK_END)

        if break_start_ev and break_end_ev:
            b_start = datetime.combine(work_date, break_start_ev.event_time)
            b_end = datetime.combine(work_date, break_end_ev.event_time)
            if b_end < b_start:
                b_end += timedelta(days=1)
            break_minutes = int((b_end - b_start).total_seconds() / 60)

        # 야간 구간 (22:00 ~ 익일 06:00)
        night_start = datetime.combine(
            work_date,
            datetime.strptime("22:00", "%H:%M").time(),
        )
        night_end = datetime.combine(
            work_date + timedelta(days=1),
            datetime.strptime("06:00", "%H:%M").time(),
        )

        day_minutes = 0
        night_minutes = 0
        current = check_in

        while current < check_out:
            if night_start <= current < night_end:
                night_minutes += 1
            else:
                day_minutes += 1
            current += timedelta(minutes=1)

        # 휴게시간은 주간에서 차감 (정책)
        day_minutes = max(day_minutes - break_minutes, 0)

        return day_minutes, night_minutes, break_minutes

    @staticmethod
    def minutes_to_hours(minutes: int) -> Decimal:
        return (Decimal(minutes) / Decimal(60)).quantize(
            Decimal("0.01"),
            rounding=ROUND_HALF_UP,
        )

    # ─────────────────────────────────────────────
    # Payroll 조회 or 생성
    # ─────────────────────────────────────────────
    @staticmethod
    def get_or_create_payroll(
        db: Session,
        user_id: int,
        work_date: date,
    ) -> Payroll:
        from app.modules.auth.models import User

        payroll = (
            db.query(Payroll)
            .filter_by(
                user_id=user_id,
                year=work_date.year,
                month=work_date.month,
            )
            .first()
        )

        if payroll:
            return payroll

        wage = AttendanceService._get_effective_wage(db, user_id, work_date)

        user = db.get(User, user_id)
        annual_leave_hours = Decimal(str(user.annual_leave_hours)) if user else Decimal("0.0")

        payroll = Payroll(
            user_id=user_id,
            year=work_date.year,
            month=work_date.month,
            wage=wage,
            annual_leave_hours=annual_leave_hours,
        )
        db.add(payroll)
        db.flush()
        return payroll

    @staticmethod
    def _get_effective_wage(db: Session, user_id: int, work_date: date) -> int:
        """
        시급 결정 우선순위:
        1. UserWage (날짜 범위 기반 개별 시급)
        2. User.wage (개인 직접 설정 시급, > 0 인 경우)
        3. DefaultWage (해당 연도 최저시급)
        """
        from app.modules.auth.models import User

        user_wage = (
            db.query(UserWage)
            .filter(
                UserWage.user_id == user_id,
                UserWage.start_date <= work_date,
                (UserWage.end_date.is_(None) | (UserWage.end_date >= work_date)),
            )
            .order_by(UserWage.start_date.desc())
            .first()
        )
        if user_wage:
            return user_wage.wage

        user = db.get(User, user_id)
        if user and user.wage > 0:
            return user.wage

        default_wage = db.query(DefaultWage).filter_by(year=work_date.year).first()
        return default_wage.wage if default_wage else 0

    # ─────────────────────────────────────────────
    # 퇴근 처리 + Payroll 누적
    # ─────────────────────────────────────────────
    @staticmethod
    def handle_check_out(
        db: Session,
        user_id: int,
        work_date: date,
    ) -> None:
        """
        퇴근 이벤트 후 호출.
        - 이벤트에서 근무시간 계산
        - 공휴일/근로자의날 분류
        - Payroll 월 누적
        - 주휴수당 재계산
        """
        events = AttendanceService.get_events_for_date(db, user_id, work_date)
        day_minutes, night_minutes, _ = AttendanceService.calc_work_minutes(
            events, work_date
        )
        total_work_minutes = day_minutes + night_minutes

        payroll = AttendanceService.get_or_create_payroll(db, user_id, work_date)

        # 근로자의날 (5/1)
        is_labor_day = (
            work_date.month == LABOR_DAY_MONTH
            and work_date.day == LABOR_DAY_DAY
        )
        # 공휴일 (근로자의날 제외)
        is_holiday_day = (not is_labor_day) and _is_holiday(db, work_date)

        if is_labor_day:
            payroll.labor_day_hours += AttendanceService.minutes_to_hours(
                total_work_minutes
            )
        elif is_holiday_day:
            payroll.day_hours += AttendanceService.minutes_to_hours(day_minutes)
            payroll.night_hours += AttendanceService.minutes_to_hours(night_minutes)
            payroll.holiday_hours += AttendanceService.minutes_to_hours(
                total_work_minutes
            )
        else:
            payroll.day_hours += AttendanceService.minutes_to_hours(day_minutes)
            payroll.night_hours += AttendanceService.minutes_to_hours(night_minutes)

        payroll.last_work_day = work_date

        # 주휴수당 재계산
        AttendanceService._recalculate_weekly_allowance(db, user_id, work_date, payroll)

        db.flush()

    # ─────────────────────────────────────────────
    # 주휴수당 재계산 (한국 노동법)
    # ─────────────────────────────────────────────
    @staticmethod
    def _recalculate_weekly_allowance(
        db: Session,
        user_id: int,
        work_date: date,
        payroll: Payroll,
    ) -> None:
        """
        주휴수당 계산 기준 (근로기준법 제55조):
        - 1주 소정근로시간 15시간 이상 → 유급주휴 부여
        - 주휴시간 = min(주근무시간 / 40 × 8, 8.00)
        - 월 단위 합산 (각 ISO주 별로 계산 후 합계)
        """
        month_start = date(payroll.year, payroll.month, 1)
        if payroll.month == 12:
            month_end = date(payroll.year + 1, 1, 1)
        else:
            month_end = date(payroll.year, payroll.month + 1, 1)

        # 해당 월 CLOCK_OUT 이벤트가 있는 날짜 목록
        checkout_dates = (
            db.query(AttendanceEvent.work_date)
            .filter(
                AttendanceEvent.user_id == user_id,
                AttendanceEvent.event_type == EventType.CLOCK_OUT,
                AttendanceEvent.work_date >= month_start,
                AttendanceEvent.work_date < month_end,
            )
            .all()
        )

        if not checkout_dates:
            return

        # ISO주별 그룹핑
        weeks: Dict[tuple, List[date]] = {}
        for (d,) in checkout_dates:
            iso_y, iso_w, _ = d.isocalendar()
            weeks.setdefault((iso_y, iso_w), []).append(d)

        total_monthly_allowance = Decimal("0.00")

        for (iso_y, iso_w), dates in weeks.items():
            week_start = min(dates)
            week_end = week_start + timedelta(days=6)

            # 주 종료일이 현재 Payroll 월이 아니면 건너뜀
            if week_end.month != payroll.month:
                continue

            # 해당 주 총 근무시간 계산
            total_week_minutes = 0
            for d in dates:
                day_events = AttendanceService.get_events_for_date(db, user_id, d)
                dm, nm, _ = AttendanceService.calc_work_minutes(day_events, d)
                total_week_minutes += dm + nm

            total_week_hours = (
                Decimal(total_week_minutes) / Decimal(60)
            ).quantize(Decimal("0.01"))

            # 주 15시간 미만이면 주휴 미발생
            if total_week_hours < Decimal("15.00"):
                continue

            # 주휴시간 = min(주근무시간 / 40 × 8, 8.00)
            weekly_allowance = min(
                (total_week_hours / Decimal(40) * Decimal(8)).quantize(
                    Decimal("0.01"), rounding=ROUND_HALF_UP
                ),
                Decimal("8.00"),
            )
            total_monthly_allowance += weekly_allowance

        # 덮어쓰기 (누적 아님 — 매번 전체 재계산)
        payroll.weekly_allowance_hours = total_monthly_allowance

    # ─────────────────────────────────────────────
    # Payroll 월 전체 재계산 (bulk-import 용)
    # ─────────────────────────────────────────────
    @staticmethod
    def recalculate_payroll_for_month(
        db: Session,
        user_id: int,
        year: int,
        month: int,
    ) -> Payroll:
        """
        특정 사용자+월의 Payroll을 해당 월 전체 CLOCK_OUT 이벤트 기반으로 재계산.
        bulk-import 재실행 시 이중 계산을 방지하기 위해 모든 시간 필드를 0으로
        초기화한 뒤 다시 누적한다.
        """
        work_date = date(year, month, 1)
        payroll = AttendanceService.get_or_create_payroll(db, user_id, work_date)

        # 모든 시간 필드 초기화
        payroll.day_hours = Decimal("0.0")
        payroll.night_hours = Decimal("0.0")
        payroll.holiday_hours = Decimal("0.0")
        payroll.labor_day_hours = Decimal("0.0")
        payroll.weekly_allowance_hours = Decimal("0.0")

        # 해당 월의 모든 CLOCK_OUT 이벤트 날짜 조회
        month_start = date(year, month, 1)
        month_end = (
            date(year + 1, 1, 1) if month == 12 else date(year, month + 1, 1)
        )

        checkout_events = (
            db.query(AttendanceEvent)
            .filter(
                AttendanceEvent.user_id == user_id,
                AttendanceEvent.event_type == EventType.CLOCK_OUT,
                AttendanceEvent.work_date >= month_start,
                AttendanceEvent.work_date < month_end,
            )
            .all()
        )

        # 각 CLOCK_OUT 날짜에 대해 근무시간 계산 후 누적
        last_work_day = None
        for ev in checkout_events:
            work_date_ev = ev.work_date
            events = AttendanceService.get_events_for_date(db, user_id, work_date_ev)
            day_minutes, night_minutes, _ = AttendanceService.calc_work_minutes(
                events, work_date_ev
            )
            total_work_minutes = day_minutes + night_minutes

            is_labor_day = (
                work_date_ev.month == LABOR_DAY_MONTH
                and work_date_ev.day == LABOR_DAY_DAY
            )
            is_holiday_day = (not is_labor_day) and _is_holiday(db, work_date_ev)

            if is_labor_day:
                payroll.labor_day_hours += AttendanceService.minutes_to_hours(
                    total_work_minutes
                )
            elif is_holiday_day:
                payroll.day_hours += AttendanceService.minutes_to_hours(day_minutes)
                payroll.night_hours += AttendanceService.minutes_to_hours(night_minutes)
                payroll.holiday_hours += AttendanceService.minutes_to_hours(
                    total_work_minutes
                )
            else:
                payroll.day_hours += AttendanceService.minutes_to_hours(day_minutes)
                payroll.night_hours += AttendanceService.minutes_to_hours(night_minutes)

            if last_work_day is None or work_date_ev > last_work_day:
                last_work_day = work_date_ev

        if last_work_day:
            payroll.last_work_day = last_work_day

        # 주휴수당 재계산 (마지막 근무일 기준으로 해당 월 전체 재산출)
        if last_work_day:
            AttendanceService._recalculate_weekly_allowance(
                db, user_id, last_work_day, payroll
            )

        db.flush()
        return payroll

    # ─────────────────────────────────────────────
    # 관리자용: 월별 근태 조회
    # ─────────────────────────────────────────────
    @staticmethod
    def get_monthly_attendance(
        db: Session,
        year: int,
        month: int,
        user_id: Optional[int] = None,
        ignore_position_filter: bool = False,
    ) -> List[Dict]:
        """
        특정 월의 모든 직원 근태 이벤트를
        날짜별 요약 형태로 반환
        """
        from app.modules.auth.models import User, PositionEnum

        month_start = date(year, month, 1)
        month_end = date(year, month + 1, 1) if month < 12 else date(year + 1, 1, 1)

        query = (
            db.query(AttendanceEvent)
            .join(User)
            .filter(
                AttendanceEvent.work_date >= month_start,
                AttendanceEvent.work_date < month_end,
            )
        )
        if not ignore_position_filter:
            query = query.filter(
                User.position.in_([
                    PositionEnum.crew,
                    PositionEnum.leader,
                    PositionEnum.cleaner,
                ])
            )
        if user_id:
            query = query.filter(AttendanceEvent.user_id == user_id)

        events = query.order_by(
            AttendanceEvent.user_id,
            AttendanceEvent.work_date,
        ).all()

        # user_id + work_date 별로 그룹핑
        grouped: Dict[tuple, Dict[EventType, AttendanceEvent]] = {}
        for ev in events:
            key = (ev.user_id, ev.work_date)
            grouped.setdefault(key, {})[ev.event_type] = ev

        result = []
        for (uid, work_date), evs in sorted(grouped.items()):
            clock_in = evs.get(EventType.CLOCK_IN)
            break_start = evs.get(EventType.BREAK_START)
            break_end = evs.get(EventType.BREAK_END)
            clock_out = evs.get(EventType.CLOCK_OUT)

            day_min, night_min, break_min = AttendanceService.calc_work_minutes(
                evs, work_date
            )
            total_min = day_min + night_min

            user = db.get(User, uid)
            result.append({
                "user_id": uid,
                "user_name": user.name if user else None,
                "position": user.position.value if user else None,
                "work_date": work_date,
                "check_in": clock_in.event_time if clock_in else None,
                "break_start": break_start.event_time if break_start else None,
                "break_end": break_end.event_time if break_end else None,
                "check_out": clock_out.event_time if clock_out else None,
                "total_work_hours": float(
                    AttendanceService.minutes_to_hours(total_min)
                ),
                "day_hours": float(AttendanceService.minutes_to_hours(day_min)),
                "night_hours": float(AttendanceService.minutes_to_hours(night_min)),
            })

        return result


# ─────────────────────────────────────────────────────────
# 유틸
# ─────────────────────────────────────────────────────────
def _is_holiday(db: Session, target_date: date) -> bool:
    return (
        db.query(Holiday.id).filter(Holiday.date == target_date).first() is not None
    )
