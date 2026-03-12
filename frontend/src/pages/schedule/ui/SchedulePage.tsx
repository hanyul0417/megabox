import { ArrowLeftRight, Calendar, CalendarPlus, Check, User, Users } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import type { ScheduleResponse } from '@/features/schedule';
import type { ScheduleCreateDTO } from '@/features/schedule/api/dto';

import { useUserQuery } from '@/entities/user/api/queries';
import { getPositionBadgeStyle } from '@/entities/user/model/position';
import { hasAdminAccess } from '@/entities/user/model/role';
import {
  DayoffModal,
  ScheduleCard,
  ScheduleFormModal,
  ShiftModal,
  WeekNavigator,
  WEEKDAY_KO,
  addWeeks,
  formatDate,
  getISOWeek,
  getWeekDates,
  useCreateScheduleMutation,
  useDeleteScheduleMutation,
  useRequestDayOffMutation,
  useScheduleUsersQuery,
  useScheduleWeekQuery,
  useUpdateScheduleMutation,
} from '@/features/schedule';
import { Button } from '@/shared/components/ui/button';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { cn } from '@/shared/lib/utils';

const SchedulePage = () => {
  const today = new Date();
  const [{ year, week }, setYearWeek] = useState(() => getISOWeek(today));
  const weekDates = getWeekDates(year, week);

  const [viewMode, setViewMode] = useState<'my' | 'all'>('all');
  const [dayoffOpen, setDayoffOpen] = useState(false);
  const [shiftOpen, setShiftOpen] = useState(false);
  const [scheduleFormOpen, setScheduleFormOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ScheduleResponse | null>(null);

  const { data: user } = useUserQuery();
  const isAdmin = !!user && hasAdminAccess(user.position);

  const { data: allSchedules = [], isLoading } = useScheduleWeekQuery(year, week);
  const { data: employees = [] } = useScheduleUsersQuery();

  const schedules =
    viewMode === 'my' ? allSchedules.filter((s) => s.user_id === user?.id) : allSchedules;

  const { mutate: createSchedule, isPending: isCreating } = useCreateScheduleMutation();
  const { mutate: updateSchedule, isPending: isUpdating } = useUpdateScheduleMutation();
  const { mutate: deleteSchedule } = useDeleteScheduleMutation();
  const { mutate: requestDayOff, isPending: isDayOffPending } = useRequestDayOffMutation();

  const schedulesByDate = weekDates.reduce<Record<string, ScheduleResponse[]>>((acc, date) => {
    const key = formatDate(date);
    acc[key] = schedules.filter((s) => s.work_date === key);
    return acc;
  }, {});

  const todayStr = formatDate(today);
  const isToday = (date: Date) => formatDate(date) === todayStr;

  const handlePrev = () => setYearWeek(addWeeks(year, week, -1));
  const handleNext = () => setYearWeek(addWeeks(year, week, 1));
  const handleToday = () => setYearWeek(getISOWeek(today));

  const handleEditSchedule = (schedule: ScheduleResponse) => {
    setEditingSchedule(schedule);
    setScheduleFormOpen(true);
  };

  const handleScheduleFormSubmit = (data: ScheduleCreateDTO) => {
    if (editingSchedule) {
      const work_date = data.start_date.split('T')[0];
      const start_time = data.start_date.split('T')[1].slice(0, 5);
      const end_time = data.end_date.split('T')[1].slice(0, 5);
      updateSchedule(
        { id: editingSchedule.id, data: { work_date, start_time, end_time } },
        {
          onSuccess: () => {
            setScheduleFormOpen(false);
            setEditingSchedule(null);
          },
        },
      );
    } else {
      createSchedule(data, { onSuccess: () => setScheduleFormOpen(false) });
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* ── 페이지 헤더 ─────────────────────────────────────── */}
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
        {/* 액션 버튼 영역 */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* 개인/전체 토글 */}
          <div className="flex rounded-xl border border-gray-200 overflow-hidden shadow-sm bg-white">
            <button
              type="button"
              onClick={() => setViewMode('my')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors',
                viewMode === 'my' ? 'bg-mega-secondary text-white' : 'text-gray-600 hover:bg-gray-50',
              )}
            >
              <User className="size-4" />내 스케줄
            </button>
            <button
              type="button"
              onClick={() => setViewMode('all')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors border-l border-gray-200',
                viewMode === 'all' ? 'bg-mega-secondary text-white' : 'text-gray-600 hover:bg-gray-50',
              )}
            >
              <Users className="size-4" />
              전체
            </button>
          </div>

          {/* 크루 전용 */}
          {!isAdmin && (
            <>
              <Button
                size="sm"
                className="bg-sky-500 hover:bg-sky-600 text-white gap-1.5 rounded-xl shadow-sm"
                onClick={() => setShiftOpen(true)}
              >
                <ArrowLeftRight className="size-4" />
                근무교대
              </Button>
              <Button
                size="sm"
                className="bg-green-500 hover:bg-green-600 text-white gap-1.5 rounded-xl shadow-sm"
                onClick={() => setDayoffOpen(true)}
              >
                <Calendar className="size-4" />
                휴무신청
              </Button>
            </>
          )}

          {/* 어드민 전용 */}
          {isAdmin && (
            <Button
              size="sm"
              className="bg-mega-secondary hover:bg-mega gap-1.5 rounded-xl shadow-sm"
              onClick={() => {
                setEditingSchedule(null);
                setScheduleFormOpen(true);
              }}
            >
              <CalendarPlus className="size-4" />
              스케줄 생성
            </Button>
          )}
        </div>
      </PageHeader>

      {/* ── 주차 네비게이터 ──────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <WeekNavigator
          year={year}
          week={week}
          weekDates={weekDates}
          onPrev={handlePrev}
          onNext={handleNext}
          onToday={handleToday}
        />
      </div>

      {/* ── 주간 캘린더 그리드 ───────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 overflow-x-auto">
        <div className="grid grid-cols-7 gap-2 min-w-[560px]" style={{ minHeight: 520 }}>
          {weekDates.map((date, idx) => {
            const key = formatDate(date);
            const isCurrentDay = isToday(date);
            const daySchedules = schedulesByDate[key] ?? [];
            const isSat = idx === 5;
            const isSun = idx === 6;

            return (
              <div key={key} className="flex flex-col gap-1.5">
                {/* 요일 헤더 */}
                <div
                  className={cn(
                    'flex flex-col items-center py-2.5 px-1 rounded-xl mb-1',
                    isCurrentDay ? 'bg-mega-secondary text-white' : 'bg-gray-50 text-gray-500',
                  )}
                >
                  <span
                    className={cn(
                      'text-[11px] font-medium',
                      !isCurrentDay && isSat && 'text-blue-500',
                      !isCurrentDay && isSun && 'text-red-500',
                    )}
                  >
                    {WEEKDAY_KO[idx]}
                  </span>
                  <span
                    className={cn(
                      'text-lg font-bold leading-tight',
                      !isCurrentDay && isSat && 'text-blue-500',
                      !isCurrentDay && isSun && 'text-red-500',
                    )}
                  >
                    {date.getDate()}
                  </span>
                </div>

                {/* 스케줄 카드 */}
                <div className="flex flex-col gap-1.5 flex-1">
                  {isLoading ? (
                    Array.from({ length: 2 }).map((_, i) => (
                      <div key={i} className="bg-gray-100 rounded-xl h-[58px] animate-pulse" />
                    ))
                  ) : daySchedules.length > 0 ? (
                    daySchedules.map((schedule) => (
                      <ScheduleCard
                        key={schedule.id}
                        schedule={schedule}
                        isAdmin={isAdmin}
                        onEdit={handleEditSchedule}
                        onDelete={(id) => deleteSchedule(id)}
                      />
                    ))
                  ) : (
                    <div className="flex-1 flex items-center justify-center min-h-[80px] rounded-xl border-2 border-dashed border-gray-100">
                      <span className="text-[10px] text-gray-300">-</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 모달 ── */}
      <DayoffModal
        open={dayoffOpen}
        onClose={() => setDayoffOpen(false)}
        onSubmit={(data) => {
          requestDayOff(data, {
            onSuccess: () => {
              setDayoffOpen(false);
              toast.success('휴무 신청이 완료되었습니다.');
            },
          });
        }}
        isPending={isDayOffPending}
      />
      <ShiftModal
        open={shiftOpen}
        onClose={() => setShiftOpen(false)}
        employees={employees}
      />
      {isAdmin && (
        <ScheduleFormModal
          open={scheduleFormOpen}
          onClose={() => {
            setScheduleFormOpen(false);
            setEditingSchedule(null);
          }}
          onSubmit={handleScheduleFormSubmit}
          isPending={isCreating || isUpdating}
          employees={employees}
          initialData={editingSchedule ?? undefined}
        />
      )}
    </div>
  );
};

export default SchedulePage;
