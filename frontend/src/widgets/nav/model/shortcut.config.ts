export interface ShortcutDestination {
  id: string;
  label: string;
  path: string;
  group: string;
}

export interface ShortcutGroup {
  label: string;
  items: ShortcutDestination[];
}

export const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    label: '승인',
    items: [
      { id: 'approval-pending',    label: '가입 승인', path: '/admin?category=approval&tab=pending',    group: '승인' },
      { id: 'approval-leave-shift', label: '신청 승인', path: '/admin?category=approval&tab=leave-shift', group: '승인' },
    ],
  },
  {
    label: '직원',
    items: [
      { id: 'staff-users',        label: '직원 관리',     path: '/admin?category=staff&tab=users',         group: '직원' },
      { id: 'staff-attendance',   label: '근태 관리',     path: '/admin?category=staff&tab=attendance',    group: '직원' },
      { id: 'staff-payroll',      label: '급여 관리',     path: '/admin?category=staff&tab=payroll-history', group: '직원' },
      { id: 'staff-uniform',      label: '유니폼 관리',   path: '/admin?category=staff&tab=uniform',       group: '직원' },
      { id: 'staff-fixed-dayoff', label: '고정 휴무 관리', path: '/admin?category=staff&tab=fixed-dayoff', group: '직원' },
    ],
  },
  {
    label: '설정',
    items: [
      { id: 'settings-holiday',          label: '공휴일',       path: '/admin?category=settings&tab=holiday',          group: '설정' },
      { id: 'settings-insurance',        label: '4대보험 요율',  path: '/admin?category=settings&tab=insurance',        group: '설정' },
      { id: 'settings-shift-presets',    label: '시프트 프리셋', path: '/admin?category=settings&tab=shift-presets',    group: '설정' },
      { id: 'settings-default-wage',     label: '최저시급',      path: '/admin?category=settings&tab=default-wage',     group: '설정' },
      { id: 'settings-pay-date',         label: '급여지급일',    path: '/admin?category=settings&tab=pay-date',         group: '설정' },
      { id: 'settings-dayoff-limit',     label: '기본 설정',     path: '/admin?category=settings&tab=dayoff-limit',     group: '설정' },
      { id: 'settings-kiosk-notice',     label: '키오스크 공지', path: '/admin?category=settings&tab=kiosk-notice',     group: '설정' },
      { id: 'settings-kiosk-checklist',  label: '체크리스트',    path: '/admin?category=settings&tab=kiosk-checklist',  group: '설정' },
    ],
  },
];

export const MAX_SHORTCUTS = 6;
