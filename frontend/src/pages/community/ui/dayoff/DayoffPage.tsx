import { PostListPage } from '@/features/community/ui/PostListPage';

export default function DayoffPage() {
  return <PostListPage category="휴무신청" canWrite={false} fixedCategory="휴무신청" />;
}
