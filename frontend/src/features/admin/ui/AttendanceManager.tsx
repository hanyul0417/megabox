/**
 * 관리자 근태 관리 — 월별 조회 + CRUD + 엑셀 업로드
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Upload,
  Download,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  Plus,
  Pencil,
  Trash2,
  Search,
  Users,
  CalendarCheck2,
  ClipboardX,
  Activity,
} from 'lucide-react';
import { useState, useRef, Fragment, useMemo } from 'react';
import { toast } from 'sonner';

import { useAdminUsersQuery } from '../api/queries';

import { getAvatarBg, getPositionBadgeStyle } from '@/entities/user/model/position';
import { apiClient } from '@/shared/api/apiClients';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';

import { cn } from '@/shared/lib/utils';
import { useAuthStore } from '@/shared/model/authStore';

// ── 타입 ─────────────────────────────────────────────────────────────────────

interface DailySummary {
  user_id: number;
  user_name: string | null;
  position: string | null;
  work_date: string;
  check_in: string | null;
  break_start: string | null;
  break_end: string | null;
  check_out: string | null;
  total_work_hours: number | null;
  day_hours: number | null;
  night_hours: number | null;
}

interface MonthlyAttendanceResponse {
  records: DailySummary[];
  total: number;
}

interface BulkImportResult {
  success_count: number;
  error_count: number;
  errors: string[];
}

interface RecordFormValues {
  user_id: number;
  work_date: string;
  check_in: string;
  break_start: string;
  break_end: string;
  check_out: string;
}

type StatusFilter = 'all' | 'complete' | 'incomplete';
type PositionFilter = 'all' | '관리자' | '리더' | '크루' | '미화';

// ── 상수 ─────────────────────────────────────────────────────────────────────

const DAY_LABEL = ['일', '월', '화', '수', '목', '금', '토'] as const;
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - i);
const EMPTY_FORM: RecordFormValues = {
  user_id: 0,
  work_date: '',
  check_in: '',
  break_start: '',
  break_end: '',
  check_out: '',
};

// ── 유틸 ─────────────────────────────────────────────────────────────────────

const fmtTime = (t: string | null) =>
  t ? { text: t.slice(0, 5), ok: true } : { text: '—', ok: false };

const fmtH = (h: number | null) => (h == null ? '—' : `${h.toFixed(1)}h`);

const fmtDate = (s: string) => {
  const d = new Date(s);
  return `${s.slice(5)} (${DAY_LABEL[d.getDay()]})`;
};

const recordToForm = (r: DailySummary): RecordFormValues => ({
  user_id: r.user_id,
  work_date: r.work_date,
  check_in: r.check_in?.slice(0, 5) ?? '',
  break_start: r.break_start?.slice(0, 5) ?? '',
  break_end: r.break_end?.slice(0, 5) ?? '',
  check_out: r.check_out?.slice(0, 5) ?? '',
});

// ── 통계 카드 ─────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  iconBg: string;
  sub?: string;
}

function StatCard({ label, value, icon, iconBg, sub }: StatCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 flex items-center gap-4">
      <div className={cn('size-11 rounded-xl flex items-center justify-center shrink-0', iconBg)}>
        {icon}
      </div>
      <div>
        <p className="text-xs font-medium text-gray-400 mb-0.5">{label}</p>
        <p className="text-2xl font-bold text-gray-900 leading-none">{value}</p>
        {sub && <p className="text-[11px] text-gray-400 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

// ── 스켈레톤 ─────────────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="bg-nav-bg px-5 py-3.5">
        {Array.from({ length: 1 }).map((_, i) => (
          <div key={i} className="h-3 w-24 rounded bg-white/20 animate-pulse" />
        ))}
      </div>
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-3 border-t border-gray-50">
          <div className="size-8 rounded-full bg-gray-100 animate-pulse shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-20 rounded bg-gray-100 animate-pulse" />
            <div className="h-2.5 w-12 rounded bg-gray-100 animate-pulse" />
          </div>
          {Array.from({ length: 6 }).map((_, j) => (
            <div
              key={j}
              className="h-3 rounded bg-gray-100 animate-pulse hidden sm:block"
              style={{ width: `${40 + (j % 3) * 10}px` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// ── 시간 칩 ──────────────────────────────────────────────────────────────────

function TimeChip({
  value,
  variant,
}: {
  value: string | null;
  variant: 'in' | 'break' | 'out';
}) {
  const { text, ok } = fmtTime(value);
  if (!ok) return <span className="text-gray-300 font-mono text-xs">—</span>;

  const cls = {
    in: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    break: 'bg-amber-50 text-amber-700 border-amber-200',
    out: 'bg-red-50 text-red-700 border-red-200',
  }[variant];

  return (
    <span
      className={cn(
        'inline-block font-mono text-xs px-2 py-0.5 rounded-md border font-semibold',
        cls,
      )}
    >
      {text}
    </span>
  );
}

// ── 직원별 소계 행 ────────────────────────────────────────────────────────────

function SubtotalRow({ records, colSpan }: { records: DailySummary[]; colSpan: number }) {
  const days = records.length;
  const total = records.reduce((s, r) => s + (r.total_work_hours ?? 0), 0);
  const day = records.reduce((s, r) => s + (r.day_hours ?? 0), 0);
  const night = records.reduce((s, r) => s + (r.night_hours ?? 0), 0);

  return (
    <tr className="bg-gray-50 border-t border-gray-200/80">
      <td colSpan={colSpan} className="px-5 py-2">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
          <span>
            근무 <strong className="text-gray-700">{days}일</strong>
          </span>
          <span className="text-gray-200">|</span>
          <span>
            총 <strong className="text-indigo-600">{total.toFixed(1)}h</strong>
          </span>
          <span className="text-gray-200">|</span>
          <span>
            주간 <strong className="text-gray-600">{day.toFixed(1)}h</strong>
          </span>
          <span>
            야간 <strong className="text-indigo-500">{night.toFixed(1)}h</strong>
          </span>
        </div>
      </td>
    </tr>
  );
}

// ── 날짜 자동포맷 입력 (숫자 8자리 → YYYY-MM-DD) ────────────────────────────

function DateInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [raw, setRaw] = useState(value.replace(/-/g, ''));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 8);
    setRaw(digits);
    if (digits.length === 8) {
      const formatted = `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
      onChange(formatted);
    } else {
      onChange('');
    }
  };

  const display =
    raw.length <= 4
      ? raw
      : raw.length <= 6
        ? `${raw.slice(0, 4)}-${raw.slice(4)}`
        : `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6)}`;

  return (
    <div className="relative">
      <Input
        value={display}
        onChange={handleChange}
        placeholder="예) 20260201"
        className="h-10 font-mono pr-24"
        inputMode="numeric"
      />
      {raw.length === 8 && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-emerald-600 font-medium">
          ✓ {value}
        </span>
      )}
      <p className="text-[10px] text-gray-400 mt-1">숫자 8자리 입력 (YYYY MM DD)</p>
    </div>
  );
}

// ── 근태 입력 폼 모달 ─────────────────────────────────────────────────────────

interface FormModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  initial: RecordFormValues;
  employees: Array<{ id: number; name: string; position: string }>;
  isEmployeesLoading?: boolean;
  isPending: boolean;
  onSubmit: (v: RecordFormValues) => void;
  onClose: () => void;
}

function FormModal({ open, mode, initial, employees, isEmployeesLoading, isPending, onSubmit, onClose }: FormModalProps) {
  const [form, setForm] = useState<RecordFormValues>(initial);
  const opened = useRef(false);

  if (open && !opened.current) {
    opened.current = true;
    setForm(initial);
  }
  if (!open) opened.current = false;

  const set = (k: keyof RecordFormValues, v: string | number) =>
    setForm((p) => ({ ...p, [k]: v }));

  const selectedEmp = employees.find((e) => e.id === form.user_id);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'create' && !form.user_id) return toast.error('직원을 선택해주세요.');
    if (mode === 'create' && !form.work_date) return toast.error('근무일을 입력해주세요. (8자리 숫자)');
    if (!form.check_in) return toast.error('출근 시간은 필수입니다.');
    onSubmit(form);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        {/* 헤더 */}
        <div className="bg-nav-bg px-6 py-5">
          <DialogHeader>
            <DialogTitle className="text-white text-base font-semibold">
              {mode === 'create' ? '근태 기록 추가' : '근태 기록 수정'}
            </DialogTitle>
            {mode === 'edit' && (
              <p className="text-white/60 text-xs mt-0.5">
                출근·퇴근·휴식 시간을 수정합니다. 급여가 자동 재계산됩니다.
              </p>
            )}
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          {/* 직원 선택 (생성 전용) — native select (Dialog 내 portal z-index 이슈 방지) */}
          {mode === 'create' && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                직원 <span className="text-red-500">*</span>
              </Label>
              <select
                value={form.user_id || ''}
                onChange={(e) => set('user_id', Number(e.target.value))}
                disabled={isEmployeesLoading}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">
                  {isEmployeesLoading ? '직원 목록 불러오는 중...' : employees.length === 0 ? '등록된 직원이 없습니다' : '직원을 선택하세요...'}
                </option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.position})
                  </option>
                ))}
              </select>

              {/* 선택된 직원 프리뷰 */}
              {selectedEmp && (
                <div className="flex items-center gap-2.5 px-3 py-2 bg-indigo-50 rounded-lg border border-indigo-100">
                  <div
                    className={cn(
                      'size-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                      getAvatarBg(selectedEmp.position),
                    )}
                  >
                    {selectedEmp.name.slice(0, 1)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{selectedEmp.name}</p>
                    <p className="text-xs text-gray-500">{selectedEmp.position}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 근무일 (생성 전용) */}
          {mode === 'create' && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                근무일 <span className="text-red-500">*</span>
              </Label>
              <DateInput value={form.work_date} onChange={(v) => set('work_date', v)} />
            </div>
          )}

          {/* 시간 필드 2×2 그리드 */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              시간 기록
            </Label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: '출근', key: 'check_in' as const, required: true, color: 'border-l-emerald-400' },
                { label: '퇴근', key: 'check_out' as const, required: false, color: 'border-l-red-400' },
                { label: '휴식 시작', key: 'break_start' as const, required: false, color: 'border-l-amber-400' },
                { label: '휴식 종료', key: 'break_end' as const, required: false, color: 'border-l-amber-400' },
              ].map(({ label, key, required, color }) => (
                <div
                  key={key}
                  className={cn(
                    'rounded-lg border border-gray-200 border-l-4 px-3 py-2.5 space-y-1 bg-gray-50/50',
                    color,
                  )}
                >
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                    {label}
                    {required && <span className="text-red-500 ml-0.5">*</span>}
                  </p>
                  <Input
                    type="time"
                    value={form[key]}
                    onChange={(e) => set(key, e.target.value)}
                    className="h-8 font-mono text-sm border-0 bg-transparent p-0 focus-visible:ring-0 shadow-none"
                    required={required}
                  />
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="pt-1">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending} className="flex-1">
              취소
            </Button>
            <Button type="submit" disabled={isPending} className="flex-1 bg-nav-bg hover:bg-nav-bg/90">
              {isPending ? '저장 중...' : mode === 'create' ? '추가하기' : '저장하기'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── 삭제 확인 ─────────────────────────────────────────────────────────────────

function DeleteDialog({
  open,
  record,
  isPending,
  onConfirm,
  onClose,
}: {
  open: boolean;
  record: DailySummary | null;
  isPending: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  if (!record) return null;
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm p-0 overflow-hidden">
        <div className="bg-red-500 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Trash2 className="size-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-white font-semibold">근태 기록 삭제</DialogTitle>
              <p className="text-red-100 text-xs mt-0.5">이 작업은 되돌릴 수 없습니다</p>
            </div>
          </div>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3 space-y-1">
            <p className="text-xs text-gray-400">삭제 대상</p>
            <p className="font-semibold text-gray-900">{record.user_name}</p>
            <p className="text-sm text-gray-500">{fmtDate(record.work_date)} 근무 기록</p>
          </div>
          <p className="text-xs text-red-500 flex items-start gap-1.5">
            <AlertCircle className="size-3.5 shrink-0 mt-0.5" />
            삭제 후 해당 월 급여가 자동으로 재계산됩니다.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={isPending} className="flex-1">
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={onConfirm}
              disabled={isPending}
              className="flex-1"
            >
              {isPending ? '삭제 중...' : '삭제 확인'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────

export default function AttendanceManager() {
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [nameFilter, setNameFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [positionFilter, setPositionFilter] = useState<PositionFilter>('all');
  const [uploadResult, setUploadResult] = useState<BulkImportResult | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<DailySummary | null>(null);
  const [deleteRecord, setDeleteRecord] = useState<DailySummary | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  // ── 데이터 페치 ────────────────────────────────────────────────────────────

  const { data, isLoading } = useQuery<MonthlyAttendanceResponse>({
    queryKey: ['attendance', 'monthly', year, month],
    queryFn: () => apiClient.get({ url: '/api/workstatus/admin/monthly', params: { year, month } }),
  });

  // 직원 목록: admin/users로 active 직원 전체 조회
  // UserManagement와 동일한 훅 사용 (이미 작동 검증됨)
  const { data: usersData, isLoading: isUsersLoading } = useAdminUsersQuery({ limit: 100 });

  // 재직중(is_active=true) + 시스템 계정 제외
  const employees = useMemo(
    () => (usersData?.items ?? []).filter((u) => u.is_active && u.position !== '시스템'),
    [usersData],
  );

  // ── Mutations ──────────────────────────────────────────────────────────────

  const invalidate = () =>
    void qc.invalidateQueries({ queryKey: ['attendance', 'monthly', year, month] });

  const { mutate: createRecord, isPending: isCreating } = useMutation({
    mutationFn: (v: RecordFormValues) =>
      apiClient.post({
        url: '/api/workstatus/admin/record',
        data: {
          user_id: v.user_id,
          work_date: v.work_date,
          check_in: v.check_in || null,
          break_start: v.break_start || null,
          break_end: v.break_end || null,
          check_out: v.check_out || null,
        },
      }),
    onSuccess: () => {
      toast.success('근태 기록이 추가되었습니다.');
      setCreateOpen(false);
      invalidate();
    },
    onError: () => toast.error('추가에 실패했습니다.'),
  });

  const { mutate: updateRecord, isPending: isUpdating } = useMutation({
    mutationFn: ({ r, v }: { r: DailySummary; v: RecordFormValues }) =>
      apiClient.patch({
        url: `/api/workstatus/admin/record/${r.user_id}/${r.work_date}`,
        data: {
          check_in: v.check_in || null,
          break_start: v.break_start || null,
          break_end: v.break_end || null,
          check_out: v.check_out || null,
        },
      }),
    onSuccess: () => {
      toast.success('근태 기록이 수정되었습니다.');
      setEditRecord(null);
      invalidate();
    },
    onError: () => toast.error('수정에 실패했습니다.'),
  });

  const { mutate: deleteRecordMutation, isPending: isDeleting } = useMutation({
    mutationFn: (r: DailySummary) =>
      apiClient.delete({ url: `/api/workstatus/admin/record/${r.user_id}/${r.work_date}` }),
    onSuccess: () => {
      toast.success('근태 기록이 삭제되었습니다.');
      setDeleteRecord(null);
      invalidate();
    },
    onError: () => toast.error('삭제에 실패했습니다.'),
  });

  const { mutate: uploadExcel, isPending: isUploading } = useMutation<BulkImportResult, Error, File>({
    mutationFn: async (file) => {
      const fd = new FormData();
      fd.append('file', file);
      return apiClient.post({ url: '/api/workstatus/admin/bulk-import', data: fd, headers: { 'Content-Type': undefined } });
    },
    onSuccess: (r) => {
      void qc.invalidateQueries({ queryKey: ['attendance'] });
      setUploadResult(r);
      r.error_count === 0
        ? toast.success(`${r.success_count}건 등록 완료`)
        : toast.warning(`${r.success_count}건 성공, ${r.error_count}건 오류`);
    },
    onError: () => toast.error('업로드에 실패했습니다.'),
  });

  // ── 이벤트 핸들러 ──────────────────────────────────────────────────────────

  const downloadTemplate = async () => {
    const base = (import.meta.env.VITE_BASE_URL as string | undefined) ?? '';
    const token = useAuthStore.getState().accessToken;
    const res = await fetch(`${base}/api/workstatus/admin/template`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const url = URL.createObjectURL(await res.blob());
    Object.assign(document.createElement('a'), { href: url, download: 'attendance_template.xlsx' }).click();
    URL.revokeObjectURL(url);
    toast.success('양식 다운로드 완료');
  };

  const [isExporting, setIsExporting] = useState(false);
  const downloadExcel = async () => {
    setIsExporting(true);
    try {
      const base = (import.meta.env.VITE_BASE_URL as string | undefined) ?? '';
      const token = useAuthStore.getState().accessToken;
      const res = await fetch(
        `${base}/api/workstatus/admin/export?year=${year}&month=${month}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) throw new Error();
      const url = URL.createObjectURL(await res.blob());
      Object.assign(document.createElement('a'), {
        href: url,
        download: `attendance_${year}_${String(month).padStart(2, '0')}.xlsx`,
      }).click();
      URL.revokeObjectURL(url);
      toast.success('엑셀 다운로드 완료');
    } catch {
      toast.error('다운로드에 실패했습니다.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.xlsx')) { toast.error('.xlsx 파일만 업로드 가능합니다.'); e.target.value = ''; return; }
    if (file.size > 10 * 1024 * 1024) { toast.error('10MB 이하 파일만 가능합니다.'); e.target.value = ''; return; }
    setUploadResult(null);
    uploadExcel(file);
    e.target.value = '';
  };

  // ── 파생 데이터 ────────────────────────────────────────────────────────────

  const allRecords = data?.records ?? [];

  const filtered = useMemo(() => allRecords.filter((r) => {
    const matchName = !nameFilter || (r.user_name ?? '').toLowerCase().includes(nameFilter.toLowerCase());
    const matchStatus =
      statusFilter === 'all' ||
      (statusFilter === 'complete' && !!r.check_out) ||
      (statusFilter === 'incomplete' && !r.check_out);
    const matchPosition = positionFilter === 'all' || r.position === positionFilter;
    return matchName && matchStatus && matchPosition;
  }), [allRecords, nameFilter, statusFilter, positionFilter]);

  const byUser = filtered.reduce<Record<number, DailySummary[]>>((acc, r) => {
    (acc[r.user_id] ??= []).push(r);
    return acc;
  }, {});

  const userIds = Object.keys(byUser)
    .map(Number)
    .sort((a, b) => {
      const nameA = byUser[a]?.[0]?.user_name ?? '';
      const nameB = byUser[b]?.[0]?.user_name ?? '';
      return nameA.localeCompare(nameB, 'ko');
    });
  const totalH = filtered.reduce((s, r) => s + (r.total_work_hours ?? 0), 0);
  const completed = filtered.filter((r) => !!r.check_out).length;
  const incomplete = filtered.length - completed;
  const COL_SPAN = 11;

  return (
    <div className="space-y-5">
      {/* ── 통계 카드 ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <StatCard
          label="조회 직원 수"
          value={`${Object.keys(byUser).length}명`}
          icon={<Users className="size-5 text-indigo-600" />}
          iconBg="bg-indigo-50"
        />
        <StatCard
          label="총 근무 시간"
          value={`${totalH.toFixed(1)}h`}
          icon={<Activity className="size-5 text-sky-600" />}
          iconBg="bg-sky-50"
          sub={`${filtered.length}건 기록`}
        />
        <StatCard
          label="완료"
          value={`${completed}건`}
          icon={<CalendarCheck2 className="size-5 text-emerald-600" />}
          iconBg="bg-emerald-50"
        />
        <StatCard
          label="미완료"
          value={`${incomplete}건`}
          icon={<ClipboardX className="size-5 text-amber-600" />}
          iconBg={incomplete > 0 ? 'bg-amber-50' : 'bg-gray-50'}
        />
      </div>

      {/* ── 컨트롤 바 ─────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
        <div className="flex flex-wrap gap-3 items-center justify-between">
          {/* 왼쪽: 기간 + 검색 + 상태 필터 */}
          <div className="flex flex-wrap items-center gap-2">
            {/* 연/월 선택 */}
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5">
              <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                <SelectTrigger size="sm" className="w-[78px] border-0 bg-transparent shadow-none h-7 p-0 text-sm font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {YEARS.map((y) => <SelectItem key={y} value={String(y)}>{y}년</SelectItem>)}
                </SelectContent>
              </Select>
              <span className="text-gray-300 text-sm">/</span>
              <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                <SelectTrigger size="sm" className="w-[60px] border-0 bg-transparent shadow-none h-7 p-0 text-sm font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m) => <SelectItem key={m} value={String(m)}>{m}월</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* 이름 검색 */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-gray-400" />
              <Input
                placeholder="이름 검색..."
                value={nameFilter}
                onChange={(e) => setNameFilter(e.target.value)}
                className="pl-8 h-9 w-[150px] text-sm bg-gray-50 border-gray-200"
              />
            </div>

            {/* 직급 필터 */}
            <Select value={positionFilter} onValueChange={(v) => setPositionFilter(v as PositionFilter)}>
              <SelectTrigger size="sm" className="h-9 w-[100px] text-sm bg-gray-50 border-gray-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 직급</SelectItem>
                <SelectItem value="관리자">관리자</SelectItem>
                <SelectItem value="리더">리더</SelectItem>
                <SelectItem value="크루">크루</SelectItem>
                <SelectItem value="미화">미화</SelectItem>
              </SelectContent>
            </Select>

            {/* 상태 탭 */}
            <div className="flex bg-gray-100 rounded-lg p-0.5 gap-0.5">
              {(['all', 'complete', 'incomplete'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={cn(
                    'text-xs px-3 py-1.5 rounded-md font-medium transition-all',
                    statusFilter === s
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700',
                  )}
                >
                  {s === 'all' ? '전체' : s === 'complete' ? '완료' : '미완료'}
                </button>
              ))}
            </div>
          </div>

          {/* 오른쪽: 액션 버튼 */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="gap-1.5 h-9 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="size-3.5" />
              기록 추가
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 h-9 text-emerald-700 border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50"
              onClick={() => void downloadExcel()}
              disabled={isExporting}
            >
              <Download className="size-3.5" />
              {isExporting ? '다운로드 중...' : '엑셀 다운로드'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 h-9 text-gray-600 border-gray-200 hover:border-gray-300"
              onClick={() => void downloadTemplate()}
            >
              <Download className="size-3.5" />
              양식
            </Button>
            <Button
              size="sm"
              className="gap-1.5 h-9 bg-nav-bg hover:bg-nav-bg/90 text-white shadow-sm"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="size-3.5" />
              {isUploading ? '업로드 중...' : '엑셀 등록'}
            </Button>
            <input ref={fileInputRef} type="file" accept=".xlsx" className="hidden" onChange={handleFile} />
          </div>
        </div>
      </div>

      {/* ── 업로드 오류 결과 ──────────────────────────────────────────────── */}
      {uploadResult && uploadResult.error_count > 0 && (
        <div className="rounded-xl border border-red-100 bg-red-50 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="flex items-center gap-1.5 text-red-700 font-semibold text-sm">
              <XCircle className="size-4" /> 업로드 오류 {uploadResult.error_count}건
            </span>
            <button className="text-xs text-red-400 hover:text-red-600" onClick={() => setUploadResult(null)}>닫기</button>
          </div>
          <ul className="space-y-1 max-h-36 overflow-y-auto text-xs text-red-600">
            {uploadResult.errors.map((err, i) => <li key={i}>· {err}</li>)}
          </ul>
        </div>
      )}

      {/* ── 테이블 ──────────────────────────────────────────────────────────── */}
      {isLoading ? (
        <TableSkeleton />
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center py-20 text-gray-400">
          <CalendarCheck2 className="size-12 mb-3 opacity-25" />
          <p className="text-sm font-medium">데이터가 없습니다</p>
          <p className="text-xs mt-1 text-gray-300">기간 또는 필터를 변경해 보세요</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm border-collapse">
              <thead>
                <tr className="bg-nav-bg text-white text-xs">
                  <th className="px-4 py-3.5 text-left font-semibold min-w-[180px]">직원</th>
                  <th className="px-4 py-3.5 text-left font-semibold">근무일</th>
                  <th className="px-4 py-3.5 text-center font-semibold">출근</th>
                  <th className="px-4 py-3.5 text-center font-semibold">휴식시작</th>
                  <th className="px-4 py-3.5 text-center font-semibold">휴식종료</th>
                  <th className="px-4 py-3.5 text-center font-semibold">퇴근</th>
                  <th className="px-4 py-3.5 text-right font-semibold">총근무</th>
                  <th className="px-4 py-3.5 text-right font-semibold">주간</th>
                  <th className="px-4 py-3.5 text-right font-semibold">야간</th>
                  <th className="px-4 py-3.5 text-center font-semibold w-16">상태</th>
                  <th className="px-4 py-3.5 text-center font-semibold w-16">관리</th>
                </tr>
              </thead>
              <tbody>
                {userIds.map((uid) => {
                  const rows = byUser[uid] ?? [];
                  const first = rows[0];
                  const avatarCls = getAvatarBg(first?.position ?? '');
                  const badgeCls = getPositionBadgeStyle(first?.position ?? '');

                  return rows.map((r, idx) => {
                    const isFirst = idx === 0;
                    const isLast = idx === rows.length - 1;
                    const done = !!r.check_out;

                    return (
                      <Fragment key={`${r.user_id}-${r.work_date}`}>
                        <tr
                          className={cn(
                            'border-t border-gray-50 transition-colors group',
                            done ? 'hover:bg-gray-50/50' : 'bg-amber-50/30 hover:bg-amber-50/60',
                          )}
                        >
                          {/* 직원 정보: 첫 행에만 표시 */}
                          <td className="px-4 py-3">
                            {isFirst ? (
                              <div className="flex items-center gap-2.5">
                                <div
                                  className={cn(
                                    'size-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0',
                                    avatarCls,
                                  )}
                                >
                                  {(first?.user_name ?? '?').slice(0, 1)}
                                </div>
                                <div>
                                  <p className="font-semibold text-gray-900 leading-none text-sm">
                                    {r.user_name ?? '—'}
                                  </p>
                                  <span
                                    className={cn(
                                      'text-[10px] px-1.5 py-0.5 rounded-full border font-medium mt-0.5 inline-block',
                                      badgeCls,
                                    )}
                                  >
                                    {r.position ?? '—'}
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <div className="pl-[44px] h-full border-l-2 border-gray-100 ml-4" />
                            )}
                          </td>

                          {/* 근무일 */}
                          <td className="px-4 py-3">
                            <span className="font-mono text-xs text-gray-600">{fmtDate(r.work_date)}</span>
                          </td>

                          {/* 출근 */}
                          <td className="px-4 py-3 text-center">
                            <TimeChip value={r.check_in} variant="in" />
                          </td>

                          {/* 휴식 시작 */}
                          <td className="px-4 py-3 text-center">
                            <TimeChip value={r.break_start} variant="break" />
                          </td>

                          {/* 휴식 종료 */}
                          <td className="px-4 py-3 text-center">
                            <TimeChip value={r.break_end} variant="break" />
                          </td>

                          {/* 퇴근 */}
                          <td className="px-4 py-3 text-center">
                            <TimeChip value={r.check_out} variant="out" />
                          </td>

                          {/* 총근무 */}
                          <td className="px-4 py-3 text-right tabular-nums">
                            <span className="font-bold text-sm text-indigo-700">{fmtH(r.total_work_hours)}</span>
                          </td>

                          {/* 주간 */}
                          <td className="px-4 py-3 text-right tabular-nums text-xs text-gray-600">
                            {fmtH(r.day_hours)}
                          </td>

                          {/* 야간 */}
                          <td className="px-4 py-3 text-right tabular-nums text-xs text-indigo-500">
                            {fmtH(r.night_hours)}
                          </td>

                          {/* 상태 */}
                          <td className="px-4 py-3 text-center">
                            {done ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                <CheckCircle2 className="size-3" /> 완료
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                                <Clock className="size-3" /> 진행
                              </span>
                            )}
                          </td>

                          {/* 관리 */}
                          <td className="px-3 py-3 text-center">
                            <div className="flex items-center justify-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => setEditRecord(r)}
                                className="p-1.5 rounded-lg hover:bg-indigo-50 text-gray-400 hover:text-indigo-600 transition-colors"
                                title="수정"
                              >
                                <Pencil className="size-3.5" />
                              </button>
                              <button
                                onClick={() => setDeleteRecord(r)}
                                className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                                title="삭제"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>

                        {isLast && <SubtotalRow records={rows} colSpan={COL_SPAN} />}
                      </Fragment>
                    );
                  });
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── 모달 ─────────────────────────────────────────────────────────────── */}
      <FormModal
        open={createOpen}
        mode="create"
        initial={EMPTY_FORM}
        employees={employees}
        isEmployeesLoading={isUsersLoading}
        isPending={isCreating}
        onSubmit={(v) => createRecord(v)}
        onClose={() => setCreateOpen(false)}
      />

      <FormModal
        open={!!editRecord}
        mode="edit"
        initial={editRecord ? recordToForm(editRecord) : EMPTY_FORM}
        employees={employees}
        isEmployeesLoading={isUsersLoading}
        isPending={isUpdating}
        onSubmit={(v) => editRecord && updateRecord({ r: editRecord, v })}
        onClose={() => setEditRecord(null)}
      />

      <DeleteDialog
        open={!!deleteRecord}
        record={deleteRecord}
        isPending={isDeleting}
        onConfirm={() => deleteRecord && deleteRecordMutation(deleteRecord)}
        onClose={() => setDeleteRecord(null)}
      />
    </div>
  );
}
