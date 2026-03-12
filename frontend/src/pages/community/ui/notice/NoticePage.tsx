import { useUserQuery } from '@/entities/user/api/queries';
import { hasAdminAccess } from '@/entities/user/model/role';
import { PostListPage } from '@/features/community/ui/PostListPage';

export default function NoticePage() {
  const { data: user } = useUserQuery();
  const canWrite = !!user && hasAdminAccess(user.position);

  return <PostListPage category="공지" canWrite={canWrite} fixedCategory="공지" />;
}
