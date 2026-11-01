import ScheduleListItem, { type HomeScheduleItem } from './ScheduleListItem';

interface ScheduleListProps {
  schedules: HomeScheduleItem[];
  isLoading?: boolean;
}

const ScheduleList = ({ schedules, isLoading = false }: ScheduleListProps) => {
  return (
    <div className="flex flex-col mt-3">
      <div className="flex items-center justify-between mb-1">
        <h4 className="text-xs font-semibold text-muted-foreground">이번 주 스케줄</h4>
        {!isLoading && <span className="text-xs text-muted-foreground">{schedules.length}건</span>}
      </div>
      {isLoading ? (
        Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-11 rounded-xl bg-muted/50 animate-pulse" />
        ))
      ) : schedules.length > 0 ? (
        schedules.map((s) => <ScheduleListItem key={s.id} schedule={s} />)
      ) : (
        <div className="flex items-center justify-center py-5 rounded-xl border border-dashed border-gray-300/60">
          <span className="text-xs text-muted-foreground">이번 주 스케줄이 없습니다.</span>
        </div>
      )}
    </div>
  );
};

export default ScheduleList;
