import { CalendarDays, Pencil, Trash2 } from 'lucide-react';
import { useMemo } from 'react';

import type { HolidayDTO } from '../api/dto';

import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';

// ──────────────────────────────────────────────
// 유틸 함수
// ──────────────────────────────────────────────

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'] as const;

/**
 * "YYYY-MM-DD" → { month, day, dayOfWeek, isPast, isToday }
 */
const parseDateStr = (dateStr: string) => {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isPast = date < today;
  const isToday = date.getTime() === today.getTime();
  return {
    month,
    day,
    dayOfWeek: date.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6,
    isPast,
    isToday,
  };
};

/**
 * 날짜 pill 텍스트: "3.1 (일)"
 */
const formatDatePill = (dateStr: string): string => {
  const { month, day, dayOfWeek } = parseDateStr(dateStr);
  return `${month}.${day} (${DAY_LABELS[dayOfWeek]})`;
};

// ──────────────────────────────────────────────
// Skeleton 컴포넌트
// ──────────────────────────────────────────────

const HolidayItemSkeleton = () => (
  <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3 animate-pulse">
    <div className="size-8 rounded-lg bg-gray-100 shrink-0" />
    <div className="h-6 w-20 rounded-md bg-gray-100" />
    <div className="h-4 w-32 rounded-md bg-gray-100" />
    <div className="ml-auto flex gap-1">
      <div className="size-8 rounded-md bg-gray-100" />
      <div className="size-8 rounded-md bg-gray-100" />
    </div>
  </div>
);

const HolidayTableSkeleton = () => (
  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
    {[0, 1, 2].map((sectionIdx) => (
      <div key={sectionIdx} className="flex flex-col gap-2">
        <div className="mb-1 flex items-center gap-2">
          <div className="h-5 w-12 rounded-md bg-gray-100 animate-pulse" />
          <div className="h-5 w-8 rounded-full bg-gray-100 animate-pulse" />
        </div>
        <HolidayItemSkeleton />
        <HolidayItemSkeleton />
      </div>
    ))}
  </div>
);

// ──────────────────────────────────────────────
// 공휴일 아이템 카드
// ──────────────────────────────────────────────

type HolidayItemProps = {
  holiday: HolidayDTO;
  onEdit: (holiday: HolidayDTO) => void;
  onDelete: (id: number) => void;
  isDeleting: boolean;
};

const HolidayItem = ({ holiday, onEdit, onDelete, isDeleting }: HolidayItemProps) => {
  const { dayOfWeek, isPast, isToday } = parseDateStr(holiday.date);
  const pillText = formatDatePill(holiday.date);

  const isSunday = dayOfWeek === 0;
  const isSaturday = dayOfWeek === 6;

  const pillColorClass = isSunday
    ? 'bg-red-50 text-red-600'
    : isSaturday
      ? 'bg-blue-50 text-blue-600'
      : 'bg-gray-50 text-gray-600';

  const wrapperOpacity = isPast && !isToday ? 'opacity-55' : '';

  return (
    <div
      className={`flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3 transition-shadow hover:shadow-sm ${wrapperOpacity}`}
    >
      {/* 공휴일 아이콘 */}
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-red-50">
        <span className="text-base leading-none" role="img" aria-label="공휴일">
          🎌
        </span>
      </div>

      {/* 날짜 pill */}
      <span
        className={`shrink-0 rounded-lg px-2 py-1 font-mono text-sm font-medium ${pillColorClass}`}
      >
        {pillText}
      </span>

      {/* 공휴일 이름 */}
      <span className="truncate font-semibold text-gray-800">{holiday.label}</span>

      {/* 오늘 배지 */}
      {isToday && (
        <Badge className="shrink-0 bg-amber-500 text-white hover:bg-amber-500">오늘</Badge>
      )}

      {/* 액션 버튼 */}
      <div className="ml-auto flex shrink-0 gap-1">
        <Button
          size="icon-sm"
          variant="outline"
          onClick={() => onEdit(holiday)}
          aria-label="수정"
        >
          <Pencil className="size-3.5" />
        </Button>
        <Button
          size="icon-sm"
          variant="destructive"
          onClick={() => onDelete(holiday.id)}
          disabled={isDeleting}
          aria-label="삭제"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </div>
  );
};

// ──────────────────────────────────────────────
// 빈 상태
// ──────────────────────────────────────────────

const EmptyState = () => (
  <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
    <CalendarDays className="size-10 opacity-30" />
    <p className="text-sm">
      등록된 공휴일이 없습니다. 자동 불러오기를 사용해보세요.
    </p>
  </div>
);

// ──────────────────────────────────────────────
// HolidayTable (메인 export)
// ──────────────────────────────────────────────

const MONTH_LABELS = [
  '1월', '2월', '3월', '4월', '5월', '6월',
  '7월', '8월', '9월', '10월', '11월', '12월',
] as const;

type HolidayTableProps = {
  holidays: HolidayDTO[];
  onEdit: (holiday: HolidayDTO) => void;
  onDelete: (id: number) => void;
  isDeleting: boolean;
  isLoading?: boolean;
};

const HolidayTable = ({
  holidays,
  onEdit,
  onDelete,
  isDeleting,
  isLoading = false,
}: HolidayTableProps) => {
  // 월별 그룹핑
  const groupedByMonth = useMemo(() => {
    const map = new Map<number, HolidayDTO[]>();
    for (const holiday of holidays) {
      const month = Number(holiday.date.split('-')[1]);
      if (!map.has(month)) map.set(month, []);
      map.get(month)!.push(holiday);
    }
    // 월 오름차순, 같은 월 내에서 날짜 오름차순
    for (const [, items] of map) {
      items.sort((a, b) => a.date.localeCompare(b.date));
    }
    return map;
  }, [holidays]);

  if (isLoading) {
    return <HolidayTableSkeleton />;
  }

  if (holidays.length === 0) {
    return <EmptyState />;
  }

  // 공휴일이 존재하는 월만 정렬하여 추출
  const activeMonths = Array.from(groupedByMonth.keys()).sort((a, b) => a - b);

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      {activeMonths.map((month) => {
        const items = groupedByMonth.get(month)!;
        return (
          <section key={month} className="flex flex-col gap-2">
            {/* 섹션 헤더 */}
            <div className="mb-1 flex items-center gap-2">
              <h3 className="text-sm font-semibold text-gray-700">
                {MONTH_LABELS[month - 1]}
              </h3>
              <Badge variant="secondary" className="text-xs">
                {items.length}
              </Badge>
            </div>

            {/* 공휴일 아이템 목록 */}
            {items.map((holiday) => (
              <HolidayItem
                key={holiday.id}
                holiday={holiday}
                onEdit={onEdit}
                onDelete={onDelete}
                isDeleting={isDeleting}
              />
            ))}
          </section>
        );
      })}
    </div>
  );
};

export default HolidayTable;
