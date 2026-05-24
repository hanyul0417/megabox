from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from app.core.config import TimeStampedMixin
from app.core.database import Base


class CategoryEnum(str, PyEnum):
    notice = "공지"
    free_board = "자유게시판"
    dayoff = "휴무신청"
    shift = "근무교대"


class Post(TimeStampedMixin, Base):
    __tablename__ = "community_post"

    id = Column(Integer, primary_key=True, index=True)
    category = Column(
        Enum(CategoryEnum),
        nullable=False,
        comment="공지, 자유게시판, 휴무신청, 근무교대",
    )
    title = Column(String(255), nullable=False, comment="제목")
    content = Column(Text, nullable=False, comment="내용")
    author_id = Column(
        Integer, ForeignKey("users.id"), nullable=False, comment="작성자 id"
    )
    system_generated = Column(
        Boolean, nullable=False, default=False, comment="시스템 자동생성 여부"
    )

    author = relationship("User", back_populates="posts")
    comments = relationship(
        "Comment",
        back_populates="post",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    likes = relationship(
        "PostLike",
        back_populates="post",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    attachments = relationship(
        "PostAttachment",
        back_populates="post",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    def __repr__(self):
        short_title = (
            self.title[:20] + "..."
            if self.title and len(self.title) > 20
            else self.title
        )
        return (
            f"[CommunityPost] id={self.id}, category={self.category.value}, "
            f"title={short_title}, author_id={self.author_id}, "
        )


class PostAttachment(Base):
    """게시글 첨부파일"""
    __tablename__ = "community_post_attachment"

    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(
        Integer,
        ForeignKey("community_post.id", ondelete="CASCADE"),
        nullable=False,
        comment="게시글 id",
    )
    uploader_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        comment="업로더 id",
    )
    filename = Column(String(255), nullable=False, comment="서버 저장 파일명")
    original_filename = Column(String(255), nullable=False, comment="원본 파일명")
    content_type = Column(String(100), nullable=False, comment="MIME 타입")
    file_size = Column(BigInteger, nullable=False, default=0, comment="파일 크기(bytes)")
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    post = relationship("Post", back_populates="attachments")
    uploader = relationship("User", foreign_keys=[uploader_id])


class PostLike(Base):
    __tablename__ = "community_post_like"
    __table_args__ = (
        UniqueConstraint("user_id", "post_id", name="uq_post_like_user_post"),
    )

    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(
        Integer,
        ForeignKey("community_post.id", ondelete="CASCADE"),
        nullable=False,
        comment="대상 게시글 id",
    )
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        comment="유저 id",
    )

    post = relationship("Post", back_populates="likes")


class CommentLike(Base):
    __tablename__ = "community_comment_like"
    __table_args__ = (
        UniqueConstraint("user_id", "comment_id", name="uq_comment_like_user_comment"),
    )

    id = Column(Integer, primary_key=True, index=True)
    comment_id = Column(
        Integer,
        ForeignKey("community_comment.id", ondelete="CASCADE"),
        nullable=False,
        comment="대상 댓글 id",
    )
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        comment="유저 id",
    )

    comment = relationship("Comment", back_populates="likes")


class CommentMention(Base):
    """댓글에서 @username 태그된 유저 기록"""
    __tablename__ = "community_mention"

    id = Column(Integer, primary_key=True, index=True)
    comment_id = Column(
        Integer,
        ForeignKey("community_comment.id", ondelete="CASCADE"),
        nullable=False,
        comment="댓글 id",
    )
    mentioned_user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        comment="태그된 유저 id",
    )
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    comment = relationship("Comment", back_populates="mentions")
    mentioned_user = relationship("User", foreign_keys=[mentioned_user_id])


class Comment(TimeStampedMixin, Base):
    __tablename__ = "community_comment"

    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(
        Integer,
        ForeignKey("community_post.id", ondelete="CASCADE"),
        nullable=False,
        comment="대상 게시글 id",
    )
    author_id = Column(
        Integer, ForeignKey("users.id"), nullable=False, comment="작성자 id"
    )
    content = Column(Text, nullable=False, comment="내용")
    comment_type = Column(
        String(20),
        nullable=True,
        default="normal",
        server_default="normal",
        comment="normal/approved/rejected",
    )
    post = relationship("Post", back_populates="comments")
    author = relationship("User", back_populates="comments")
    likes = relationship(
        "CommentLike", back_populates="comment", cascade="all, delete-orphan"
    )
    mentions = relationship(
        "CommentMention",
        back_populates="comment",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    def __repr__(self):
        short_content = (
            self.content[:20] + "..."
            if self.content and len(self.content) > 20
            else self.content
        )
        return (
            f"[CommunityComment] id={self.id}, post_id={self.post_id}, "
            f"author_id={self.author_id}, content={short_content}"
        )
