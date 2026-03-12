import { PostListPage } from '@/features/community/ui/PostListPage';

export default function FreeboardPage() {
  return <PostListPage category="자유게시판" canWrite={true} fixedCategory="자유게시판" />;
}
