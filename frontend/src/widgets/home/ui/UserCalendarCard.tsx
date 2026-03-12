// 실제 데이터 사용 시 아래 두 줄의 주석을 해제하세요.
import { useUserQuery } from '@/entities/user/api/queries';
import { ScheduleList, UserCalendar, UserProfile } from '@/features/home';
import { getISOWeek, useScheduleWeekQuery } from '@/features/schedule';
import ContentsCard from '@/shared/components/ui/ContentsCard';

// ─────────────────────────────────────────────────────────────
// TODO: 실제 API 데이터가 준비되면 아래 MOCK_SCHEDULES 블록을
//       삭제하고, schedules={MOCK_SCHEDULES} → schedules={mySchedules}
//       isLoading={false}        → isLoading={isLoading}
//       으로 교체하세요.
// ─────────────────────────────────────────────────────────────
// const MOCK_SCHEDULES = [
//   { id: 1, position: 'CREW', work_date: '2026-03-02', start_time: '09:00', end_time: '18:00' },
//   { id: 2, position: 'CREW', work_date: '2026-03-04', start_time: '13:00', end_time: '22:00' },
//   { id: 3, position: 'CREW', work_date: '2026-03-05', start_time: '21:00', end_time: '06:00' },
//   { id: 4, position: 'CREW', work_date: '2026-03-06', start_time: '09:00', end_time: '14:00' },
//   { id: 5, position: 'CREW', work_date: '2026-03-08', start_time: '15:00', end_time: '21:00' },
// ];

const UserCalendarCard = () => {
  // 실제 데이터 사용 시 아래 블록의 주석을 해제하고 MOCK_SCHEDULES 라인을 제거하세요.
  const today = new Date();
  const { year, week } = getISOWeek(today);
  const { data: user } = useUserQuery();
  const { data: allSchedules = [], isLoading } = useScheduleWeekQuery(year, week);
  const mySchedules = allSchedules
    .filter((s) => s.user_id === user?.id)
    .sort((a, b) => a.work_date.localeCompare(b.work_date));

  return (
    <ContentsCard className="w-full lg:w-80 lg:shrink-0" profile={<UserProfile />} title="">
      <UserCalendar scheduleMap={new Map()} />
      {/* 실제 데이터: schedules={mySchedules} isLoading={isLoading} */}
      <ScheduleList schedules={mySchedules} isLoading={isLoading} />
    </ContentsCard>
  );
};

export default UserCalendarCard;
