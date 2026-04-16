import { Calendar, Printer } from 'lucide-react';
import { useState } from 'react';

import type { ScheduleResponse } from '@/features/schedule';
import type { ScheduleCreateDTO, ScheduleUpdateDTO } from '@/features/schedule/api/dto';

import { useUserQuery } from '@/entities/user/api/queries';
import { hasAdminAccess } from '@/entities/user/model/role';
import {
  DayoffModal,
  ScheduleActionBar,
  ScheduleFormModal,
  ShiftModal,
  StatusChangeModal,
  TimeOverlapPanel,
  WeekNavigator,
  addWeeks,

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
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { RosterView } from '@/widgets/schedule';

type ViewMode = 'my' | 'all';

const SchedulePage = () => {
  const today = new Date();
  const [{ year, week }, setYearWeek] = useState(() => getISOWeek(today));
  const weekDates = getWeekDates(year, week);

  const [viewMode, setViewMode] = useState<ViewMode>('all');

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
  const { mutateAsync: createScheduleAsync, isPending: isCreating } = useCreateScheduleMutation();
  const { mutate: updateSchedule, isPending: isUpdating } = useUpdateScheduleMutation();
  const { mutateAsync: createScheduleWeekAsync } = useCreateScheduleWeekMutation();
  const { mutate: deleteSchedule } = useDeleteScheduleMutation();
  const { mutate: createDayOff, isPending: isDayOffPending } = useCreateDayOffMutation();
  const { mutate: createShiftRequest, isPending: isShiftPending } = useCreateShiftRequestMutation();
  const { mutate: updateWeekStatus, isPending: isStatusPending } = useUpdateWeekStatusMutation();

  // 뷰 필터링
  const displaySchedules =
    viewMode === 'my' ? allSchedules.filter((s) => s.user_id === user?.id) : allSchedules;


  // 내 스케줄 (현재 주차)
  const mySchedules = allSchedules.filter((s) => s.user_id === user?.id);

  const scheduleWeekId = scheduleWeek?.id ?? 0;

  // 주차 네비게이션
  const handlePrev = () => setYearWeek(addWeeks(year, week, -1));
  const handleNext = () => setYearWeek(addWeeks(year, week, 1));
  const handleToday = () => setYearWeek(getISOWeek(today));

  // 출력
  const handlePrint = () => window.print();

  // 스케줄 편집
  const handleEditSchedule = (schedule: ScheduleResponse) => {
    setEditingSchedule(schedule);
    setScheduleFormOpen(true);
  };

  // 스케줄 생성/수정 제출
  // work_date 기준으로 해당 주차를 계산해 week 레코드를 get-or-create 후 스케줄 생성
  const handleScheduleFormSubmit = async (_swId: number, data: ScheduleCreateDTO) => {
    const targetDate = new Date(data.work_date + 'T12:00:00');
    const { year: targetYear, week: targetWeek } = getISOWeek(targetDate);

    let weekId = scheduleWeekId;
    if (targetYear !== year || targetWeek !== week || weekId === 0) {
      try {
        const newWeek = await createScheduleWeekAsync({ year: targetYear, week_number: targetWeek });
        weekId = newWeek.id;
      } catch {
        return;
      }
    }
    try {
      await createScheduleAsync({ scheduleWeekId: weekId, data });
    } catch {
      return;
    }
    setScheduleFormOpen(false);
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

  const weekLabel = (() => {
    const start = weekDates[0];
    const end = weekDates[6];
    const fmt = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;
    return `${year}년 ${week}주차 스케줄 (${fmt(start)} ~ ${fmt(end)})`;
  })();

  return (
    <div className="flex flex-col gap-5">
      {/* 출력 전용 스타일 */}
      <style>{`
        @media print {
          * { visibility: hidden; }
          #roster-print-area,
          #roster-print-area * {
            visibility: visible;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          #roster-print-area {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            padding: 16px;
          }
          @page { margin: 12mm; }
        }
      `}</style>

      {/* 페이지 헤더 */}
      <PageHeader
        icon={<Calendar className="size-5 text-mega" />}
        iconBg="bg-mega/10"
        title="스케줄"
        description="스케줄을 확인하고 관리하세요"
      >
        <div className="flex items-center gap-2">
          {isAdmin && (
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-gray-200 text-sm text-gray-600 hover:border-gray-300 hover:bg-gray-50 transition-colors"
            >
              <Printer className="size-4" />
              출력
            </button>
          )}
          <ScheduleActionBar
            viewMode={viewMode}
            isAdmin={isAdmin}
            onViewModeChange={setViewMode}
            onShiftOpen={() => setShiftOpen(true)}
            onDayoffOpen={() => setDayoffOpen(true)}
            onScheduleCreate={() => {
              setEditingSchedule(null);
              setScheduleFormOpen(true);
            }}
          />
        </div>
      </PageHeader>

      {/* 주차 네비게이터 */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-md px-4 py-3.5">
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

      {/* 스케줄 뷰 (로스터) */}
      <div id="roster-print-area">
        {/* 출력 시에만 보이는 제목 */}
        <h1 className="hidden print:block text-lg font-bold text-gray-900 mb-3">{weekLabel}</h1>
        <RosterView
          weekDates={weekDates}
          schedules={displaySchedules}
          isLoading={isLoading}
          isAdmin={isAdmin}
          onEditSchedule={handleEditSchedule}
          onDeleteSchedule={(id) => deleteSchedule(id)}
        />
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
