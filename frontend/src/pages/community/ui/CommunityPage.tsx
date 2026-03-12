import { useUserQuery } from '@/entities/user/api/queries';
import { PostListPage } from '@/features/community/ui/PostListPage';

export default function CommunityPage() {
  const { data: user } = useUserQuery();
  // 전체 게시판에서는 자유게시판만 작성 가능 (공지는 관리자만)
  const canWrite = !!user && !user.is_system;

  return <PostListPage canWrite={canWrite} />;
}
