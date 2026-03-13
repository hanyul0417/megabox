import {
  AlertTriangle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  DollarSign,
  TrendingUp,
  UserCheck,
  Users,
} from 'lucide-react';
import { useState } from 'react';

import {
  EmployeeTable,
  KpiCard,
  useAdminDashboardQuery,
} from '@/features/admin-dashboard';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Button } from '@/shared/components/ui/button';

const AdminDashboardPage = () => {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);

  const { data, isLoading } = useAdminDashboardQuery(year, month);

  const handlePrev = () => {
    if (month === 1) {
      setYear((y) => y - 1);
      setMonth(12);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const handleNext = () => {
    if (month === 12) {
      setYear((y) => y + 1);
      setMonth(1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const handleThisMonth = () => {
    setYear(today.getFullYear());
    setMonth(today.getMonth() + 1);
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        icon={<TrendingUp className="size-5 text-mega" />}
        iconBg="bg-mega/10"
        title="대시보드"
        description="스케줄 기반 예상 급여 및 근태 현황"
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrev}
            className="h-9 w-9 flex items-center justify-center rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-all"
            aria-label="이전 월"
          >
            <ChevronLeft className="size-4 text-gray-500" />
          </button>
          <div className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-bold text-gray-900 min-w-[120px] text-center">
            {year}년 {month}월
          </div>
          <button
            type="button"
            onClick={handleNext}
            className="h-9 w-9 flex items-center justify-center rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-all"
            aria-label="다음 월"
          >
            <ChevronRight className="size-4 text-gray-500" />
          </button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleThisMonth}
            className="text-xs text-gray-500 hover:text-mega-secondary rounded-xl"
          >
            이번 달
          </Button>
        </div>
      </PageHeader>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard
          icon={<Users className="size-4 text-mega-secondary" />}
          label="이번 달 근무 인원"
          value={isLoading ? '-' : `${data?.headcount_summary.scheduled_employees ?? 0}명`}
          sub={`전체 ${data?.headcount_summary.total_employees ?? 0}명`}
          accent="bg-mega-secondary/10"
        />
        <KpiCard
          icon={<Clock className="size-4 text-blue-500" />}
          label="총 근무시간 (스케줄)"
          value={isLoading ? '-' : `${data?.work_summary.total_scheduled_hours ?? 0}h`}
          sub={
            data?.work_summary.avg_scheduled_hours
              ? `인당 평균 ${data.work_summary.avg_scheduled_hours}h`
              : undefined
          }
          accent="bg-blue-50"
        />
        <KpiCard
          icon={<Clock className="size-4 text-emerald-500" />}
          label="총 근무시간 (실제)"
          value={isLoading ? '-' : `${data?.work_summary.total_actual_hours ?? 0}h`}
          sub={
            data?.work_summary.avg_actual_hours
              ? `인당 평균 ${data.work_summary.avg_actual_hours}h`
              : undefined
          }
          accent="bg-emerald-50"
        />
        <KpiCard
          icon={<AlertTriangle className="size-4 text-red-500" />}
          label="미출근 인원"
          value={isLoading ? '-' : `${data?.headcount_summary.absent_employees ?? 0}명`}
          sub="스케줄 대비 미출근"
          accent="bg-red-50"
        />
        <KpiCard
          icon={<DollarSign className="size-4 text-amber-500" />}
          label="예상 급여 (스케줄)"
          value={
            isLoading
              ? '-'
              : `${(data?.payroll_summary.total_scheduled_gross ?? 0).toLocaleString()}원`
          }
          sub="주간 + 야간(1.5배) 기준"
          accent="bg-amber-50"
        />
        <KpiCard
          icon={<DollarSign className="size-4 text-orange-500" />}
          label="실제 급여 (근태)"
          value={
            isLoading
              ? '-'
              : `${(data?.payroll_summary.total_actual_gross ?? 0).toLocaleString()}원`
          }
          sub="출퇴근 기록 기반"
          accent="bg-orange-50"
        />
      </div>

      {/* Dayoff summary */}
      <div className="grid grid-cols-2 gap-4">
        <KpiCard
          icon={<Calendar className="size-4 text-sky-500" />}
          label="승인된 휴무"
          value={isLoading ? '-' : `${data?.dayoff_summary.total_approved ?? 0}건`}
          accent="bg-sky-50"
        />
        <KpiCard
          icon={<UserCheck className="size-4 text-yellow-500" />}
          label="대기중 휴무"
          value={isLoading ? '-' : `${data?.dayoff_summary.total_pending ?? 0}건`}
          accent="bg-yellow-50"
        />
      </div>

      {/* Employee table */}
      <EmployeeTable employees={data?.per_employee ?? []} isLoading={isLoading} />
    </div>
  );
};

export default AdminDashboardPage;
