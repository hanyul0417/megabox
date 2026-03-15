import { ArrowLeftRight, Calendar, CalendarPlus, LayoutList, Timer, User, Users } from 'lucide-react';

import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/lib/utils';

type ViewMode = 'my' | 'all';
export type DisplayMode = 'roster' | 'timeline';

type ScheduleActionBarProps = {
  viewMode: ViewMode;
  displayMode: DisplayMode;
  isAdmin: boolean;
  onViewModeChange: (mode: ViewMode) => void;
  onDisplayModeChange: (mode: DisplayMode) => void;
  onShiftOpen: () => void;
  onDayoffOpen: () => void;
  onScheduleCreate: () => void;
};

const ScheduleActionBar = ({
  viewMode,
  displayMode,
  isAdmin,
  onViewModeChange,
  onDisplayModeChange,
  onShiftOpen,
  onDayoffOpen,
  onScheduleCreate,
}: ScheduleActionBarProps) => {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* 이름/전체 토글 */}
      <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-0.5">
        <button
          type="button"
          onClick={() => onViewModeChange('my')}
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
          onClick={() => onViewModeChange('all')}
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

      {/* 뷰 모드 토글 (로스터 / 타임라인) */}
      <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-0.5">
        <button
          type="button"
          onClick={() => onDisplayModeChange('roster')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-150',
            displayMode === 'roster'
              ? 'bg-white shadow-sm text-mega-secondary'
              : 'text-gray-500 hover:text-gray-700',
          )}
        >
          <LayoutList className="size-3.5" />
          로스터
        </button>
        <button
          type="button"
          onClick={() => onDisplayModeChange('timeline')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-150',
            displayMode === 'timeline'
              ? 'bg-white shadow-sm text-mega-secondary'
              : 'text-gray-500 hover:text-gray-700',
          )}
        >
          <Timer className="size-3.5" />
          타임라인
        </button>
      </div>

      {/* 크루 전용 버튼 */}
      {!isAdmin && (
        <>
          <Button
            size="sm"
            className="bg-sky-500 hover:bg-sky-400 active:bg-sky-600 text-white gap-1.5 rounded-xl shadow-md shadow-sky-200 h-9 text-xs font-medium transition-all duration-150"
            onClick={onShiftOpen}
          >
            <ArrowLeftRight className="size-3.5" />
            근무교대
          </Button>
          <Button
            size="sm"
            className="bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-white gap-1.5 rounded-xl shadow-md shadow-emerald-200 h-9 text-xs font-medium transition-all duration-150"
            onClick={onDayoffOpen}
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
