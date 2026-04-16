// ─── 스케줄 주차 상태 색상 ────────────────────────────────

export const SCHEDULE_STATUS_CONFIG = {
  DRAFT: {
    label: '초안작성중',
    className: 'bg-amber-100 text-amber-800 border-amber-300',
  },
  CONFIRMED: {
    label: '스케줄확정',
    className: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  },
} as const;

// ─── 요청 상태 색상 (휴무/근무교대) ──────────────────────

export const REQUEST_STATUS_CONFIG = {
  PENDING: {
    label: '대기중',
    className: 'bg-amber-100 text-amber-800',
  },
  APPROVED: {
    label: '승인됨',
    className: 'bg-emerald-100 text-emerald-800',
  },
  REJECTED: {
    label: '반려됨',
    className: 'bg-red-100 text-red-800',
  },
} as const;

// ─── 시프트 빠른 선택 프리셋 ─────────────────────────────

export const SHIFT_PRESETS = [
  { label: '오전', start: '08:00', end: '17:00' },
  { label: '미들', start: '10:30', end: '16:30' },
  { label: '막입', start: '16:30', end: '22:30' },
  { label: '막퇴', start: '19:00', end: '01:00' },
] as const;
