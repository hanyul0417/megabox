import {
  ArrowLeftRight,
  Calendar,
  CalendarPlus,
  Check,
  User,
  Users,
} from 'lucide-react';
import { useState } from 'react';

import type { ScheduleResponse } from '@/features/schedule';
import type { ScheduleCreateDTO, ScheduleUpdateDTO } from '@/features/schedule/api/dto';

import { useUserQuery } from '@/entities/user/api/queries';
import { getPositionBadgeStyle } from '@/entities/user/model/position';
import { hasAdminAccess } from '@/entities/user/model/role';
import {
  DayoffModal,
  ScheduleCard,
  ScheduleFormModal,
  ShiftModal,
  StatusChangeModal,
  TimeOverlapPanel,
  WeekNavigator,
  WEEKDAY_KO,
  addWeeks,
  formatDate,
  getISOWeek,
  getWeekDates,
  useCreateDayOffMutation,
  useCreateScheduleMutation,
  useCreateScheduleWeekMutation,
  useCreateShiftRequestMutation,
  useDeleteScheduleMutation,
  useScheduleUsersQuery,
  useUpdateScheduleMutation,
  useUpdateWeekStatusMutation,
  useWeekOverlapQuery,
  useWeekScheduleQuery,
} from '@/features/schedule';
import { Button } from '@/shared/components/ui/button';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { cn } from '@/shared/lib/utils';

// ─── 타임라인 상수 ────────────────────────────────────────

const TIMELINE_START_HOUR = 6;
const TIMELINE_END_HOUR = 30; // 다음날 06:00 (야간 근무 표시용)
const TIMELINE_HOURS = TIMELINE_END_HOUR - TIMELINE_START_HOUR; // 24
const TIMELINE_HEIGHT = 960; // px (40px per hour)

function parseMinutes(t: string): number {
  const parts = t.split(':');
  return Number(parts[0]) * 60 + Number(parts[1] ?? 0);
}

function assignColumns(
  schedules: ScheduleResponse[],
): Array<{ schedule: ScheduleResponse; col: number; totalCols: number }> {
  if (schedules.length === 0) return [];
  const sorted = [...schedules].sort((a, b) => a.start_time.localeCompare(b.start_time));
  const colEnds: number[] = [];
  const assignments: Array<{ schedule: ScheduleResponse; col: number }> = [];

  for (const s of sorted) {
    const startMin = parseMinutes(s.start_time);
    let col = 0;
    while (col < colEnds.length && (colEnds[col] ?? 0) > startMin) {
      col++;
    }
    colEnds[col] = parseMinutes(s.end_time);
    assignments.push({ schedule: s, col });
  }

  const totalCols = colEnds.length > 0 ? colEnds.length : 1;
  return assignments.map((a) => ({ ...a, totalCols }));
}

// ─── 컴포넌트 ────────────────────────────────────────────

const SchedulePage = () => {
  const today = new Date();
  const [{ year, week }, setYearWeek] = useState(() => getISOWeek(today));
  const weekDates = getWeekDates(year, week);

  const [viewMode, setViewMode] = useState<'my' | 'all'>('all');

  // 모달 상태
  const [dayoffOpen, setDayoffOpen] = useState(false);
  const [shiftOpen, setShiftOpen] = useState(false);
  const [scheduleFormOpen, setScheduleFormOpen] = useState(false);
  const [statusChangeOpen, setStatusChangeOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ScheduleResponse | null>(null);

  // 쿼리
  const { data: user } = useUserQuery();
  const isAdmin = !!user && hasAdminAccess(user.position);

  const { data: weekData, isLoading } = useWeekScheduleQuery(year, week);
  const { data: overlapData, isLoading: isOverlapLoading } = useWeekOverlapQuery(year, week);
  const { data: employees = [] } = useScheduleUsersQuery();

  const scheduleWeek = weekData?.week ?? null;
  const allSchedules = weekData?.schedules ?? [];

  // 뮤테이션
  const { mutate: createSchedule, isPending: isCreating } = useCreateScheduleMutation();
  const { mutate: updateSchedule, isPending: isUpdating } = useUpdateScheduleMutation();
  const { mutateAsync: createScheduleWeekAsync } = useCreateScheduleWeekMutation();
  const { mutate: deleteSchedule } = useDeleteScheduleMutation();
  const { mutate: createDayOff, isPending: isDayOffPending } = useCreateDayOffMutation();
  const { mutate: createShiftRequest, isPending: isShiftPending } = useCreateShiftRequestMutation();
  const { mutate: updateWeekStatus, isPending: isStatusPending } = useUpdateWeekStatusMutation();

  // 뷰 필터링
  const displaySchedules =
    viewMode === 'my' ? allSchedules.filter((s) => s.user_id === user?.id) : allSchedules;

  // 날짜별 스케줄 맵
  const schedulesByDate = weekDates.reduce<Record<string, ScheduleResponse[]>>((acc, date) => {
    const key = formatDate(date);
    acc[key] = displaySchedules.filter((s) => s.work_date === key);
    return acc;
  }, {});

  // 내 스케줄 (현재 주차)
  const mySchedules = allSchedules.filter((s) => s.user_id === user?.id);

  const todayStr = formatDate(today);
  const isToday = (date: Date) => formatDate(date) === todayStr;

  // 주차 네비게이션
  const handlePrev = () => setYearWeek(addWeeks(year, week, -1));
  const handleNext = () => setYearWeek(addWeeks(year, week, 1));
  const handleToday = () => setYearWeek(getISOWeek(today));

  // 스케줄 편집
  const handleEditSchedule = (schedule: ScheduleResponse) => {
    setEditingSchedule(schedule);
    setScheduleFormOpen(true);
  };

  // 스케줄 생성/수정 제출
  // scheduleWeekId가 0이면 해당 주차 Week 레코드가 없는 것이므로 먼저 생성
  const handleScheduleFormSubmit = async (swId: number, data: ScheduleCreateDTO) => {
    let weekId = swId;
    if (weekId === 0) {
      try {
        const newWeek = await createScheduleWeekAsync({ year, week_number: week });
        weekId = newWeek.id;
      } catch {
        return;
      }
    }
    createSchedule({ scheduleWeekId: weekId, data }, { onSuccess: () => setScheduleFormOpen(false) });
  };

  const handleScheduleUpdate = (id: number, data: ScheduleUpdateDTO) => {
    updateSchedule(
      { id, data },
      {
        onSuccess: () => {
          setScheduleFormOpen(false);
          setEditingSchedule(null);
        },
      },
    );
  };

  // 상태 변경
  const handleStatusChange = () => {
    const nextStatus = scheduleWeek?.status === 'CONFIRMED' ? 'DRAFT' : 'CONFIRMED';
    updateWeekStatus(
      { year, week, data: { status: nextStatus } },
      { onSuccess: () => setStatusChangeOpen(false) },
    );
  };

  const scheduleWeekId = scheduleWeek?.id ?? 0;

  return (
    <div className="flex flex-col gap-4">
      {/* 페이지 헤더 */}
      <PageHeader
        icon={<Calendar className="size-5 text-mega" />}
        iconBg="bg-mega/10"
        title="스케줄"
        description={
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-gray-500">현재 권한:</span>
            <span
              className={cn(
                'px-2 py-0.5 rounded-full text-xs font-medium border',
                user?.position
                  ? getPositionBadgeStyle(user.position)
                  : 'bg-gray-100 text-gray-500 border-transparent',
              )}
            >
              {user?.position ?? '-'}
            </span>
            {isAdmin && (
              <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                <Check className="size-3.5" />
                편집 가능
              </span>
            )}
          </div>
        }
      >
        <div className="flex items-center gap-2 flex-wrap">
          {/* View mode toggle */}
          <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-0.5">
            <button
              type="button"
              onClick={() => setViewMode('my')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-150',
                viewMode === 'my'
                  ? 'bg-white shadow-sm text-mega-secondary'
                  : 'text-gray-500 hover:text-gray-700',
              )}
            >
              <User className="size-3.5" />내 스케줄
            </button>
            <button
              type="button"
              onClick={() => setViewMode('all')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-150',
                viewMode === 'all'
                  ? 'bg-white shadow-sm text-mega-secondary'
                  : 'text-gray-500 hover:text-gray-700',
              )}
            >
              <Users className="size-3.5" />
              전체
            </button>
          </div>

          {/* 크루 전용 버튼 */}
          {!isAdmin && (
            <>
              <Button
                size="sm"
                className="bg-sky-500 hover:bg-sky-600 text-white gap-1.5 rounded-xl shadow-sm h-9 text-xs"
                onClick={() => setShiftOpen(true)}
              >
                <ArrowLeftRight className="size-3.5" />
                근무교대
              </Button>
              <Button
                size="sm"
                className="bg-emerald-500 hover:bg-emerald-600 text-white gap-1.5 rounded-xl shadow-sm h-9 text-xs"
                onClick={() => setDayoffOpen(true)}
              >
                <Calendar className="size-3.5" />
                휴무신청
              </Button>
            </>
          )}

          {/* 관리자 전용 버튼 */}
          {isAdmin && (
            <Button
              size="sm"
              className="bg-mega-secondary hover:bg-mega gap-1.5 rounded-xl shadow-sm h-9 text-xs"
              onClick={() => {
                setEditingSchedule(null);
                setScheduleFormOpen(true);
              }}
            >
              <CalendarPlus className="size-3.5" />
              스케줄 생성
            </Button>
          )}
        </div>
      </PageHeader>

      {/* 주차 네비게이터 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3.5">
        <WeekNavigator
          year={year}
          week={week}
          weekDates={weekDates}
          scheduleWeek={scheduleWeek}
          isAdmin={isAdmin}
          onPrev={handlePrev}
          onNext={handleNext}
          onToday={handleToday}
          onStatusChange={() => setStatusChangeOpen(true)}
        />
      </div>

      {/* 타임라인 캘린더 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Day Header Row */}
        <div
          className="grid border-b border-gray-100 bg-gray-50/70"
          style={{ gridTemplateColumns: '52px repeat(7, 1fr)' }}
        >
          {/* Corner */}
          <div className="border-r border-gray-100 py-3 flex items-end justify-center pb-1">
            <span className="text-[9px] text-gray-300 font-medium">시간</span>
          </div>
          {/* Day headers */}
          {weekDates.map((date, idx) => {
            const isTodayDate = isToday(date);
            const isSat = idx === 5;
            const isSun = idx === 6;
            return (
              <div
                key={formatDate(date)}
                className={cn(
                  'flex flex-col items-center py-3 border-r border-gray-100 last:border-r-0',
                  isTodayDate && 'bg-mega-secondary/5',
                )}
              >
                <span
                  className={cn(
                    'text-[11px] font-semibold leading-none mb-2',
                    isTodayDate
                      ? 'text-mega-secondary'
                      : isSat
                        ? 'text-blue-500'
                        : isSun
                          ? 'text-red-500'
                          : 'text-gray-400',
                  )}
                >
                  {WEEKDAY_KO[idx]}
                </span>
                <div
                  className={cn(
                    'w-9 h-9 flex items-center justify-center rounded-full text-sm font-bold transition-all',
                    isTodayDate
                      ? 'bg-mega-secondary text-white shadow-lg shadow-mega-secondary/30'
                      : isSat
                        ? 'text-blue-600 hover:bg-blue-50'
                        : isSun
                          ? 'text-red-600 hover:bg-red-50'
                          : 'text-gray-700 hover:bg-gray-100',
                  )}
                >
                  {date.getDate()}
                </div>
              </div>
            );
          })}
        </div>

        {/* Timeline Body */}
        <div className="overflow-y-auto" style={{ maxHeight: '680px' }}>
          <div
            className="grid"
            style={{ gridTemplateColumns: '52px repeat(7, 1fr)', height: `${TIMELINE_HEIGHT}px` }}
          >
            {/* Time Axis */}
            <div
              className="relative border-r border-gray-100 bg-gray-50/30"
              style={{ height: `${TIMELINE_HEIGHT}px` }}
            >
              {Array.from({ length: TIMELINE_HOURS + 1 }, (_, i) => i + TIMELINE_START_HOUR).map(
                (hour) => (
                  <div
                    key={hour}
                    className="absolute left-0 right-0 flex items-center justify-end pr-2"
                    style={{
                      top: `${((hour - TIMELINE_START_HOUR) / TIMELINE_HOURS) * TIMELINE_HEIGHT}px`,
                      transform: 'translateY(-50%)',
                    }}
                  >
                    {hour < TIMELINE_END_HOUR && (
                      <span
                        className={cn(
                          'text-[9px] font-medium whitespace-nowrap',
                          hour >= 24
                            ? 'text-purple-400'
                            : hour % 2 === 0
                              ? 'text-gray-400'
                              : 'text-gray-300',
                        )}
                      >
                        {String(hour >= 24 ? hour - 24 : hour).padStart(2, '0')}
                        {hour >= 24 && <span className="text-[7px]">+1</span>}
                      </span>
                    )}
                  </div>
                ),
              )}
            </div>

            {/* Day Columns */}
            {weekDates.map((date, idx) => {
              const key = formatDate(date);
              const daySchedules = schedulesByDate[key] ?? [];
              const blocks = assignColumns(daySchedules);
              const isTodayDate = isToday(date);
              const isSat = idx === 5;
              const isSun = idx === 6;

              return (
                <div
                  key={key}
                  className={cn(
                    'relative border-r border-gray-100 last:border-r-0',
                    isTodayDate && 'bg-mega-secondary/[0.04]',
                    isSat && !isTodayDate && 'bg-blue-50/30',
                    isSun && !isTodayDate && 'bg-red-50/30',
                  )}
                  style={{ height: `${TIMELINE_HEIGHT}px` }}
                >
                  {/* Hour grid lines */}
                  {Array.from(
                    { length: TIMELINE_HOURS + 1 },
                    (_, i) => i + TIMELINE_START_HOUR,
                  ).map((hour) => (
                    <div
                      key={hour}
                      className={cn(
                        'absolute left-0 right-0 border-t pointer-events-none',
                        hour % 2 === 0 ? 'border-gray-100' : 'border-gray-50/70',
                      )}
                      style={{
                        top: `${((hour - TIMELINE_START_HOUR) / TIMELINE_HOURS) * TIMELINE_HEIGHT}px`,
                      }}
                    />
                  ))}

                  {/* Loading skeletons */}
                  {isLoading && (
                    <>
                      <div
                        className="absolute left-1 right-1 rounded-md bg-gray-200 animate-pulse"
                        style={{ top: '80px', height: '72px' }}
                      />
                      <div
                        className="absolute left-1 right-1 rounded-md bg-gray-100 animate-pulse"
                        style={{ top: '200px', height: '56px' }}
                      />
                    </>
                  )}

                  {/* Schedule blocks */}
                  {!isLoading &&
                    blocks.map(({ schedule, col, totalCols }) => (
                      <ScheduleCard
                        key={schedule.id}
                        schedule={schedule}
                        isAdmin={isAdmin}
                        onEdit={handleEditSchedule}
                        onDelete={(id) => deleteSchedule(id)}
                        col={col}
                        totalCols={totalCols}
                        containerHeight={TIMELINE_HEIGHT}
                      />
                    ))}

                  {/* Empty state */}
                  {!isLoading && daySchedules.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <span className="text-[10px] text-gray-200 font-medium">비어있음</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 시간대별 근무 밀도 히트맵 — 관리자 전용 */}
      {isAdmin && (
        <TimeOverlapPanel
          overlapData={overlapData}
          weekDates={weekDates}
          isLoading={isOverlapLoading}
        />
      )}

      {/* 모달들 */}
      <DayoffModal
        open={dayoffOpen}
        onClose={() => setDayoffOpen(false)}
        onSubmit={(data) => {
          createDayOff(data, { onSuccess: () => setDayoffOpen(false) });
        }}
        isPending={isDayOffPending}
      />

      <ShiftModal
        open={shiftOpen}
        onClose={() => setShiftOpen(false)}
        onSubmit={(data) => {
          createShiftRequest(data, { onSuccess: () => setShiftOpen(false) });
        }}
        mySchedules={mySchedules}
        allSchedules={allSchedules}
        employees={employees}
        isPending={isShiftPending}
      />

      {isAdmin && (
        <ScheduleFormModal
          open={scheduleFormOpen}
          onClose={() => {
            setScheduleFormOpen(false);
            setEditingSchedule(null);
          }}
          onSubmit={handleScheduleFormSubmit}
          onUpdate={handleScheduleUpdate}
          isPending={isCreating || isUpdating}
          employees={employees}
          scheduleWeekId={scheduleWeekId}
          initialData={editingSchedule ?? undefined}
        />
      )}

      {isAdmin && (
        <StatusChangeModal
          open={statusChangeOpen}
          onClose={() => setStatusChangeOpen(false)}
          onConfirm={handleStatusChange}
          isPending={isStatusPending}
          currentStatus={scheduleWeek?.status}
          year={year}
          week={week}
        />
      )}
    </div>
  );
};

export default SchedulePage;
