import type { ComponentType } from 'react';

import { cn } from '@/shared/lib/utils';

export interface SegmentedTabItem<K extends string> {
  key: K;
  label: string;
  icon?: ComponentType<{ className?: string }>;
  /** 0 이하이면 표시하지 않음 */
  count?: number;
  /** alert: 처리 필요(빨강), neutral: 단순 개수(회색) */
  countTone?: 'alert' | 'neutral';
}

interface SegmentedTabsProps<K extends string> {
  items: readonly SegmentedTabItem<K>[];
  value: K;
  onChange: (key: K) => void;
  className?: string;
  'aria-label'?: string;
}

/**
 * 페이지 상단 1차 탭 (휴무신청·게시판·관리 등 공통)
 * - 항목이 균등 분할되며, 모바일(sm 미만)에선 아이콘을 라벨 위로 올려 좁은 폭에서도 넘치지 않는다.
 */
export function SegmentedTabs<K extends string>({
  items,
  value,
  onChange,
  className,
  'aria-label': ariaLabel,
}: SegmentedTabsProps<K>) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        'flex gap-1 rounded-2xl border border-gray-200/70 bg-white p-1 shadow-xs',
        className,
      )}
    >
      {items.map((item) => {
        const active = item.key === value;
        const Icon = item.icon;
        const count = item.count ?? 0;
        const tone = item.countTone ?? 'alert';

        return (
          <button
            key={item.key}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(item.key)}
            className={cn(
              'flex min-h-11 min-w-0 flex-1 items-center justify-center rounded-xl px-1.5 text-[13px] font-semibold transition-colors duration-150',
              'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40',
              Icon
                ? 'flex-col gap-0.5 py-1.5 sm:flex-row sm:gap-2 sm:px-3 sm:text-sm'
                : 'gap-1.5 py-2 sm:text-sm',
              active
                ? 'bg-mega text-white shadow-sm'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900',
            )}
          >
            {Icon && <Icon className="size-[18px] shrink-0 sm:size-4" />}
            <span className="flex min-w-0 items-center gap-1">
              <span className="truncate">{item.label}</span>
              {count > 0 && (
                <span
                  className={cn(
                    'inline-flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full px-1 text-[10px] font-bold tabular-nums',
                    tone === 'alert'
                      ? 'bg-red-500 text-white'
                      : active
                        ? 'bg-white/20 text-white'
                        : 'bg-gray-100 text-gray-500',
                  )}
                >
                  {tone === 'alert' ? (count > 9 ? '9+' : count) : count > 99 ? '99+' : count}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
