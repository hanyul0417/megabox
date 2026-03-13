import type { ReactNode } from 'react';

interface KpiCardProps {
  icon: ReactNode;
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}

const KpiCard = ({ icon, label, value, sub, accent }: KpiCardProps) => {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500">{label}</span>
        <span
          className={`flex items-center justify-center w-8 h-8 rounded-xl ${accent ?? 'bg-gray-50'}`}
        >
          {icon}
        </span>
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
};

export default KpiCard;
