import { AlertTriangle, ShieldUser } from 'lucide-react';
import { useState } from 'react';

import {
  AttendanceManager,
  DefaultWageManagement,
  HolidayManagement,
  InsuranceRateManagement,
  LeaveShiftApprovalTab,
  PayDateManagement,
  PendingUsersTab,
  ShiftPresetManagement,
  UserManagement,
  UserPayrollHistoryTab,
} from '@/features/admin';
import { usePendingUsersQuery } from '@/features/admin/api/queries';
import { useAdminDayOffsQuery, useAdminShiftRequestsQuery } from '@/features/schedule/api/queries';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { cn } from '@/shared/lib/utils';

// ── 타입 ──────────────────────────────────────────────────────────────────────

type Category = 'approval' | 'staff' | 'settings';
type ApprovalTab = 'pending' | 'leave-shift';
type StaffTab = 'users' | 'attendance' | 'payroll-history';
type SettingsTab = 'holiday' | 'insurance' | 'shift-presets' | 'default-wage' | 'pay-date';

// ── 스타일 상수 ───────────────────────────────────────────────────────────────

const categoryBtnCls = (active: boolean) =>
  cn(
    'relative flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150',
    active
      ? 'bg-mega text-white shadow-sm'
      : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100/80',
  );

const subTabBtnCls = (active: boolean) =>
  cn(
    'px-4 py-2 rounded-lg text-xs font-medium transition-all duration-150 whitespace-nowrap',
    active
      ? 'bg-white text-mega font-semibold shadow-sm border border-gray-200'
      : 'text-gray-500 hover:text-gray-700 hover:bg-white/60',
  );

// ── 뱃지 ──────────────────────────────────────────────────────────────────────

function Badge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full bg-red-500 text-white">
      {count > 9 ? '9+' : count}
    </span>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────

const AdminPage = () => {
  const [category, setCategory] = useState<Category>('approval');
  const [approvalTab, setApprovalTab] = useState<ApprovalTab>('pending');
  const [staffTab, setStaffTab] = useState<StaffTab>('users');
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('holiday');

  const { data: pendingData } = usePendingUsersQuery();
  const pendingCount = pendingData?.total ?? 0;

  const { data: dayoffs = [] } = useAdminDayOffsQuery();
  const { data: shifts = [] } = useAdminShiftRequestsQuery();
  const approvalPendingCount =
    dayoffs.filter((d) => d.status === 'PENDING').length +
    shifts.filter((s) => s.status === 'PENDING').length;

  const totalApprovalCount = pendingCount + approvalPendingCount;
  const hasUrgent = totalApprovalCount > 0;

  const urgentParts = [
    pendingCount > 0 && `가입 승인 ${pendingCount}건`,
    approvalPendingCount > 0 && `신청 승인 ${approvalPendingCount}건`,
  ].filter(Boolean) as string[];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={<ShieldUser className="size-5 text-mega" />}
        iconBg="bg-mega/10"
        title="관리자"
        description="직원 관리, 근태, 공휴일 및 보험 요율 설정"
      />

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

      {/* ── 1단계: 카테고리 탭 ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-1.5">
        <div className="flex gap-1">
          <button className={categoryBtnCls(category === 'approval')} onClick={() => setCategory('approval')}>
            승인
            <Badge count={totalApprovalCount} />
          </button>
          <button className={categoryBtnCls(category === 'staff')} onClick={() => setCategory('staff')}>
            직원·근태
          </button>
          <button className={categoryBtnCls(category === 'settings')} onClick={() => setCategory('settings')}>
            설정
          </button>
        </div>
      </div>

      {/* ── 2단계: 하위 탭 ─────────────────────────────────────────────────── */}
      {category === 'approval' && (
        <div className="flex flex-col gap-4">
          <div className="flex gap-1.5 bg-gray-100/70 rounded-xl p-1 w-fit">
            <button className={subTabBtnCls(approvalTab === 'pending')} onClick={() => setApprovalTab('pending')}>
              가입 승인
              <Badge count={pendingCount} />
            </button>
            <button className={subTabBtnCls(approvalTab === 'leave-shift')} onClick={() => setApprovalTab('leave-shift')}>
              신청 승인
              <Badge count={approvalPendingCount} />
            </button>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 shadow-md p-6 min-h-[400px]">
            {approvalTab === 'pending' && <PendingUsersTab />}
            {approvalTab === 'leave-shift' && <LeaveShiftApprovalTab />}
          </div>
        </div>
      )}

      {category === 'staff' && (
        <div className="flex flex-col gap-4">
          <div className="flex gap-1.5 bg-gray-100/70 rounded-xl p-1 w-fit">
            <button className={subTabBtnCls(staffTab === 'users')} onClick={() => setStaffTab('users')}>
              직원 관리
            </button>
            <button className={subTabBtnCls(staffTab === 'attendance')} onClick={() => setStaffTab('attendance')}>
              근태 관리
            </button>
            <button className={subTabBtnCls(staffTab === 'payroll-history')} onClick={() => setStaffTab('payroll-history')}>
              급여 이력
            </button>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 shadow-md p-6 min-h-[400px]">
            {staffTab === 'users' && <UserManagement />}
            {staffTab === 'attendance' && <AttendanceManager />}
            {staffTab === 'payroll-history' && <UserPayrollHistoryTab />}
          </div>
        </div>
      )}

      {category === 'settings' && (
        <div className="flex flex-col gap-4">
          <div className="flex gap-1.5 bg-gray-100/70 rounded-xl p-1 flex-wrap">
            <button className={subTabBtnCls(settingsTab === 'holiday')} onClick={() => setSettingsTab('holiday')}>
              공휴일
            </button>
            <button className={subTabBtnCls(settingsTab === 'insurance')} onClick={() => setSettingsTab('insurance')}>
              4대보험 요율
            </button>
            <button className={subTabBtnCls(settingsTab === 'shift-presets')} onClick={() => setSettingsTab('shift-presets')}>
              시프트 프리셋
            </button>
            <button className={subTabBtnCls(settingsTab === 'default-wage')} onClick={() => setSettingsTab('default-wage')}>
              최저시급
            </button>
            <button className={subTabBtnCls(settingsTab === 'pay-date')} onClick={() => setSettingsTab('pay-date')}>
              급여지급일
            </button>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 shadow-md p-6 min-h-[400px]">
            {settingsTab === 'holiday' && <HolidayManagement />}
            {settingsTab === 'insurance' && <InsuranceRateManagement />}
            {settingsTab === 'shift-presets' && <ShiftPresetManagement />}
            {settingsTab === 'default-wage' && <DefaultWageManagement />}
            {settingsTab === 'pay-date' && <PayDateManagement />}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
