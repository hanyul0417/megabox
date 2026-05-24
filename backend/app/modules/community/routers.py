from datetime import date

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.modules.community import services
from app.modules.community.models import CategoryEnum
from app.modules.community.schemas import (
    AttachmentResponse,
    CategoryCountResponse,
    CommentCreate,
    CommentResponse,
    CommentUpdate,
    OrderBy,
    PaginatedResponse,
    PaginationParams,
    PostCreate,
    PostListResponse,
    PostResponse,
    PostUpdate,
    SearchScope,
    UserSearchResult,
)
from app.modules.community.services import (
    get_all_category_post_counts,
    get_category_post_counts,
)
from app.utils.permission_utils import is_system

router = APIRouter()


# 출근용 계정 차단
def get_community_user(user=Depends(get_current_user)):
    if is_system(user):
        raise HTTPException(403, "출근용 계정은 커뮤니티 기능을 사용할 수 없습니다.")
    return user


# 멘션 자동완성 유저 검색 API -----
@router.get(
    "/users/search",
    response_model=list[UserSearchResult],
    summary="멘션 자동완성용 유저 검색",
)
def search_users_for_mention(
    q: str = Query(..., min_length=1, description="검색어 (username 또는 name)"),
    limit: int = Query(10, ge=1, le=20, description="최대 결과 수"),
    db: Session = Depends(get_db),
    user=Depends(get_community_user),
):
    """
    @멘션 자동완성을 위한 유저 검색
    - username 또는 name으로 검색
    - system 계정 제외
    """
    return services.search_users(db=db, q=q, limit=limit)


# 카테고리별 게시글 수 API -----
@router.get(
    "/category-counts",
    response_model=CategoryCountResponse,
    status_code=200,
    summary="카테고리별 게시글 수",
)
def category_counts(
    db: Session = Depends(get_db),
    category: str | None = Query(
        None, description="카테고리 이름 (공지, 자유게시판, 휴무신청, 근무교대)"
    ),
    user=Depends(get_community_user),
) -> CategoryCountResponse:
    """
    전체 또는 카테고리별 게시글 수 조회
    """
    if category:
        try:
            cat_enum = CategoryEnum(category)
        except ValueError:
            return {"counts": {category: 0}}

        count = get_category_post_counts(db, cat_enum)
        return {"counts": {category: count}}

    counts = get_all_category_post_counts(db)
    return {"counts": counts}


# 게시글 API -----
@router.post(
    "/posts",
    response_model=PostResponse,
    status_code=status.HTTP_201_CREATED,
    summary="게시글 생성",
)
def create_post(
    data: PostCreate,
    db: Session = Depends(get_db),
    user=Depends(get_community_user),
):
    """
    게시글 생성
    - 자유게시판: 모두(출근용 제외)
    - 공지: 관리자
    - 교대(대타)/휴무: 자동생성(사용자x)
    """
    return services.create_post(db, user, data)


@router.get(
    "/posts",
    response_model=PaginatedResponse[PostListResponse],
    summary="게시글 목록 조회",
)
def list_posts(
    mine: bool = Query(False, description="내가 쓴 글만 보기"),
    category: CategoryEnum | None = Query(None, description="카테고리 필터"),
    exclude_system: bool = Query(False, description="휴무신청·근무교대 제외 여부"),
    search_scope: SearchScope = Query(SearchScope.all, description="검색 범위"),
    search: str | None = Query(None, description="검색어"),
    order: OrderBy = Query(OrderBy.latest, alias="order", description="정렬 기준"),
    from_date: date | None = Query(
        None, description="작성일이 해당 날짜 이후인 게시글 검색 (YYYY-MM-DD)"
    ),
    to_date: date | None = Query(
        None, description="작성일이 해당 날짜까지인 게시글 검색(YYYY-MM-DD)"
    ),
    db: Session = Depends(get_db),
    user=Depends(get_community_user),
    pagination: PaginationParams = Depends(),
):
    """
    게시글 목록 조회
    """
    author_id = user.id if mine else None

    return services.list_posts(
        db=db,
        user=user,
        author_id=author_id,
        category=category,
        page=pagination.page,
        page_size=pagination.page_size,
        search=search,
        search_scope=search_scope.value,
        order_by=order.value,
        from_date=from_date,
        to_date=to_date,
        exclude_system=exclude_system,
    )


@router.get("/posts/{post_id}", response_model=PostResponse, summary="게시글 상세 조회")
def get_post(
    post_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_community_user),
):
    return services.get_post(db, post_id, user)


@router.patch("/posts/{post_id}", response_model=PostResponse, summary="게시글 수정")
def update_post(
    post_id: int,
    data: PostUpdate,
    db: Session = Depends(get_db),
    user=Depends(get_community_user),
):
    return services.update_post(db, user, post_id, data)


@router.delete("/posts/{post_id}", summary="게시글 삭제")
def delete_post(
    post_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_community_user),
):
    return services.delete_post(db, user, post_id)


# 게시글 좋아요 API -----
@router.post("/posts/{post_id}/like", summary="게시글 좋아요")
def like_post(
    post_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_community_user),
):
    return services.like_post(db=db, user=user, post_id=post_id)


@router.delete("/posts/{post_id}/like", summary="게시글 좋아요 취소")
def unlike_post(
    post_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_community_user),
):
    return services.unlike_post(db=db, user=user, post_id=post_id)


# 댓글 API -----
@router.get(
    "/posts/{post_id}/comments",
    response_model=PaginatedResponse[CommentResponse],
    summary="댓글 목록 조회",
)
def list_comments(
    post_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_community_user),
    pagination: PaginationParams = Depends(),
):
    return services.list_comments(
        db=db,
        user=user,
        post_id=post_id,
        page=pagination.page,
        page_size=pagination.page_size,
    )


@router.post(
    "/posts/{post_id}/comments",
    response_model=CommentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="댓글 생성",
)
def create_comment(
    post_id: int,
    data: CommentCreate,
    db: Session = Depends(get_db),
    user=Depends(get_community_user),
):
    """
    댓글 작성
    - 출근용 제외 모두
    - @username 형식으로 유저 태그 가능
    """
    return services.create_comment(db, user, post_id, data)


@router.patch(
    "/comments/{comment_id}", response_model=CommentResponse, summary="댓글 수정"
)
def update_comment(
    comment_id: int,
    data: CommentUpdate,
    db: Session = Depends(get_db),
    user=Depends(get_community_user),
):
    return services.update_comment(db, user, comment_id, data)


@router.delete("/comments/{comment_id}", summary="댓글 삭제")
def delete_comment(
    comment_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_community_user),
):
    return services.delete_comment(db, user, comment_id)


@router.post("/comments/{comment_id}/like", summary="댓글 좋아요 토글")
def toggle_comment_like(
    comment_id: int, db: Session = Depends(get_db), user=Depends(get_community_user)
):
    return services.toggle_comment_like(db=db, user=user, comment_id=comment_id)


# 첨부파일 API -----
@router.post(
    "/posts/{post_id}/attachments",
    response_model=AttachmentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="게시글 첨부파일 업로드",
)
async def upload_attachment(
    post_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user=Depends(get_community_user),
):
    """
    게시글에 파일/이미지 첨부
    - 허용 형식: jpg, png, webp, gif, pdf, xlsx, docx
    - 최대 크기: 10MB
    - 게시글당 최대 5개
    """
    return await services.upload_attachment(db=db, user=user, post_id=post_id, file=file)


@router.delete(
    "/attachments/{attachment_id}",
    summary="첨부파일 삭제",
)
def delete_attachment(
    attachment_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_community_user),
):
    """첨부파일 삭제 (작성자 또는 관리자)"""
    return services.delete_attachment(db=db, user=user, attachment_id=attachment_id)


# 본문 인라인 이미지 업로드 API -----
@router.post(
    "/images",
    status_code=status.HTTP_201_CREATED,
    summary="본문 인라인 이미지 업로드",
)
async def upload_inline_image(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user=Depends(get_community_user),
):
    """
    본문에 인라인으로 삽입할 이미지 업로드
    - 허용 형식: jpg, png, webp, gif
    - 최대 크기: 10MB
    - post_id 없이 독립 업로드 (작성 중 붙여넣기용)
    """
    return await services.upload_inline_image(db=db, user=user, file=file)
