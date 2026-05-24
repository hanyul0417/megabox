from datetime import datetime
from enum import Enum
from typing import Generic, List, Optional, TypeVar

from pydantic import BaseModel, Field

from app.modules.auth.models import PositionEnum
from app.modules.community.models import CategoryEnum


class AttachmentResponse(BaseModel):
    """첨부파일 응답"""
    id: int
    filename: str
    original_filename: str
    content_type: str
    file_size: int
    url: str            # /uploads/community/{post_id}/{filename}
    is_image: bool      # content_type이 image/* 이면 True
    created_at: datetime

    class Config:
        from_attributes = True

T = TypeVar("T")


class CategoryCountResponse(BaseModel):
    counts: dict[str, int]


class PostBase(BaseModel):
    title: str = Field(..., max_length=255, description="게시글 제목")
    content: str = Field(..., description="게시글 내용")


class CommentBase(BaseModel):
    content: str = Field(..., description="댓글 내용")


class PostCreate(PostBase):
    """
    게시글 작성
    notice: 관리자
    shift, dayoff: 자동생성(사용자x)
    free_board: 시스템 제외 모두
    """

    category: CategoryEnum = Field(..., description="게시글 카테고리")


class CommentCreate(CommentBase):
    """
    댓글 작성: 시스템 제외 모두
    @username 형식으로 유저 태그 가능
    """

    pass


class PostUpdate(BaseModel):
    """
    게시글 수정 (제목, 내용)
    """

    title: Optional[str] = Field(None, max_length=255, description="수정할 제목")
    content: Optional[str] = Field(None, description="수정할 내용")


class CommentUpdate(BaseModel):
    """
    댓글 수정
    """

    content: Optional[str] = Field(None, description="수정할 내용")


class MentionedUserInfo(BaseModel):
    id: int
    username: str
    name: str

    class Config:
        from_attributes = True


class CommentResponse(BaseModel):
    """
    댓글 응답
    """

    id: int
    post_id: int
    author_id: int
    author_name: str
    author_position: PositionEnum
    author_profile_image: Optional[str] = None

    content: str
    created_at: datetime
    updated_at: datetime

    like_count: int = Field(0, description="좋아요 개수")
    is_liked: bool = Field(False, description="내가 좋아요를 눌렀는지 여부")
    mentions: List[MentionedUserInfo] = Field(default_factory=list, description="태그된 유저 목록")
    comment_type: Optional[str] = Field("normal", description="normal/approved/rejected")

    class Config:
        from_attributes = True


class PostListResponse(BaseModel):
    """
    게시글 목록조회 응답
    """

    id: int
    category: CategoryEnum

    title: str
    content: str

    author_id: int
    author_name: str
    author_position: PositionEnum
    author_profile_image: Optional[str] = None

    created_at: datetime
    updated_at: datetime

    comments_count: int
    likes_count: int = 0
    liked_by_me: bool = False
    attachments: List[AttachmentResponse] = Field(default_factory=list)

    class Config:
        from_attributes = True


class PostResponse(BaseModel):
    """
    게시글 상세조회 응답
    """

    id: int
    category: CategoryEnum

    title: str
    content: str

    author_id: int
    author_name: str
    author_position: PositionEnum
    author_profile_image: Optional[str] = None

    system_generated: bool
    created_at: datetime
    updated_at: datetime

    comments_count: int
    likes_count: int = 0
    liked_by_me: bool = False
    attachments: List[AttachmentResponse] = Field(default_factory=list)

    class Config:
        from_attributes = True


class PaginationParams(BaseModel):
    """
    페이지네이션 유효성
    """

    page: int = Field(1, ge=1, description="요청한 페이지 번호(1부터 시작)")
    page_size: int = Field(5, ge=1, le=50, description="한 페이지에 보여줄 개수")


class PaginatedResponse(BaseModel, Generic[T]):
    """
    페이지네이션 응답
    """

    items: List[T] = Field(default_factory=list)
    total: int = Field(..., ge=0, description="전체 개수")
    page: int = Field(..., ge=1, description="요청한 페이지 번호(1부터 시작)")
    page_size: int = Field(..., ge=1, description="한 페이지에 보여줄 개수")
    total_pages: int = Field(..., ge=1, description="전체 페이지 수")
    previous: int | None = Field(None, description="이전 페이지 번호")
    next: int | None = Field(None, description="다음 페이지 번호")


class SearchScope(str, Enum):
    """
    검색 범위
    """

    all = "all"        # 전체
    title = "title"    # 제목 검색
    content = "content"  # 내용 검색
    author = "author"  # 작성자 검색


class OrderBy(str, Enum):
    """
    정렬 기준
    """

    latest = "latest"   # 최신순
    oldest = "oldest"   # 오래된 순
    popular = "popular"  # 인기순 (댓글 많은 순)


class UserSearchResult(BaseModel):
    """
    멘션 자동완성용 유저 검색 결과
    """

    id: int
    username: str
    name: str
    position: PositionEnum

    class Config:
        from_attributes = True
