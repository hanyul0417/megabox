/** 직급별 뱃지(pill) 스타일 - 전체 페이지 공통 사용 */
export const POSITION_BADGE_STYLE: Record<string, string> = {
  관리자: 'bg-navy-100 text-navy-800 border-navy-200',
  리더: 'bg-blue-100 text-blue-700 border-blue-200',
  크루: 'bg-teal-50 text-teal-700 border-teal-200',
  미화: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  시스템: 'bg-gray-100 text-gray-600 border-gray-200',
};

/** 직급별 카드 왼쪽 강조 보더 - 스케줄 카드 전용 */
export const POSITION_BORDER_STYLE: Record<string, string> = {
  관리자: 'border-l-navy-700',
  리더: 'border-l-blue-400',
  크루: 'border-l-teal-400',
  미화: 'border-l-emerald-400',
  시스템: 'border-l-gray-400',
};

/** 직급별 배경 색상 (타임라인 시각화용) */
export const POSITION_BG_COLOR: Record<string, string> = {
  관리자: 'bg-navy-700',
  리더: 'bg-blue-500',
  크루: 'bg-teal-500',
  미화: 'bg-emerald-500',
  시스템: 'bg-gray-500',
};

/** 직급별 카드 배경 - 스케줄 카드 전용 (단색 + 좌측 강조 보더) */
export const POSITION_CARD_STYLE: Record<string, string> = {
  관리자: 'bg-navy-50 border-l-navy-700',
  리더: 'bg-blue-50 border-l-blue-500',
  크루: 'bg-teal-50 border-l-teal-500',
  미화: 'bg-emerald-50 border-l-emerald-500',
  시스템: 'bg-gray-50 border-l-gray-500',
};

export function getPositionCardStyle(position: string): string {
  return POSITION_CARD_STYLE[position] ?? 'bg-gray-50 border-l-gray-400';
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
    bg: 'bg-navy-800',
    text: 'text-white',
    border: 'border-navy-950',
    hover: 'hover:bg-navy-700',
  },
  리더: {
    bg: 'bg-blue-500',
    text: 'text-white',
    border: 'border-blue-700',
    hover: 'hover:bg-blue-600',
  },
  크루: {
    bg: 'bg-teal-500',
    text: 'text-white',
    border: 'border-teal-700',
    hover: 'hover:bg-teal-600',
  },
  미화: {
    bg: 'bg-emerald-500',
    text: 'text-white',
    border: 'border-emerald-700',
    hover: 'hover:bg-emerald-600',
  },
  시스템: {
    bg: 'bg-gray-500',
    text: 'text-white',
    border: 'border-gray-700',
    hover: 'hover:bg-gray-600',
  },
};

/** 직급별 아바타 배경 (이니셜 원형 전용) */
export const POSITION_AVATAR_BG: Record<string, string> = {
  관리자: 'bg-navy-100 text-navy-700',
  리더: 'bg-blue-100 text-blue-600',
  크루: 'bg-teal-100 text-teal-700',
  미화: 'bg-emerald-100 text-emerald-600',
  시스템: 'bg-gray-100 text-gray-600',
};

export function getAvatarBg(position: string): string {
  return POSITION_AVATAR_BG[position] ?? 'bg-gray-100 text-gray-600';
}

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
