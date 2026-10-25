import { ArrowLeftRight, Calendar, CalendarPlus, User, Users } from 'lucide-react';

import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/lib/utils';

type ViewMode = 'my' | 'all';

type ScheduleActionBarProps = {
  viewMode: ViewMode;
  isAdmin: boolean;
  onViewModeChange: (mode: ViewMode) => void;
  onShiftOpen: () => void;
  onDayoffOpen: () => void;
  onScheduleCreate: () => void;
};

const ScheduleActionBar = ({
  viewMode,
  isAdmin,
  onViewModeChange,
  onShiftOpen,
  onDayoffOpen,
  onScheduleCreate,
}: ScheduleActionBarProps) => {
  return (
    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
      {/* 내 스케줄 / 전체 토글 */}
      <div className="grid grid-cols-2 gap-0.5 rounded-xl bg-gray-100 p-1 sm:flex sm:items-center">
        <button
          type="button"
          onClick={() => onViewModeChange('my')}
          className={cn(
            'flex min-h-9 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40',
            viewMode === 'my'
              ? 'bg-white text-mega-secondary shadow-sm'
              : 'text-gray-500 hover:text-gray-700',
          )}
        >
          <User className="size-3.5" />내 스케줄
        </button>
        <button
          type="button"
          onClick={() => onViewModeChange('all')}
          className={cn(
            'flex min-h-9 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40',
            viewMode === 'all'
              ? 'bg-white text-mega-secondary shadow-sm'
              : 'text-gray-500 hover:text-gray-700',
          )}
        >
          <Users className="size-3.5" />
          전체
        </button>
      </div>

      {/* 크루 전용 버튼 */}
      {!isAdmin && (
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Button
            size="sm"
            className="h-10 gap-1.5 rounded-xl bg-sky-500 text-[13px] text-white hover:bg-sky-600 sm:h-9"
            onClick={onShiftOpen}
          >
            <ArrowLeftRight className="size-3.5" />
            근무교대
          </Button>
          <Button
            size="sm"
            className="h-10 gap-1.5 rounded-xl bg-emerald-500 text-[13px] text-white hover:bg-emerald-600 sm:h-9"
            onClick={onDayoffOpen}
          >
            <Calendar className="size-3.5" />
            휴무신청
          </Button>
        </div>
      )}

      {/* 관리자 전용 버튼 */}
      {isAdmin && (
        <Button
          size="sm"
          className="h-10 gap-1.5 rounded-xl bg-mega-secondary text-[13px] hover:bg-mega sm:h-9"
          onClick={onScheduleCreate}
        >
          <CalendarPlus className="size-3.5" />
          스케줄 생성
        </Button>
      )}
    </div>
  );
};

export default ScheduleActionBar;
