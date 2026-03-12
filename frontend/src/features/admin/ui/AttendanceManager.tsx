/**
 * 관리자 근태 관리
 * - 월별 전직원 근태 조회
 * - 엑셀 양식 다운로드
 * - 엑셀 대량 업로드
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, Download, Calendar, Users, AlertCircle } from 'lucide-react';
import { useState, useRef } from 'react';
import { toast } from 'sonner';

import { apiClient } from '@/shared/api/apiClients';
import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/lib/utils';

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

const POSITION_LABEL: Record<string, string> = {
  관리자: '관리자',
  리더: '리더',
  크루: '크루',
  미화: '미화',
};

const POSITION_COLOR: Record<string, string> = {
  관리자: 'bg-purple-100 text-purple-700',
  리더: 'bg-blue-100 text-blue-700',
  크루: 'bg-green-100 text-green-700',
  미화: 'bg-orange-100 text-orange-700',
};

function fmtTime(t: string | null): string {
  if (!t) return '-';
  return t.slice(0, 5);
}

function fmtH(h: number | null): string {
  if (h == null) return '-';
  return `${h.toFixed(2)}h`;
}

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - i);

export default function AttendanceManager() {
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<MonthlyAttendanceResponse>({
    queryKey: ['attendance', 'monthly', year, month],
    queryFn: () => apiClient.get({ url: '/api/workstatus/admin/monthly', params: { year, month } }),
  });

  const { mutate: uploadExcel, isPending: isUploading } = useMutation<
    BulkImportResult,
    Error,
    File
  >({
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

  const handleDownloadTemplate = async () => {
    const baseUrl = (import.meta.env.VITE_BASE_URL as string | undefined) ?? '';
    const stored = JSON.parse(localStorage.getItem('auth-storage') ?? '{}') as {
      state?: { accessToken?: string };
    };
    const token = stored.state?.accessToken;
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

  const records = data?.records ?? [];

  // 직원별 그룹핑 (요약 표시용)
  const byUser = records.reduce<Record<number, DailySummary[]>>((acc, r) => {
    acc[r.user_id] = acc[r.user_id] ?? [];
    acc[r.user_id].push(r);
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      {/* ── 필터 + 액션 ── */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2">
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="h-9 rounded-lg border border-gray-200 px-3 text-sm bg-white focus:ring-2 focus:ring-mega/30 focus:outline-none"
          >
            {YEARS.map((y) => (
              <option key={y} value={y}>
                {y}년
              </option>
            ))}
          </select>
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="h-9 rounded-lg border border-gray-200 px-3 text-sm bg-white focus:ring-2 focus:ring-mega/30 focus:outline-none"
          >
            {MONTHS.map((m) => (
              <option key={m} value={m}>
                {m}월
              </option>
            ))}
          </select>
          {!isLoading && (
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <Users className="size-3.5" />
              {Object.keys(byUser).length}명 / {records.length}건
            </span>
          )}
        </div>

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
          엑셀 양식을 다운로드하여 근태 데이터를 입력 후 업로드하면 자동으로 등록됩니다. 같은 날짜의
          기존 기록은 덮어씌워집니다.
        </p>
      </div>

      {/* ── 테이블 ── */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-mega border-t-transparent rounded-full animate-spin" />
        </div>
      ) : records.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <Calendar className="size-10 mb-3 opacity-40" />
          <p className="text-sm">해당 기간의 근태 데이터가 없습니다.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm">
          <table className="w-full min-w-[800px] text-sm">
            <thead>
              <tr className="bg-nav-bg text-white text-xs">
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
              {records.map((r, idx) => {
                const posLabel = POSITION_LABEL[r.position ?? ''] ?? r.position ?? '';
                const posColor = POSITION_COLOR[r.position ?? ''] ?? 'bg-gray-100 text-gray-600';
                const isComplete = !!r.check_out;

                return (
                  <tr
                    key={`${r.user_id}-${r.work_date}-${idx}`}
                    className={cn(
                      'border-t border-gray-50 hover:bg-gray-50/50 transition-colors',
                      !isComplete && 'bg-amber-50/30',
                    )}
                  >
                    <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                      {r.user_name ?? '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn('text-xs px-2 py-0.5 rounded-full font-medium', posColor)}
                      >
                        {posLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 font-mono text-xs">{r.work_date}</td>
                    <td className="px-4 py-3 text-center font-mono text-xs text-green-700 font-semibold">
                      {fmtTime(r.check_in)}
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-xs text-amber-600">
                      {fmtTime(r.break_start)}
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-xs text-amber-600">
                      {fmtTime(r.break_end)}
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-xs text-red-600 font-semibold">
                      {fmtTime(r.check_out)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-mega">
                      {fmtH(r.total_work_hours)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">{fmtH(r.day_hours)}</td>
                    <td className="px-4 py-3 text-right text-indigo-600">{fmtH(r.night_hours)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
