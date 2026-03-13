/** 직급별 뱃지(pill) 스타일 - admin 테이블 / 스케줄 카드 공통 사용 */
export const POSITION_BADGE_STYLE: Record<string, string> = {
  관리자: 'bg-purple-100 text-purple-700 border-purple-200',
  리더: 'bg-blue-100 text-blue-700 border-blue-200',
  크루: 'bg-mega-secondary/10 text-mega-secondary border-mega-secondary/20',
  미화: 'bg-green-100 text-green-700 border-green-200',
  시스템: 'bg-orange-100 text-orange-700 border-orange-200',
};

/** 직급별 카드 왼쪽 강조 보더 - 스케줄 카드 전용 */
export const POSITION_BORDER_STYLE: Record<string, string> = {
  관리자: 'border-l-purple-400',
  리더: 'border-l-blue-400',
  크루: 'border-l-mega-secondary',
  미화: 'border-l-green-400',
  시스템: 'border-l-orange-400',
};

/** 직급별 배경 색상 (타임라인 시각화용) */
export const POSITION_BG_COLOR: Record<string, string> = {
  관리자: 'bg-purple-500',
  리더: 'bg-blue-500',
  크루: 'bg-indigo-500',
  미화: 'bg-green-500',
  시스템: 'bg-orange-500',
};

/** 직급별 카드 배경 그라디언트 - 리디자인된 스케줄 카드 전용 */
export const POSITION_CARD_STYLE: Record<string, string> = {
  관리자: 'bg-gradient-to-r from-purple-50 to-purple-100/60 border-l-purple-500',
  리더: 'bg-gradient-to-r from-blue-50 to-blue-100/60 border-l-blue-500',
  크루: 'bg-gradient-to-r from-indigo-50 to-indigo-100/60 border-l-indigo-500',
  미화: 'bg-gradient-to-r from-emerald-50 to-emerald-100/60 border-l-emerald-500',
  시스템: 'bg-gradient-to-r from-orange-50 to-orange-100/60 border-l-orange-500',
};

export function getPositionCardStyle(position: string): string {
  return (
    POSITION_CARD_STYLE[position] ??
    'bg-gradient-to-r from-gray-50 to-gray-100/60 border-l-gray-400'
  );
}

export function getPositionBadgeStyle(position: string): string {
  return POSITION_BADGE_STYLE[position] ?? 'bg-muted text-muted-foreground border-muted';
}

export function getPositionBorderStyle(position: string): string {
  return POSITION_BORDER_STYLE[position] ?? 'border-l-gray-400';
}

export function getPositionBgColor(position: string): string {
  return POSITION_BG_COLOR[position] ?? 'bg-gray-400';
}

/** 직급별 솔리드 블록 스타일 (타임라인 블록 전용) */
export const POSITION_BLOCK_SOLID: Record<
  string,
  { bg: string; text: string; border: string; hover: string }
> = {
  관리자: {
    bg: 'bg-purple-500',
    text: 'text-white',
    border: 'border-purple-700',
    hover: 'hover:bg-purple-600',
  },
  리더: {
    bg: 'bg-blue-500',
    text: 'text-white',
    border: 'border-blue-700',
    hover: 'hover:bg-blue-600',
  },
  크루: {
    bg: 'bg-indigo-500',
    text: 'text-white',
    border: 'border-indigo-700',
    hover: 'hover:bg-indigo-600',
  },
  미화: {
    bg: 'bg-emerald-500',
    text: 'text-white',
    border: 'border-emerald-700',
    hover: 'hover:bg-emerald-600',
  },
  시스템: {
    bg: 'bg-orange-500',
    text: 'text-white',
    border: 'border-orange-700',
    hover: 'hover:bg-orange-600',
  },
};

export function getPositionBlockSolid(position: string): {
  bg: string;
  text: string;
  border: string;
  hover: string;
} {
  return (
    POSITION_BLOCK_SOLID[position] ?? {
      bg: 'bg-gray-500',
      text: 'text-white',
      border: 'border-gray-700',
      hover: 'hover:bg-gray-600',
    }
  );
}
