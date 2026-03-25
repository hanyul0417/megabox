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

        conn.commit()
