import { getPositionBadgeStyle } from '@/entities/user/model/position';

interface PositionBadgeProps {
  role: string | null;
}

export default function PositionBadge({ role }: PositionBadgeProps) {
  if (!role) return <span>-</span>;

  const style = getPositionBadgeStyle(role);

  return <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${style}`}>{role}</span>;
}
