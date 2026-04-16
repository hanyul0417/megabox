export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type ShiftType = 'SWAP' | 'REPLACE';

// 근무교대 유형
export const SHIFT_TYPE_LABEL: Record<ShiftType, string> = {
  SWAP: '교대',
  REPLACE: '대체',
};

// 근무교대 • 휴무신청 승인 상태
export const APPROVAL_STATUS_LABEL: Record<ApprovalStatus, string> = {
  APPROVED: '승인',
  REJECTED: '반려',
  PENDING: '대기',
};

// 근무교대 • 휴무신청 승인 상태 표시 색상
export const APPROVAL_STATUS_STYLE: Record<ApprovalStatus, string> = {
  APPROVED: 'bg-emerald-100 text-emerald-800',
  REJECTED: 'bg-red-100 text-red-800',
  PENDING: 'bg-amber-100 text-amber-800',
};
