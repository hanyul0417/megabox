import { AlertTriangle, ShieldUser } from 'lucide-react';

import {
  AttendanceManager,
  HolidayManagement,
  InsuranceRateManagement,
  LeaveShiftApprovalTab,
  PendingUsersTab,
  ShiftPresetManagement,
  UserManagement,
} from '@/features/admin';
import { usePendingUsersQuery } from '@/features/admin/api/queries';
import { useAdminDayOffsQuery, useAdminShiftRequestsQuery } from '@/features/schedule/api/queries';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { cn } from '@/shared/lib/utils';

const tabTriggerClass =
  'flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ' +
  'data-[state=active]:bg-mega data-[state=active]:text-white data-[state=active]:shadow-sm ' +
  'text-gray-500 hover:text-gray-800 hover:bg-gray-100/80';

const AdminPage = () => {
  const { data: pendingData } = usePendingUsersQuery();
  const pendingCount = pendingData?.total ?? 0;

  const { data: dayoffs = [] } = useAdminDayOffsQuery();
  const { data: shifts = [] } = useAdminShiftRequestsQuery();
  const approvalPendingCount =
    dayoffs.filter((d) => d.status === 'PENDING').length +
    shifts.filter((s) => s.status === 'PENDING').length;

  const hasUrgent = pendingCount > 0 || approvalPendingCount > 0;

  const urgentParts = [
    pendingCount > 0 && `가입 승인 ${pendingCount}건`,
    approvalPendingCount > 0 && `신청 승인 ${approvalPendingCount}건`,
  ].filter(Boolean) as string[];

  return (
    <div className="flex flex-col gap-6">
      {/* 페이지 헤더 */}
      <PageHeader
        icon={<ShieldUser className="size-5 text-mega" />}
        iconBg="bg-mega/10"
        title="관리자"
        description="직원 관리, 근태, 공휴일 및 보험 요율 설정"
      />

      {/* 긴급 처리 요약 배너 */}
      {hasUrgent && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200/80">
          <div className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-lg bg-amber-100">
            <AlertTriangle className="size-4 text-amber-600" />
          </div>
          <p className="text-sm font-medium text-amber-700">
            <span className="font-semibold">주의 필요</span>
            <span className="mx-1.5 text-amber-500">—</span>
            {urgentParts.join(', ')} 처리가 필요합니다
          </p>
        </div>
      )}

      {/* 탭 */}
      <Tabs defaultValue="pending">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-1.5 mb-4">
          <TabsList className="w-full bg-gray-100/70 rounded-xl p-1 h-auto gap-1 flex-wrap">
            <TabsTrigger value="pending" className={cn(tabTriggerClass, 'relative')}>
              가입 승인
              {pendingCount > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full bg-red-500 text-white">
                  {pendingCount > 9 ? '9+' : pendingCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="approval" className={cn(tabTriggerClass, 'relative')}>
              신청 승인
              {approvalPendingCount > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full bg-red-500 text-white">
                  {approvalPendingCount > 9 ? '9+' : approvalPendingCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="users" className={tabTriggerClass}>
              직원 관리
            </TabsTrigger>
            <TabsTrigger value="attendance" className={tabTriggerClass}>
              근태 관리
            </TabsTrigger>
            <TabsTrigger value="holiday" className={tabTriggerClass}>
              공휴일 관리
            </TabsTrigger>
            <TabsTrigger value="insurance" className={tabTriggerClass}>
              4대 보험 요율
            </TabsTrigger>
            <TabsTrigger value="shift-presets" className={tabTriggerClass}>
              시프트 프리셋
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-md p-6 min-h-[400px]">
          <TabsContent value="pending" className="mt-0">
            <PendingUsersTab />
          </TabsContent>
          <TabsContent value="approval" className="mt-0">
            <LeaveShiftApprovalTab />
          </TabsContent>
          <TabsContent value="users" className="mt-0">
            <UserManagement />
          </TabsContent>
          <TabsContent value="attendance" className="mt-0">
            <AttendanceManager />
          </TabsContent>
          <TabsContent value="holiday" className="mt-0">
            <HolidayManagement />
          </TabsContent>
          <TabsContent value="insurance" className="mt-0">
            <InsuranceRateManagement />
          </TabsContent>
          <TabsContent value="shift-presets" className="mt-0">
            <ShiftPresetManagement />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default AdminPage;
