import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Calendar, Clock, TrendingUp } from 'lucide-react';
import { Link } from 'react-router';

import type { PostDTO } from '@/entities/post/api/dto';
import type { ReactNode } from 'react';

import { payQueries } from '@/entities/pay/api/queries';
import { normalizePayOverview } from '@/entities/pay/model/payOverview';
import { postQueries } from '@/entities/post/api/queries';
import { useUserQuery } from '@/entities/user/api/queries';
import { ScheduleList, UserCalendar } from '@/features/home';
import { getISOWeek, useScheduleWeekQuery } from '@/features/schedule';
import { ROUTES } from '@/shared/constants/routes';
import { formatDate } from '@/shared/lib/date';

// ── 유틸 ──────────────────────────────────────────────────────────────────
const today = new Date();
const todayLabel = today.toLocaleDateString('ko-KR', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  weekday: 'long',
});

// ── 서브 컴포넌트 ─────────────────────────────────────────────────────────

/** 통계 카드 */
function StatCard({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500">{label}</span>
        <span
          className={`flex items-center justify-center w-8 h-8 rounded-xl ${accent ?? 'bg-gray-50'}`}
        >
          {icon}
        </span>
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

/** 섹션 헤더 */
function SectionHeader({ title, to }: { title: string; to?: string }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-sm font-semibold text-gray-700">{title}</h2>
      {to && (
        <Link
          to={to}
          className="flex items-center gap-1 text-xs text-mega-secondary hover:text-mega transition-colors font-medium"
        >
          더보기
          <ArrowRight className="size-3" />
        </Link>
      )}
    </div>
  );
}

/** 커뮤니티 포스트 아이템 */
function PostItem({ post }: { post: PostDTO }) {
  const CATEGORY_COLORS: Record<string, string> = {
    공지: 'bg-red-50 text-red-600',
    근무교대: 'bg-green-50 text-green-600',
    휴무신청: 'bg-sky-50 text-sky-600',
    자유게시판: 'bg-purple-50 text-purple-600',
  };
  const color = CATEGORY_COLORS[post.category] ?? 'bg-gray-50 text-gray-600';

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
      <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-md ${color}`}>
        {post.category}
      </span>
      <span className="flex-1 text-sm text-gray-700 truncate">{post.title}</span>
      <span className="shrink-0 text-xs text-gray-400">{formatDate(post.created_at)}</span>
    </div>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────

const HomePage = () => {
  const { data: user } = useUserQuery();

  // 급여 데이터
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const { data: payData = normalizePayOverview() } = useQuery({
    ...payQueries.payOverview(year, month),
    select: normalizePayOverview,
  });

  // 스케줄 데이터
  const { year: isoYear, week } = getISOWeek(today);
  const { data: allSchedules = [], isLoading: scheduleLoading } = useScheduleWeekQuery(
    isoYear,
    week,
  );
  const mySchedules = allSchedules
    .filter((s) => s.user_id === user?.id)
    .sort((a, b) => a.work_date.localeCompare(b.work_date));

  // 커뮤니티 데이터
  const { data: posts = { items: [] } } = useQuery(postQueries.allPosts());
  const recentPosts = posts.items.slice(0, 5);

  const greeting = () => {
    const h = today.getHours();
    if (h < 6) return '야간 근무 수고하세요';
    if (h < 12) return '좋은 아침이에요';
    if (h < 18) return '좋은 오후예요';
    return '수고하셨어요';
  };

  return (
    <div className="flex flex-col gap-6">
      {/* ── 환영 배너 ──────────────────────────────────────────── */}
      <div className="rounded-2xl overflow-hidden bg-gradient-to-br from-nav-bg via-mega to-mega-secondary p-6 md:p-8 text-white relative">
        {/* 데코 서클 */}
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute -bottom-10 -right-4 w-28 h-28 rounded-full bg-white/5 pointer-events-none" />

        <div className="relative z-10">
          <p className="text-white/60 text-sm mb-1">{todayLabel}</p>
          <h1 className="text-2xl md:text-3xl font-bold">
            {greeting()}, <span className="text-purple-200">{user?.name ?? ''}님</span>
          </h1>
          <p className="text-white/50 text-sm mt-2">
            {mySchedules.length > 0
              ? `이번 주 ${mySchedules.length}건의 스케줄이 있습니다.`
              : '이번 주 등록된 스케줄이 없습니다.'}
          </p>
        </div>
      </div>

      {/* ── 통계 카드 그리드 ───────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          icon={<TrendingUp className="size-4 text-mega-secondary" />}
          label="이번달 실수령액"
          value={`${payData.net_pay.toLocaleString()}원`}
          sub={`지급예정 · ${year}-${month}-10`}
          accent="bg-mega-secondary/10"
        />
        <StatCard
          icon={<Calendar className="size-4 text-blue-500" />}
          label="이번달 근무일"
          value={`${payData.total_work_days}일`}
          sub={`총 ${payData.total_work_hours}시간`}
          accent="bg-blue-50"
        />
        <div className="col-span-2 lg:col-span-1">
          <StatCard
            icon={<Clock className="size-4 text-orange-500" />}
            label="이번주 스케줄"
            value={`${mySchedules.length}건`}
            sub={mySchedules.length > 0 ? `${mySchedules[0].work_date} ~` : '등록된 일정 없음'}
            accent="bg-orange-50"
          />
        </div>
      </div>

      {/* ── 메인 콘텐츠 그리드 ────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* 캘린더 + 스케줄 */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <SectionHeader title="이번달 캘린더" />
          <UserCalendar />
          <div className="mt-4 border-t border-gray-50 pt-4">
            <SectionHeader title="이번주 스케줄" to={ROUTES.SCHEDULE} />
            <ScheduleList schedules={mySchedules} isLoading={scheduleLoading} />
          </div>
        </div>

        {/* 급여 + 커뮤니티 */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          {/* 급여 카드 */}
          <div
            className="rounded-2xl p-5 text-white"
            style={{ background: 'linear-gradient(135deg, var(--color-nav-bg) 0%, var(--color-mega) 60%, var(--color-mega-secondary) 100%)' }}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-white/70">
                {year}년 {month}월 급여
              </span>
              <Link
                to={ROUTES.PAY}
                className="flex items-center gap-1 text-xs text-white/60 hover:text-white transition-colors"
              >
                상세보기 <ArrowRight className="size-3" />
              </Link>
            </div>
            <p className="text-3xl font-bold mb-1">
              {payData.net_pay.toLocaleString()}
              <span className="text-lg font-normal ml-1 text-white/70">원</span>
            </p>
            <p className="text-xs text-white/50 mb-5">
              지급예정일: {year}-{month}-10
            </p>

            <div className="h-px bg-white/10 mb-4" />
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-white/50 text-xs mb-1">총 급여</p>
                <p className="font-semibold">{payData.gross_pay.toLocaleString()}원</p>
              </div>
              <div>
                <p className="text-white/50 text-xs mb-1">공제 합계</p>
                <p className="font-semibold text-red-300">
                  {payData.total_deduction.toLocaleString()}원
                </p>
              </div>
            </div>
          </div>

          {/* 커뮤니티 카드 */}
          <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <SectionHeader title="최근 게시물" to={ROUTES.COMMUNITY} />
            {recentPosts.length > 0 ? (
              <div className="flex flex-col">
                {recentPosts.map((post) => (
                  <PostItem key={post.id} post={post} />
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center py-8 text-sm text-gray-400">
                작성된 게시물이 없습니다.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
