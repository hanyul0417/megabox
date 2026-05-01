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

        # payroll.annual_leave_count (미사용 연차 개수, 기본 1)
        cols = [c["name"] for c in inspector.get_columns("payroll")]
        if "annual_leave_count" not in cols:
            conn.execute(
                text("ALTER TABLE payroll ADD COLUMN annual_leave_count INT NOT NULL DEFAULT 1")
            )

        # users.annual_leave_hours: DECIMAL(3,1) → DECIMAL(4,2)
        user_cols = {c["name"]: c for c in inspector.get_columns("users")}
        al_user_col = user_cols.get("annual_leave_hours")
        if al_user_col and hasattr(al_user_col["type"], "scale") and al_user_col["type"].scale < 2:
            conn.execute(text(
                "ALTER TABLE users MODIFY COLUMN annual_leave_hours DECIMAL(4, 2) NOT NULL DEFAULT 5.50 COMMENT '연차 시간'"
            ))

        # payroll.annual_leave_hours: DECIMAL(4,1) → DECIMAL(5,2)
        payroll_cols = {c["name"]: c for c in inspector.get_columns("payroll")}
        al_payroll_col = payroll_cols.get("annual_leave_hours")
        if al_payroll_col and hasattr(al_payroll_col["type"], "scale") and al_payroll_col["type"].scale < 2:
            conn.execute(text(
                "ALTER TABLE payroll MODIFY COLUMN annual_leave_hours DECIMAL(5, 2) NOT NULL DEFAULT 0.00"
            ))

        # users.weekend_dayoff_limit
        user_cols_now = [c["name"] for c in inspector.get_columns("users")]
        if "weekend_dayoff_limit" not in user_cols_now:
            conn.execute(
                text(
                    "ALTER TABLE users ADD COLUMN weekend_dayoff_limit SMALLINT NULL "
                    "COMMENT '주말/공휴일 월 한도 override (NULL=전역설정 사용)'"
                )
            )

        # dayoff_setting seed (id=1 single row)
        tables = inspector.get_table_names()
        if "dayoff_setting" in tables:
            result = conn.execute(text("SELECT COUNT(*) FROM dayoff_setting WHERE id = 1")).scalar()
            if result == 0:
                conn.execute(text("INSERT INTO dayoff_setting (id, monthly_limit) VALUES (1, 2)"))

        # notifications.link
        noti_cols = [c["name"] for c in inspector.get_columns("notifications")]
        if "link" not in noti_cols:
            conn.execute(
                text("ALTER TABLE notifications ADD COLUMN link VARCHAR(200) NULL COMMENT '클릭 시 이동할 프론트엔드 경로'")
            )

        # user_uniform.short_sleeve_style / short_sleeve_size
        uni_cols = [c["name"] for c in inspector.get_columns("user_uniform")]
        if "short_sleeve_style" not in uni_cols:
            conn.execute(
                text("ALTER TABLE user_uniform ADD COLUMN short_sleeve_style VARCHAR(20) NULL COMMENT '반팔 스타일 (체크/데님)'")
            )
        if "short_sleeve_size" not in uni_cols:
            conn.execute(
                text("ALTER TABLE user_uniform ADD COLUMN short_sleeve_size VARCHAR(20) NULL COMMENT '반팔 사이즈'")
            )

        conn.commit()
