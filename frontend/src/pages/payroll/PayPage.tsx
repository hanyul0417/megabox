import { DollarSign } from 'lucide-react';
import { useState } from 'react';

import AdminPayrollManager from '../../features/pay/ui/AdminPayrollManager';
import UserPosition from '../../features/pay/ui/UserPosition';

import { EmptyBox } from './ui/EmptyBox';

import { usePayrollQuery } from '@/features/pay/api/queries';
import { mapToManagerPayroll } from '@/features/pay/model/manager/mapper';
import { mapToUserPayroll } from '@/features/pay/model/user/mapper';
import PeriodSelector from '@/features/pay/ui/PeriodSelector';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { useAuthStore } from '@/shared/model/authStore';

export default function PayPage() {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);

  const { user } = useAuthStore();
  const isAdmin = user?.position === '관리자';

  const { data: payrollList } = usePayrollQuery({
    year: selectedYear,
    month: selectedMonth,
  });

  const isEmptyPayroll =
    !payrollList ||
    (Array.isArray(payrollList) && payrollList.length === 0) ||
    (!Array.isArray(payrollList) && payrollList.name === '' && payrollList.gross_pay === 0);

  return (
    <div className="flex flex-col gap-6">
      {/* ── 페이지 헤더 ── */}
      <PageHeader
        icon={<DollarSign className="size-5 text-mega" />}
        iconBg="bg-mega/10"
        title={isAdmin ? '전직원 급여 관리' : '급여명세'}
        description={`${selectedYear}년 ${selectedMonth}월 급여 내역`}
      >
        <PeriodSelector
          selectedYear={selectedYear}
          selectedMonth={selectedMonth}
          onChangeYear={setSelectedYear}
          onChangeMonth={setSelectedMonth}
        />
      </PageHeader>

      {/* ── 콘텐츠 ── */}
      {isAdmin ? (
        /* 관리자: 전직원 급여 테이블 */
        isEmptyPayroll ? (
          <EmptyBox selectedYear={selectedYear} selectedMonth={selectedMonth} />
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <AdminPayrollManager
              data={Array.isArray(payrollList) ? mapToManagerPayroll(payrollList) : []}
              year={selectedYear}
              month={selectedMonth}
            />
          </div>
        )
      ) : /* 직원: 본인 급여 명세서 */
      isEmptyPayroll ? (
        <EmptyBox selectedYear={selectedYear} selectedMonth={selectedMonth} />
      ) : (
        payrollList &&
        !Array.isArray(payrollList) && <UserPosition data={mapToUserPayroll(payrollList)} />
      )}
    </div>
  );
}
