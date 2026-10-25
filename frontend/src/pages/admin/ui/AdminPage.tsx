import { AlertTriangle, ShieldUser } from 'lucide-react';
import { useSearchParams } from 'react-router';

import {
  AdminBroadcast,
  AttendanceManager,
  DayoffLimitManagement,
  DefaultWageManagement,
  FixedDayoffManagement,
  HolidayManagement,
  InsuranceRateManagement,
  KioskChecklistManagement,
  KioskNoticeManagement,
  LeaveShiftApprovalTab,
  PayDateManagement,
  PendingUsersTab,
  ShiftPresetManagement,
  UniformManagement,
  UserManagement,
  UserPayrollHistoryTab,
} from '@/features/admin';
import { usePendingUsersQuery } from '@/features/admin/api/queries';
import { useAdminDayOffsQuery, useAdminShiftRequestsQuery } from '@/features/schedule/api/queries';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { SegmentedTabs } from '@/shared/components/ui/segmented-tabs';
import { cn } from '@/shared/lib/utils';

// ── 타입 ──────────────────────────────────────────────────────────────────────

type Category = 'approval' | 'staff' | 'settings';
type ApprovalTab = 'pending' | 'leave-shift';
type StaffTab = 'users' | 'attendance' | 'payroll-history' | 'uniform' | 'fixed-dayoff';
type SettingsTab =
  | 'holiday'
  | 'insurance'
  | 'shift-presets'
  | 'default-wage'
  | 'pay-date'
  | 'dayoff-limit'
  | 'kiosk-notice'
  | 'kiosk-checklist'
  | 'broadcast';

// ── 스타일 상수 ───────────────────────────────────────────────────────────────

const subTabBtnCls = (active: boolean) =>
  cn(
    'inline-flex min-h-9 items-center px-3.5 py-1.5 rounded-lg text-[13px] font-medium transition-colors duration-150 whitespace-nowrap focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40',
    active
      ? 'bg-white text-mega font-semibold shadow-sm'
      : 'text-gray-500 hover:text-gray-800 hover:bg-white/60',
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

const CATEGORY_DEFAULT_TAB: Record<Category, string> = {
  approval: 'pending',
  staff: 'users',
  settings: 'holiday',
};

const AdminPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const category = (searchParams.get('category') as Category) ?? 'approval';
  const tab = searchParams.get('tab') ?? CATEGORY_DEFAULT_TAB[category];

  const approvalTab = tab as ApprovalTab;
  const staffTab = tab as StaffTab;
  const settingsTab = tab as SettingsTab;

  const setCategory = (cat: Category) =>
    setSearchParams({ category: cat, tab: CATEGORY_DEFAULT_TAB[cat] });
  const setApprovalTab = (t: ApprovalTab) => setSearchParams({ category: 'approval', tab: t });
  const setStaffTab = (t: StaffTab) => setSearchParams({ category: 'staff', tab: t });
  const setSettingsTab = (t: SettingsTab) => setSearchParams({ category: 'settings', tab: t });

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
    <div className="flex flex-col gap-4 sm:gap-6">
      <PageHeader
        icon={<ShieldUser className="size-5 text-mega" />}
        iconBg="bg-mega-soft"
        title="관리"
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
      <SegmentedTabs<Category>
        aria-label="관리 분류"
        items={[
          { key: 'approval', label: '승인', count: totalApprovalCount },
          { key: 'staff', label: '직원' },
          { key: 'settings', label: '설정' },
        ]}
        value={category}
        onChange={setCategory}
      />

      {/* ── 2단계: 하위 탭 ─────────────────────────────────────────────────── */}
      {category === 'approval' && (
        <div className="flex flex-col gap-4">
          <div className="flex w-fit max-w-full flex-wrap gap-1 rounded-xl bg-gray-100 p-1">
            <button
              className={subTabBtnCls(approvalTab === 'pending')}
              onClick={() => setApprovalTab('pending')}
            >
              가입 승인
              <Badge count={pendingCount} />
            </button>
            <button
              className={subTabBtnCls(approvalTab === 'leave-shift')}
              onClick={() => setApprovalTab('leave-shift')}
            >
              신청 승인
              <Badge count={approvalPendingCount} />
            </button>
          </div>
          <div className="min-h-[400px] min-w-0 rounded-2xl border border-gray-200/70 bg-white p-4 shadow-sm sm:p-6">
            {approvalTab === 'pending' && <PendingUsersTab />}
            {approvalTab === 'leave-shift' && <LeaveShiftApprovalTab />}
          </div>
        </div>
      )}

      {category === 'staff' && (
        <div className="flex flex-col gap-4">
          <div className="flex w-fit max-w-full flex-wrap gap-1 rounded-xl bg-gray-100 p-1">
            <button
              className={subTabBtnCls(staffTab === 'users')}
              onClick={() => setStaffTab('users')}
            >
              직원 관리
            </button>
            <button
              className={subTabBtnCls(staffTab === 'attendance')}
              onClick={() => setStaffTab('attendance')}
            >
              근태 관리
            </button>
            <button
              className={subTabBtnCls(staffTab === 'payroll-history')}
              onClick={() => setStaffTab('payroll-history')}
            >
              급여 관리
            </button>
            <button
              className={subTabBtnCls(staffTab === 'uniform')}
              onClick={() => setStaffTab('uniform')}
            >
              유니폼 관리
            </button>
            <button
              className={subTabBtnCls(staffTab === 'fixed-dayoff')}
              onClick={() => setStaffTab('fixed-dayoff')}
            >
              고정 휴무 관리
            </button>
          </div>
          <div className="min-h-[400px] min-w-0 rounded-2xl border border-gray-200/70 bg-white p-4 shadow-sm sm:p-6">
            {staffTab === 'users' && <UserManagement />}
            {staffTab === 'attendance' && <AttendanceManager />}
            {staffTab === 'payroll-history' && <UserPayrollHistoryTab />}
            {staffTab === 'uniform' && <UniformManagement />}
            {staffTab === 'fixed-dayoff' && <FixedDayoffManagement />}
          </div>
        </div>
      )}

      {category === 'settings' && (
        <div className="flex flex-col gap-4">
          <div className="flex w-fit max-w-full flex-wrap gap-1 rounded-xl bg-gray-100 p-1">
            <button
              className={subTabBtnCls(settingsTab === 'holiday')}
              onClick={() => setSettingsTab('holiday')}
            >
              공휴일
            </button>
            <button
              className={subTabBtnCls(settingsTab === 'insurance')}
              onClick={() => setSettingsTab('insurance')}
            >
              4대보험 요율
            </button>
            <button
              className={subTabBtnCls(settingsTab === 'shift-presets')}
              onClick={() => setSettingsTab('shift-presets')}
            >
              시프트 프리셋
            </button>
            <button
              className={subTabBtnCls(settingsTab === 'default-wage')}
              onClick={() => setSettingsTab('default-wage')}
            >
              최저시급
            </button>
            <button
              className={subTabBtnCls(settingsTab === 'pay-date')}
              onClick={() => setSettingsTab('pay-date')}
            >
              급여지급일
            </button>
            <button
              className={subTabBtnCls(settingsTab === 'dayoff-limit')}
              onClick={() => setSettingsTab('dayoff-limit')}
            >
              기본 설정
            </button>
            <button
              className={subTabBtnCls(settingsTab === 'kiosk-notice')}
              onClick={() => setSettingsTab('kiosk-notice')}
            >
              키오스크 공지
            </button>
            <button
              className={subTabBtnCls(settingsTab === 'kiosk-checklist')}
              onClick={() => setSettingsTab('kiosk-checklist' as SettingsTab)}
            >
              체크리스트
            </button>
            <button
              className={subTabBtnCls(settingsTab === 'broadcast')}
              onClick={() => setSettingsTab('broadcast')}
            >
              알림 발송
            </button>
          </div>
          <div className="min-h-[400px] min-w-0 rounded-2xl border border-gray-200/70 bg-white p-4 shadow-sm sm:p-6">
            {settingsTab === 'holiday' && <HolidayManagement />}
            {settingsTab === 'insurance' && <InsuranceRateManagement />}
            {settingsTab === 'shift-presets' && <ShiftPresetManagement />}
            {settingsTab === 'default-wage' && <DefaultWageManagement />}
            {settingsTab === 'pay-date' && <PayDateManagement />}
            {settingsTab === 'dayoff-limit' && <DayoffLimitManagement />}
            {settingsTab === 'kiosk-notice' && <KioskNoticeManagement />}
            {settingsTab === 'kiosk-checklist' && <KioskChecklistManagement />}
            {settingsTab === 'broadcast' && <AdminBroadcast />}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
