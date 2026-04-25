import PositionBadge from '../../ui/PositionBadge';

import type { PayrollData } from '../type';
import type { ReactNode } from 'react';

export type ColumnConfig = {
  key: keyof PayrollData;
  label: string;
  align?: 'left' | 'center' | 'right';
  highlight?: 'primary' | 'danger';
  rightBorder?: boolean;
  render?: (value: any, row: PayrollData) => ReactNode;
};

type ColumnGroup = {
  group: string;
  highlight?: 'primary' | 'danger';
  columns: ColumnConfig[];
};

export const dataColumns: ColumnGroup[] = [
  {
    group: '기본정보',
    columns: [
      { key: 'name', label: '이름', align: 'left' },
      {
        key: 'position',
        label: '직급',
        render: (value) => <PositionBadge role={value} />,
      },
      { key: 'wage', label: '시급' },
      {
        key: 'rrn',
        label: '주민번호',
        // 주민번호 길이 임의 프론트 제한
        render: (value) => {
          if (!value) return '-';
          return (value as string).slice(0, 14);
        },
      },
      { key: 'join_date', label: '입사일' },
      { key: 'resign_date', label: '퇴사예정일' },
      { key: 'last_work_day', label: '마지막근무일' },
      { key: 'bank_name', label: '은행' },
      { key: 'bank_account', label: '계좌번호' },
      { key: 'email', label: '이메일', rightBorder: true },
    ],
  },
  {
    group: '근무요약',
    columns: [
      { key: 'total_work_days', label: '근무일수' },
      { key: 'total_work_hours', label: '총근무시간' },
      { key: 'avg_daily_hours', label: '일평균시간', rightBorder: true },
    ],
  },
  {
    group: '근무시간',
    columns: [
      { key: 'day_hours', label: '주간시간' },
      { key: 'night_hours', label: '야간시간' },
      { key: 'weekly_allowance_hours', label: '주휴시간' },
      { key: 'annual_leave_hours', label: '연차시간' },
      { key: 'annual_leave_count', label: '연차개수' },
      { key: 'holiday_hours', label: '공휴일시간', rightBorder: true },
    ],
  },
  {
    group: '급여',
    highlight: 'primary',
    columns: [
      { key: 'day_wage', label: '주간급여' },
      { key: 'night_wage', label: '야간급여' },
      { key: 'weekly_allowance_pay', label: '주휴수당' },
      { key: 'annual_leave_pay', label: '연차수당' },
      { key: 'holiday_pay', label: '공휴일수당' },
      { key: 'gross_pay', label: '급여총액', highlight: 'primary', rightBorder: true },
    ],
  },
  {
    group: '공제',
    highlight: 'danger',
    columns: [
      { key: 'insurance_health', label: '건강보험' },
      { key: 'insurance_care', label: '요양보험' },
      { key: 'insurance_employment', label: '고용보험' },
      { key: 'insurance_pension', label: '국민연금' },
      { key: 'total_deduction', label: '공제계', highlight: 'danger', rightBorder: true },
    ],
  },
  {
    group: '지급',
    highlight: 'primary',
    columns: [{ key: 'net_pay', label: '총 지급액', highlight: 'primary' }],
  },
];
