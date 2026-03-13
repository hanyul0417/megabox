/**
 * 관리자 근태 관리
 * - 월별 전직원 근태 조회
 * - 엑셀 양식 다운로드
 * - 엑셀 대량 업로드
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, Download, Calendar, Users, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { useState, useRef, Fragment } from 'react';
import { toast } from 'sonner';

import { apiClient } from '@/shared/api/apiClients';
import { Button } from '@/shared/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { cn } from '@/shared/lib/utils';
import { useAuthStore } from '@/shared/model/authStore';

// ── 타입 정의 ──────────────────────────────────────────────────────────────

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

// ── 상수 ──────────────────────────────────────────────────────────────────

const POSITION_COLOR: Record<string, string> = {
  관리자: 'bg-purple-100 text-purple-700',
  리더: 'bg-blue-100 text-blue-700',
  크루: 'bg-green-100 text-green-700',
  미화: 'bg-orange-100 text-orange-700',
};

const DAY_LABEL = ['일', '월', '화', '수', '목', '금', '토'] as const;

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - i);

// ── 유틸 함수 ──────────────────────────────────────────────────────────────

function fmtTime(t: string | null): { text: string; missing: boolean } {
  if (!t) return { text: '미기록', missing: true };
  return { text: t.slice(0, 5), missing: false };
}

function fmtH(h: number | null): string {
  if (h == null) return '-';
  return `${h.toFixed(2)}h`;
}

/** "YYYY-MM-DD" → "MM-DD (요일)" */
function fmtDate(dateStr: string): string {
  const date = new Date(dateStr);
  const mmdd = dateStr.slice(5); // "MM-DD"
  const day = DAY_LABEL[date.getDay()];
  return `${mmdd} (${day})`;
}

// ── 서브 컴포넌트 ──────────────────────────────────────────────────────────

type SummaryCardProps = {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  accent?: 'default' | 'green' | 'amber' | 'red';
};

function SummaryCard({ icon, label, value, accent = 'default' }: SummaryCardProps) {
  const accentClass: Record<string, string> = {
    default: 'text-gray-700',
    green: 'text-green-600',
    amber: 'text-amber-500',
    red: 'text-red-500',
  };
  return (
    <div className="rounded-xl border border-gray-100 bg-white px-4 py-3.5 shadow-sm flex items-center gap-3">
      <div className="shrink-0 text-gray-400">{icon}</div>
      <div>
        <p className="text-xs text-gray-500 mb-0.5">{label}</p>
        <p className={cn('text-xl font-bold leading-none', accentClass[accent])}>{value}</p>
      </div>
    </div>
  );
}

/** 스켈레톤 — 6행 × 10열 */
function TableSkeleton() {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm">
      <table className="w-full min-w-[900px] text-sm">
        <thead>
          <tr className="bg-nav-bg">
            {Array.from({ length: 10 }).map((_, i) => (
              <th key={i} className="px-4 py-3">
                <div className="h-3 w-14 rounded bg-white/20 animate-pulse" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 6 }).map((_, row) => (
            <tr key={row} className="border-t border-gray-50">
              {Array.from({ length: 10 }).map((_, col) => (
                <td key={col} className="px-4 py-3">
                  <div className="h-3 rounded bg-gray-100 animate-pulse" style={{ width: `${50 + ((row + col) % 3) * 15}%` }} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** 직원별 소계 행 */
type SubtotalRowProps = {
  records: DailySummary[];
  colSpan: number;
};

function SubtotalRow({ records, colSpan }: SubtotalRowProps) {
  const totalDays = records.length;
  const totalH = records.reduce((s, r) => s + (r.total_work_hours ?? 0), 0);
  const dayH = records.reduce((s, r) => s + (r.day_hours ?? 0), 0);
  const nightH = records.reduce((s, r) => s + (r.night_hours ?? 0), 0);

  return (
    <tr className="border-t border-gray-200 bg-gray-50">
      <td colSpan={colSpan} className="px-4 py-2 text-xs text-gray-500 font-medium">
        <span className="inline-flex flex-wrap gap-3">
          <span>총 근무일 <strong className="text-gray-700">{totalDays}일</strong></span>
          <span>·</span>
          <span>총 <strong className="text-mega">{totalH.toFixed(2)}h</strong></span>
          <span>·</span>
          <span>주간 <strong className="text-gray-700">{dayH.toFixed(2)}h</strong></span>
          <span>·</span>
          <span>야간 <strong className="text-indigo-600">{nightH.toFixed(2)}h</strong></span>
        </span>
      </td>
    </tr>
  );
}

// ── 메인 컴포넌트 ──────────────────────────────────────────────────────────

export default function AttendanceManager() {
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // 서버 상태
  const { data, isLoading } = useQuery<MonthlyAttendanceResponse>({
    queryKey: ['attendance', 'monthly', year, month],
    queryFn: () => apiClient.get({ url: '/api/workstatus/admin/monthly', params: { year, month } }),
  });

  const { mutate: uploadExcel, isPending: isUploading } = useMutation<BulkImportResult, Error, File>({
    mutationFn: async (file) => {
      const formData = new FormData();
      formData.append('file', file);
      return apiClient.post({ url: '/api/workstatus/admin/bulk-import', data: formData });
    },
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ['attendance'] });
      if (result.error_count === 0) {
        toast.success(`${result.success_count}건 등록 완료`);
      } else {
        toast.warning(`${result.success_count}건 성공, ${result.error_count}건 오류`);
      }
    },
    onError: () => toast.error('업로드에 실패했습니다.'),
  });

  // 이벤트 핸들러
  const handleDownloadTemplate = async () => {
    const baseUrl = (import.meta.env.VITE_BASE_URL as string | undefined) ?? '';
    const token = useAuthStore.getState().accessToken;
    const res = await fetch(`${baseUrl}/api/workstatus/admin/template`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'attendance_template.xlsx';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('양식 다운로드 완료');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadExcel(file);
    e.target.value = '';
  };

  // 파생 데이터
  const records = data?.records ?? [];

  const byUser = records.reduce<Record<number, DailySummary[]>>((acc, r) => {
    acc[r.user_id] = acc[r.user_id] ?? [];
    acc[r.user_id].push(r);
    return acc;
  }, {});

  const totalEmployees = Object.keys(byUser).length;
  const totalRecords = records.length;
  const completedCount = records.filter((r) => !!r.check_out).length;
  const incompleteCount = totalRecords - completedCount;

  // 테이블 행 렌더링 — 직원별 소계 삽입
  const userIds = Object.keys(byUser).map(Number);

  return (
    <div className="space-y-5">

      {/* ── 요약 카드 4개 ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryCard
          icon={<Users className="size-5" />}
          label="총 직원 수"
          value={`${totalEmployees}명`}
        />
        <SummaryCard
          icon={<Calendar className="size-5" />}
          label="총 근무 기록"
          value={`${totalRecords}건`}
        />
        <SummaryCard
          icon={<CheckCircle2 className="size-5 text-green-500" />}
          label="완료 기록"
          value={`${completedCount}건`}
          accent="green"
        />
        <SummaryCard
          icon={<Clock className="size-5 text-amber-400" />}
          label="미완료 기록"
          value={`${incompleteCount}건`}
          accent={incompleteCount > 0 ? 'amber' : 'default'}
        />
      </div>

      {/* ── 필터 + 액션 ── */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        {/* 연도/월 선택 */}
        <div className="flex items-center gap-2 flex-wrap">
          <Select
            value={String(year)}
            onValueChange={(v) => setYear(Number(v))}
          >
            <SelectTrigger size="sm" className="w-[90px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {YEARS.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}년
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={String(month)}
            onValueChange={(v) => setMonth(Number(v))}
          >
            <SelectTrigger size="sm" className="w-[80px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m) => (
                <SelectItem key={m} value={String(m)}>
                  {m}월
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 액션 버튼 */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-mega border-mega/30 hover:bg-mega/5"
            onClick={() => void handleDownloadTemplate()}
          >
            <Download className="size-4" />
            양식 다운로드
          </Button>
          <Button
            size="sm"
            className="gap-2 bg-mega hover:bg-mega-hover text-white"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="size-4" />
            {isUploading ? '업로드 중...' : '엑셀 등록'}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </div>

      {/* ── 안내 배너 ── */}
      <div className="flex items-start gap-3 p-3.5 rounded-xl bg-blue-50 border border-blue-100 text-sm text-blue-700">
        <AlertCircle className="size-4 mt-0.5 shrink-0" />
        <p>
          엑셀 양식을 다운로드하여 근태 데이터를 입력 후 업로드하면 자동으로 등록됩니다.
          같은 날짜의 기존 기록은 덮어씌워집니다.
        </p>
      </div>

      {/* ── 테이블 영역 ── */}
      {isLoading ? (
        <TableSkeleton />
      ) : records.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <Calendar className="size-10 mb-3 opacity-40" />
          <p className="text-sm">해당 기간의 근태 데이터가 없습니다.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="bg-nav-bg text-white text-xs">
                <th className="px-3 py-3 text-center font-semibold w-10">상태</th>
                <th className="px-4 py-3 text-left font-semibold">직원명</th>
                <th className="px-4 py-3 text-left font-semibold">직급</th>
                <th className="px-4 py-3 text-left font-semibold">근무일</th>
                <th className="px-4 py-3 text-center font-semibold">출근</th>
                <th className="px-4 py-3 text-center font-semibold">휴식시작</th>
                <th className="px-4 py-3 text-center font-semibold">휴식종료</th>
                <th className="px-4 py-3 text-center font-semibold">퇴근</th>
                <th className="px-4 py-3 text-right font-semibold">총근무</th>
                <th className="px-4 py-3 text-right font-semibold">주간</th>
                <th className="px-4 py-3 text-right font-semibold">야간</th>
              </tr>
            </thead>
            <tbody>
              {userIds.map((uid) => {
                const userRecords = byUser[uid] ?? [];
                const colSpan = 11;

                return userRecords.map((r, idx) => {
                  const isComplete = !!r.check_out;
                  const posColor =
                    POSITION_COLOR[r.position ?? ''] ?? 'bg-gray-100 text-gray-600';
                  const checkIn = fmtTime(r.check_in);
                  const breakStart = fmtTime(r.break_start);
                  const breakEnd = fmtTime(r.break_end);
                  const checkOut = fmtTime(r.check_out);
                  const isLastRow = idx === userRecords.length - 1;

                  return (
                    <Fragment key={`${r.user_id}-${r.work_date}-${idx}`}>
                      <tr
                        className={cn(
                          'border-t border-gray-50 transition-colors',
                          isComplete
                            ? 'hover:bg-gray-50/60'
                            : 'bg-amber-50/40 hover:bg-amber-50/70',
                        )}
                      >
                        {/* 상태 인디케이터 */}
                        <td className="px-3 py-3 text-center">
                          {isComplete ? (
                            <CheckCircle2 className="size-4 text-green-500 mx-auto" />
                          ) : (
                            <Clock className="size-4 text-amber-400 mx-auto" />
                          )}
                        </td>

                        {/* 직원명 */}
                        <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                          {r.user_name ?? '-'}
                        </td>

                        {/* 직급 badge */}
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              'inline-block text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap',
                              posColor,
                            )}
                          >
                            {r.position ?? '-'}
                          </span>
                        </td>

                        {/* 근무일 + 요일 */}
                        <td className="px-4 py-3 text-gray-600 font-mono text-xs whitespace-nowrap">
                          {fmtDate(r.work_date)}
                        </td>

                        {/* 출근 */}
                        <td className="px-4 py-3 text-center font-mono text-xs">
                          <span
                            className={cn(
                              'font-semibold',
                              checkIn.missing ? 'text-red-500' : 'text-green-700',
                            )}
                          >
                            {checkIn.text}
                          </span>
                        </td>

                        {/* 휴식시작 */}
                        <td className="px-4 py-3 text-center font-mono text-xs">
                          <span
                            className={cn(
                              breakStart.missing ? 'text-gray-400' : 'text-amber-600',
                            )}
                          >
                            {breakStart.missing ? '-' : breakStart.text}
                          </span>
                        </td>

                        {/* 휴식종료 */}
                        <td className="px-4 py-3 text-center font-mono text-xs">
                          <span
                            className={cn(
                              breakEnd.missing ? 'text-gray-400' : 'text-amber-600',
                            )}
                          >
                            {breakEnd.missing ? '-' : breakEnd.text}
                          </span>
                        </td>

                        {/* 퇴근 */}
                        <td className="px-4 py-3 text-center font-mono text-xs">
                          <span
                            className={cn(
                              'font-semibold',
                              checkOut.missing ? 'text-red-500' : 'text-red-600',
                            )}
                          >
                            {checkOut.text}
                          </span>
                        </td>

                        {/* 총근무 */}
                        <td className="px-4 py-3 text-right font-bold text-mega tabular-nums">
                          {fmtH(r.total_work_hours)}
                        </td>

                        {/* 주간 */}
                        <td className="px-4 py-3 text-right text-gray-600 tabular-nums">
                          {fmtH(r.day_hours)}
                        </td>

                        {/* 야간 */}
                        <td className="px-4 py-3 text-right text-indigo-600 tabular-nums">
                          {fmtH(r.night_hours)}
                        </td>
                      </tr>

                      {/* 직원별 소계 행 — 마지막 행 다음에만 삽입 */}
                      {isLastRow && (
                        <SubtotalRow
                          records={userRecords}
                          colSpan={colSpan}
                        />
                      )}
                    </Fragment>
                  );
                });
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
