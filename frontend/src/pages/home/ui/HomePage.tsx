import { useQueries, useQuery } from '@tanstack/react-query';
import { ArrowRight, Calendar, Clock, TrendingUp } from 'lucide-react';
import React from 'react';
import { Link } from 'react-router';

import type { PostDTO } from '@/entities/post/api/dto';
import type { HomeScheduleItem } from '@/features/home/ui/ScheduleListItem';
import type { WeekScheduleResponse } from '@/features/schedule';
import type { ReactNode } from 'react';

import { payQueries } from '@/entities/pay/api/queries';
import { normalizePayOverview } from '@/entities/pay/model/payOverview';
import { postQueries } from '@/entities/post/api/queries';
import { useUserQuery } from '@/entities/user/api/queries';
import { ScheduleList, UserCalendar } from '@/features/home';
import { getISOWeek, useWeekScheduleQuery } from '@/features/schedule';
import { getWeekSchedule } from '@/features/schedule/api/service';
import { QUERY_KEYS } from '@/shared/api/queryKeys';
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

/**
 * 특정 년/월에 속하는 ISO 주차 목록을 반환한다.
 * 예) 2026-03 → [{year:2026, week:9}, {year:2026, week:10}, ...]
 */
function getWeeksInMonth(year: number, month: number): Array<{ year: number; week: number }> {
  const seen = new Set<string>();
  const result: Array<{ year: number; week: number }> = [];
  const daysInMonth = new Date(year, month, 0).getDate();

  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month - 1, day);
    const { year: isoYear, week } = getISOWeek(d);
    const key = `${isoYear}-${week}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push({ year: isoYear, week });
    }
  }
  return result;
}

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
    <div className="flex h-full min-w-0 flex-col gap-3 rounded-2xl border border-gray-200/70 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] font-medium text-gray-500">{label}</span>
        <span
          className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${accent ?? 'bg-gray-50'}`}
        >
          {icon}
        </span>
      </div>
      <div className="min-w-0">
        <p className="whitespace-nowrap text-xl font-bold leading-tight tracking-tight text-gray-900 tabular-nums sm:text-2xl">
          {value}
        </p>
        {sub && <p className="mt-1 text-xs text-gray-400">{sub}</p>}
      </div>
    </div>
  );
}

/** 섹션 헤더 */
function SectionHeader({ title, to }: { title: string; to?: string }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <h2 className="text-[15px] font-bold tracking-tight text-gray-900">{title}</h2>
      {to && (
        <Link
          to={to}
          className="-mr-2 flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-mega-secondary transition-colors hover:bg-mega-soft hover:text-mega"
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
    <div className="flex min-w-0 items-center gap-3 border-b border-gray-100 py-3 last:border-0">
      <span className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-semibold ${color}`}>
        {post.category}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-800">{post.title}</span>
      <span className="shrink-0 text-xs text-gray-400 tabular-nums">{formatDate(post.created_at)}</span>
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

  // 이번 주 스케줄 (ScheduleList용)
  const { year: isoYear, week } = getISOWeek(today);
  const { data: weekData, isLoading: scheduleLoading } = useWeekScheduleQuery(isoYear, week);
  const allSchedules = weekData?.schedules ?? [];
  const mySchedules: HomeScheduleItem[] = allSchedules
    .filter((s) => s.user_id === user?.id)
    .sort((a, b) => a.work_date.localeCompare(b.work_date))
    .map((s) => ({
      id: s.id,
      position: s.user_position,
      work_date: s.work_date,
      start_time: s.start_time,
      end_time: s.end_time,
    }));

  // 이번 달 전체 스케줄 (UserCalendar용)
  const weeksInMonth = React.useMemo(() => getWeeksInMonth(year, month), [year, month]);

  const monthWeekResults = useQueries({
    queries: weeksInMonth.map(({ year: wYear, week: wWeek }) => ({
      queryKey: QUERY_KEYS.schedule.week(wYear, wWeek),
      queryFn: (): Promise<WeekScheduleResponse> => getWeekSchedule(wYear, wWeek),
      staleTime: 5 * 60 * 1000,
    })),
  });

  const isMonthLoading = monthWeekResults.some((r) => r.isLoading);

  // 내 월별 스케줄 Map: 'YYYY-MM-DD' → HomeScheduleItem[]
  const myMonthScheduleMap = React.useMemo<Map<string, HomeScheduleItem[]>>(() => {
    const map = new Map<string, HomeScheduleItem[]>();
    if (!user) return map;

    for (const result of monthWeekResults) {
      const schedules = result.data?.schedules ?? [];
      for (const s of schedules) {
        if (s.user_id !== user.id) continue;

        // work_date가 현재 월에 속하는지 확인
        const [sYear, sMonth] = s.work_date.split('-').map(Number);
        if (sYear !== year || sMonth !== month) continue;

        const existing = map.get(s.work_date) ?? [];
        existing.push({
          id: s.id,
          position: s.user_position,
          work_date: s.work_date,
          start_time: s.start_time,
          end_time: s.end_time,
        });
        map.set(s.work_date, existing);
      }
    }
    return map;
  }, [monthWeekResults, user, year, month]);

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
    <div className="flex flex-col gap-5 sm:gap-6">
      {/* ── 환영 배너 ──────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-nav-bg p-5 text-white sm:p-7 md:p-8">
        {/* 은은한 브랜드 광원 */}
        <div className="pointer-events-none absolute -top-24 -right-16 size-72 rounded-full bg-mega-secondary/40 blur-3xl" />

        <div className="relative z-10">
          <p className="mb-1.5 text-[13px] font-medium text-white/55 sm:text-sm">{todayLabel}</p>
          <h1 className="text-[22px] font-bold leading-snug sm:text-3xl">
            {greeting()}, <span className="text-purple-200">{user?.name ?? ''}님</span>
          </h1>
          <p className="mt-2 text-sm text-white/60">
            {mySchedules.length > 0
              ? `이번 주 ${mySchedules.length}건의 스케줄이 있습니다.`
              : '이번 주 등록된 스케줄이 없습니다.'}
          </p>
        </div>
      </div>

      {/* ── 통계 카드 그리드 ───────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 sm:gap-4 lg:grid-cols-3">
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
        <div className="min-[360px]:col-span-2 lg:col-span-1">
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
      <div className="grid grid-cols-1 gap-5 sm:gap-6 lg:grid-cols-5">
        {/* 캘린더 + 스케줄 */}
        <div className="min-w-0 rounded-2xl border border-gray-200/70 bg-white p-4 shadow-sm sm:p-5 lg:col-span-2">
          <SectionHeader title="이번달 캘린더" />
          <UserCalendar scheduleMap={myMonthScheduleMap} isLoading={isMonthLoading} />
          <div className="mt-4 border-t border-gray-100 pt-4">
            <SectionHeader title="이번주 스케줄" to={ROUTES.SCHEDULE} />
            <ScheduleList schedules={mySchedules} isLoading={scheduleLoading} />
          </div>
        </div>

        {/* 급여 + 커뮤니티 */}
        <div className="flex min-w-0 flex-col gap-5 sm:gap-6 lg:col-span-3">
          {/* 급여 카드 */}
          <div className="relative overflow-hidden rounded-2xl bg-mega p-5 text-white sm:p-6">
            <div className="pointer-events-none absolute -right-20 -bottom-24 size-64 rounded-full bg-mega-secondary/50 blur-3xl" />
            <div className="relative">
              <div className="mb-4 flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-white/75">
                  {year}년 {month}월 급여
                </span>
                <Link
                  to={ROUTES.PAY}
                  className="-mr-2 flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-white/65 transition-colors hover:bg-white/10 hover:text-white"
                >
                  상세보기 <ArrowRight className="size-3" />
                </Link>
              </div>
              <p className="mb-1 whitespace-nowrap text-[28px] font-bold leading-tight tracking-tight tabular-nums sm:text-3xl">
                {payData.net_pay.toLocaleString()}
                <span className="ml-1 text-lg font-medium text-white/70">원</span>
              </p>
              <p className="mb-5 text-xs text-white/55">
                지급예정일: {year}-{month}-10
              </p>

              <div className="mb-4 h-px bg-white/12" />
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="min-w-0">
                  <p className="mb-1 text-xs text-white/55">총 급여</p>
                  <p className="whitespace-nowrap font-semibold tabular-nums">
                    {payData.gross_pay.toLocaleString()}원
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="mb-1 text-xs text-white/55">공제 합계</p>
                  <p className="whitespace-nowrap font-semibold tabular-nums text-red-300">
                    {payData.total_deduction.toLocaleString()}원
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 커뮤니티 카드 */}
          <div className="flex-1 rounded-2xl border border-gray-200/70 bg-white p-4 shadow-sm sm:p-5">
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
