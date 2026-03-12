import { ShieldUser } from 'lucide-react';

import {
  AttendanceManager,
  HolidayManagement,
  InsuranceRateManagement,
  PendingUsersTab,
  UserManagement,
} from '@/features/admin';
import { usePendingUsersQuery } from '@/features/admin/api/queries';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { cn } from '@/shared/lib/utils';

const tabTriggerClass =
  'flex-1 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ' +
  'data-[state=active]:bg-mega data-[state=active]:text-white data-[state=active]:shadow-sm ' +
  'text-gray-600 hover:text-gray-900';

const AdminPage = () => {
  const { data: pendingData } = usePendingUsersQuery();
  const pendingCount = pendingData?.total ?? 0;

  return (
    <div className="flex flex-col gap-6">
      {/* ── 페이지 헤더 ── */}
      <PageHeader
        icon={<ShieldUser className="size-5 text-mega" />}
        iconBg="bg-mega/10"
        title="관리자"
        description="직원 관리, 근태, 공휴일 및 보험 요율 설정"
      />

      {/* ── 탭 ── */}
      <Tabs defaultValue="pending">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-1.5 mb-4">
          <TabsList className="w-full bg-transparent p-0 h-auto gap-1 flex-wrap">
            <TabsTrigger value="pending" className={cn(tabTriggerClass, 'relative')}>
              가입 승인
              {pendingCount > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold rounded-full bg-red-500 text-white">
                  {pendingCount > 9 ? '9+' : pendingCount}
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
          </TabsList>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <TabsContent value="pending" className="mt-0">
            <PendingUsersTab />
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
        </div>
      </Tabs>
    </div>
  );
};

export default AdminPage;
