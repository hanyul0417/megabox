from sqlalchemy import inspect, text


def run_migrations(engine):
    """기존 테이블에 새 컬럼 추가 (멱등 실행 가능)"""
    inspector = inspect(engine)

    with engine.connect() as conn:
        # day_off_request.post_id
        cols = [c["name"] for c in inspector.get_columns("day_off_request")]
        if "post_id" not in cols:
            conn.execute(
                text("ALTER TABLE day_off_request ADD COLUMN post_id INT NULL")
            )

        # shift_request.post_id
        cols = [c["name"] for c in inspector.get_columns("shift_request")]
        if "post_id" not in cols:
            conn.execute(
                text("ALTER TABLE shift_request ADD COLUMN post_id INT NULL")
            )

        # community_comment.comment_type
        cols = [c["name"] for c in inspector.get_columns("community_comment")]
        if "comment_type" not in cols:
            conn.execute(
                text(
                    "ALTER TABLE community_comment "
                    "ADD COLUMN comment_type VARCHAR(20) NULL DEFAULT 'normal'"
                )
            )

        # payroll.annual_leave_pay (직접 입력 연차수당)
        cols = [c["name"] for c in inspector.get_columns("payroll")]
        if "annual_leave_pay" not in cols:
            conn.execute(
                text("ALTER TABLE payroll ADD COLUMN annual_leave_pay INT NULL DEFAULT NULL")
            )

        # payroll.weekly_allowance_pay (직접 입력 주휴수당)
        cols = [c["name"] for c in inspector.get_columns("payroll")]
        if "weekly_allowance_pay" not in cols:
            conn.execute(
                text("ALTER TABLE payroll ADD COLUMN weekly_allowance_pay INT NULL DEFAULT NULL")
            )

        # user.annual_leave_hours: DECIMAL(3,1) → DECIMAL(4,2)
        user_cols = {c["name"]: c for c in inspector.get_columns("user")}
        al_user_col = user_cols.get("annual_leave_hours")
        if al_user_col and hasattr(al_user_col["type"], "scale") and al_user_col["type"].scale < 2:
            conn.execute(text(
                "ALTER TABLE `user` MODIFY COLUMN annual_leave_hours DECIMAL(4, 2) NOT NULL DEFAULT 5.50 COMMENT '연차 시간'"
            ))

        # payroll.annual_leave_hours: DECIMAL(4,1) → DECIMAL(5,2)
        payroll_cols = {c["name"]: c for c in inspector.get_columns("payroll")}
        al_payroll_col = payroll_cols.get("annual_leave_hours")
        if al_payroll_col and hasattr(al_payroll_col["type"], "scale") and al_payroll_col["type"].scale < 2:
            conn.execute(text(
                "ALTER TABLE payroll MODIFY COLUMN annual_leave_hours DECIMAL(5, 2) NOT NULL DEFAULT 0.00"
            ))

        conn.commit()
