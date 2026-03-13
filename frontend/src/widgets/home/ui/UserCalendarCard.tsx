import { useUserQuery } from '@/entities/user/api/queries';
import { ScheduleList, UserCalendar, UserProfile } from '@/features/home';
import type { HomeScheduleItem } from '@/features/home/ui/ScheduleListItem';
import { getISOWeek, useWeekScheduleQuery } from '@/features/schedule';
import ContentsCard from '@/shared/components/ui/ContentsCard';

const UserCalendarCard = () => {
  const today = new Date();
  const { year, week } = getISOWeek(today);
  const { data: user } = useUserQuery();
  const { data: weekData, isLoading } = useWeekScheduleQuery(year, week);

  const mySchedules: HomeScheduleItem[] = (weekData?.schedules ?? [])
    .filter((s) => s.user_id === user?.id)
    .sort((a, b) => a.work_date.localeCompare(b.work_date))
    .map((s) => ({
      id: s.id,
      position: s.user_position,
      work_date: s.work_date,
      start_time: s.start_time,
      end_time: s.end_time,
    }));

  return (
    <ContentsCard className="w-full lg:w-80 lg:shrink-0" profile={<UserProfile />} title="">
      <UserCalendar scheduleMap={new Map()} />
      <ScheduleList schedules={mySchedules} isLoading={isLoading} />
    </ContentsCard>
  );
};

export default UserCalendarCard;
