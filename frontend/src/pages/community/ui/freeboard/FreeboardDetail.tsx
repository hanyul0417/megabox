import { useParams } from 'react-router';

import { PostDetailPage } from '@/features/community/ui/PostDetailPage';

export default function FreeBoardDetail() {
  const { id } = useParams<{ id: string }>();
  const postId = Number(id);

  if (!id || isNaN(postId)) return <div>잘못된 접근입니다.</div>;

  return <PostDetailPage postId={postId} fixedCategory="자유게시판" />;
}
