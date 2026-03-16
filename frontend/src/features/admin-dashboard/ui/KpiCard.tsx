import type { ReactNode } from 'react';

import { cn } from '@/shared/lib/utils';

interface KpiCardProps {
  icon: ReactNode;
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}

const KpiCard = ({ icon, label, value, sub, accent }: KpiCardProps) => {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4 hover:shadow-md transition-shadow duration-150">
      {/* 아이콘 */}
      <div
        className={cn(
          'flex-shrink-0 size-11 rounded-2xl flex items-center justify-center',
          accent ?? 'bg-gray-50',
        )}
      >
        {icon}
      </div>

      {/* 텍스트 */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-400 mb-1 truncate">{label}</p>
        <p className="text-xl font-bold text-gray-900 tabular-nums leading-none">{value}</p>
        {sub && <p className="text-[11px] text-gray-400 mt-1.5 truncate">{sub}</p>}
      </div>
    </div>
  );
};

export default KpiCard;
