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

        # dayoff_setting.default_annual_leave_hours
        ds_cols = [c["name"] for c in inspector.get_columns("dayoff_setting")]
        if "default_annual_leave_hours" not in ds_cols:
            conn.execute(
                text("ALTER TABLE dayoff_setting ADD COLUMN default_annual_leave_hours DECIMAL(4,2) NOT NULL DEFAULT 5.50 COMMENT '신규 가입자 기본 소정근로시간'")
            )

        # dayoff_setting.annual_leave_pay_method
        ds_cols2 = [c["name"] for c in inspector.get_columns("dayoff_setting")]
        if "annual_leave_pay_method" not in ds_cols2:
            conn.execute(
                text(
                    "ALTER TABLE dayoff_setting ADD COLUMN annual_leave_pay_method VARCHAR(30) NOT NULL DEFAULT 'scheduled' "
                    "COMMENT '연차수당 계산 방식: scheduled=소정근로시간, daily_avg=일평균, daily_avg_min_scheduled=일평균+소정최소'"
                )
            )

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

        # payroll.insurance_* : NOT NULL 0 → NULL (자동계산 sentinel 변경)
        # 기존 0 값을 NULL로 변환 후 컬럼을 nullable로 전환 (멱등)
        payroll_ins_cols = {c["name"]: c for c in inspector.get_columns("payroll")}
        for col_name, comment in [
            ("insurance_health",     "건강보험"),
            ("insurance_care",       "요양보험"),
            ("insurance_employment", "고용보험"),
            ("insurance_pension",    "국민연금"),
        ]:
            col_info = payroll_ins_cols.get(col_name)
            if col_info and not col_info.get("nullable", True):
                conn.execute(
                    text(
                        f"ALTER TABLE payroll MODIFY COLUMN {col_name} INT NULL DEFAULT NULL "
                        f"COMMENT '{comment}'"
                    )
                )
                conn.execute(
                    text(f"UPDATE payroll SET {col_name} = NULL WHERE {col_name} = 0")
                )

        # users.deleted_at / deleted_by / delete_reason (soft delete)
        user_cols_sd = [c["name"] for c in inspector.get_columns("users")]
        if "deleted_at" not in user_cols_sd:
            conn.execute(
                text("ALTER TABLE users ADD COLUMN deleted_at DATETIME NULL COMMENT '소프트 삭제 시각 (NULL=활성)'")
            )
        if "deleted_by" not in user_cols_sd:
            conn.execute(
                text("ALTER TABLE users ADD COLUMN deleted_by INT NULL COMMENT '삭제한 관리자 ID'")
            )
        if "delete_reason" not in user_cols_sd:
            conn.execute(
                text("ALTER TABLE users ADD COLUMN delete_reason VARCHAR(500) NULL COMMENT '삭제 사유'")
            )

        # checklist_items 테이블 생성
        tables = inspector.get_table_names()
        if "checklist_items" not in tables:
            conn.execute(text("""
                CREATE TABLE checklist_items (
                    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                    day_of_week SMALLINT NOT NULL COMMENT '요일 (0=월 ~ 6=일)',
                    content VARCHAR(100) NOT NULL COMMENT '항목 내용',
                    sort_order INT NOT NULL DEFAULT 0 COMMENT '표시 순서',
                    is_active BOOLEAN NOT NULL DEFAULT TRUE COMMENT '활성 여부',
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
            """))

        # checklist_checks 테이블 생성
        tables = inspector.get_table_names()
        if "checklist_checks" not in tables:
            conn.execute(text("""
                CREATE TABLE checklist_checks (
                    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                    item_id INT NOT NULL,
                    check_date DATE NOT NULL COMMENT '체크한 날짜',
                    checked_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    CONSTRAINT fk_checklist_checks_item FOREIGN KEY (item_id)
                        REFERENCES checklist_items(id) ON DELETE CASCADE,
                    CONSTRAINT uq_checklist_item_date UNIQUE (item_id, check_date)
                ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
            """))

        # users.employment_reported (입사신고 완료 여부)
        user_cols_er = [c["name"] for c in inspector.get_columns("users")]
        if "employment_reported" not in user_cols_er:
            conn.execute(
                text(
                    "ALTER TABLE users ADD COLUMN employment_reported BOOLEAN NOT NULL DEFAULT FALSE "
                    "COMMENT '입사신고 완료 여부'"
                )
            )

        # users.insure_hire_month (입사월 4대보험 전액 납부 여부)
        user_cols_ihm = [c["name"] for c in inspector.get_columns("users")]
        if "insure_hire_month" not in user_cols_ihm:
            conn.execute(
                text(
                    "ALTER TABLE users ADD COLUMN insure_hire_month BOOLEAN NOT NULL DEFAULT FALSE "
                    "COMMENT '입사월 4대보험 전액 납부 여부'"
                )
            )

        # kiosk_notices 테이블 생성 (없는 경우)
        tables = inspector.get_table_names()
        if "kiosk_notices" not in tables:
            conn.execute(text("""
                CREATE TABLE kiosk_notices (
                    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                    content VARCHAR(200) NOT NULL COMMENT '공지 내용 (한 줄)',
                    start_date DATE NOT NULL COMMENT '게시 시작일',
                    end_date DATE NOT NULL COMMENT '게시 종료일',
                    is_active BOOLEAN NOT NULL DEFAULT TRUE COMMENT '수동 활성 여부',
                    sort_order INT NOT NULL DEFAULT 0 COMMENT '표시 순서',
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성 시각'
                ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
            """))

        conn.commit()
