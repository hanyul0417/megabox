/**
 * 관리자 전직원 급여 관리
 * - 데스크톱(lg+): 테이블 + 인라인 편집
 * - 모바일(<lg): 카드 리스트 + 아코디언 상세
 * - 체크박스 선택 → 선택 발송 / 선택 다운로드
 * - 엑셀 다운로드
 * - SSN 마스킹 없음 (관리자 전용)
 */
import {
  AlertTriangle,
  Check,
  Download,
  Edit2,
  Mail,
  RefreshCw,
  Send,
  Trash2,
  X,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';

import {
  useDeletePayrollMutation,
  useExportPayrollMutation,
  useRecalculatePayrollMutation,
  useSendPayrollEmailBulkMutation,
  useSendPayrollEmailMutation,
  useUpdatePayrollMutation,
} from '../api/queries';

import { sendPayrollEmail } from '../api/service';

import type { PayrollUpdateRequest } from '../api/dto';
import type { PayrollData } from '../model/type';

import { apiClient } from '@/shared/api/apiClients';
import { Button } from '@/shared/components/ui/button';
import { Checkbox } from '@/shared/components/ui/checkbox';
import ConfirmDialog from '@/shared/components/ui/confirm-dialog';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { cn } from '@/shared/lib/utils';
import { useAuthStore } from '@/shared/model/authStore';

const SENT_MONTHS_KEY = 'payroll_sent_months';

function getSentMonths(): Set<string> {
  try {
    const raw = localStorage.getItem(SENT_MONTHS_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function saveSentMonths(set: Set<string>) {
  localStorage.setItem(SENT_MONTHS_KEY, JSON.stringify([...set]));
}

interface Props {
  data: PayrollData[];
  year: number;
  month: number;
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
  크루: 'bg-indigo-100 text-indigo-700',
  미화: 'bg-emerald-100 text-emerald-700',
};

function fmt(n: number | null | undefined): string {
  if (n == null || n === 0) return '-';
  return n.toLocaleString();
}

// ── 편집 가능한 숫자 셀 ──────────────────────────────────────────
interface EditableCellProps {
  value: number;
  isEditing: boolean;
  fieldKey: string;
  editValues: Partial<PayrollUpdateRequest>;
  onChange: (key: string, val: number) => void;
}

function EditableCell({ value, isEditing, fieldKey, editValues, onChange }: EditableCellProps) {
  const current =
    (editValues[fieldKey as keyof PayrollUpdateRequest] as number | undefined) ?? value;

  if (!isEditing) {
    return <span className="tabular-nums">{fmt(value)}</span>;
  }

  return (
    <Input
      type="number"
      value={current}
      onChange={(e) => onChange(fieldKey, Number(e.target.value))}
      className="w-24 h-7 text-xs text-center px-1"
    />
  );
}

// ── 상세 패널 (테이블/카드 공용) ─────────────────────────────────
interface DetailPanelProps {
  row: PayrollData;
  isEditing: boolean;
  editValues: Partial<PayrollUpdateRequest>;
  onChange: (key: string, val: number) => void;
}

function DetailPanel({ row, isEditing, editValues, onChange }: DetailPanelProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
      {/* 시간 항목 */}
      <div className="bg-white rounded-xl p-4 border border-gray-100">
        <p className="text-xs font-bold text-mega uppercase tracking-wide mb-3">근무 시간</p>
        <div className="space-y-2">
          {(
            [
              ['day_hours', '주간시간', row.day_hours],
              ['night_hours', '야간시간', row.night_hours],
              ['weekly_allowance_hours', '주휴시간', row.weekly_allowance_hours],
              ['annual_leave_hours', '연차시간', row.annual_leave_hours],
              ['holiday_hours', '공휴일시간', row.holiday_hours],
              ['labor_day_hours', '근로자의날', row.labor_day_hours],
            ] as [string, string, number][]
          ).map(([key, label, val]) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-gray-500">{label}</span>
              <EditableCell
                value={val}
                isEditing={isEditing}
                fieldKey={key}
                editValues={editValues}
                onChange={onChange}
              />
            </div>
          ))}
        </div>
      </div>

      {/* 급여 항목 */}
      <div className="bg-white rounded-xl p-4 border border-gray-100">
        <p className="text-xs font-bold text-mega uppercase tracking-wide mb-3">급여 항목</p>
        <div className="space-y-2">
          {(
            [
              ['day_wage', '주간급여', row.day_wage],
              ['night_wage', '야간급여', row.night_wage],
              ['weekly_allowance_pay', '주휴수당', row.weekly_allowance_pay],
              ['holiday_pay', '공휴일수당', row.holiday_pay],
              ['labor_day_pay', '근로자의날수당', row.labor_day_pay],
            ] as [string, string, number][]
          ).map(([key, label, val]) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-gray-500">{label}</span>
              <span className="text-mega font-medium tabular-nums">{fmt(val)}</span>
            </div>
          ))}
          {/* 연차수당 — 직접 수정 가능 */}
          <div className="flex items-center justify-between">
            <span className="text-gray-500">
              연차수당
              {isEditing && (
                <span className="ml-1 text-[10px] text-amber-500">(직접입력)</span>
              )}
            </span>
            <EditableCell
              value={row.annual_leave_pay}
              isEditing={isEditing}
              fieldKey="annual_leave_pay"
              editValues={editValues}
              onChange={onChange}
            />
          </div>
          <div className="flex items-center justify-between border-t pt-2 mt-2">
            <span className="font-semibold text-gray-700">급여총액</span>
            <span className="font-bold text-mega tabular-nums">
              {row.gross_pay.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* 공제 항목 */}
      <div className="bg-white rounded-xl p-4 border border-gray-100">
        <p className="text-xs font-bold text-red-500 uppercase tracking-wide mb-3">공제 항목</p>
        <div className="space-y-2">
          {(
            [
              ['insurance_health', '건강보험', row.insurance_health],
              ['insurance_care', '요양보험', row.insurance_care],
              ['insurance_employment', '고용보험', row.insurance_employment],
              ['insurance_pension', '국민연금', row.insurance_pension],
            ] as [string, string, number][]
          ).map(([key, label, val]) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-gray-500">{label}</span>
              <EditableCell
                value={val}
                isEditing={isEditing}
                fieldKey={key}
                editValues={editValues}
                onChange={onChange}
              />
            </div>
          ))}
          <div className="border-t pt-2 mt-2 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-700">공제계</span>
              <span className="font-bold text-red-600 tabular-nums">
                {row.total_deduction.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-700">실수령액</span>
              <span className="font-bold text-emerald-700 tabular-nums text-base">
                {row.net_pay.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 데스크톱 테이블 행 ───────────────────────────────────────────
interface RowProps {
  row: PayrollData;
  year: number;
  month: number;
  checked: boolean;
  onToggle: (payrollId: number) => void;
  onSave: (payrollId: number, changes: PayrollUpdateRequest) => void;
  onDelete: (payrollId: number) => void;
  onSendEmail: (payrollId: number) => void;
  isSendingEmail: boolean;
}

function PayrollRow({ row, checked, onToggle, onSave, onDelete, onSendEmail, isSendingEmail }: RowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [editValues, setEditValues] = useState<Partial<PayrollUpdateRequest>>({});
  const [deleteOpen, setDeleteOpen] = useState(false);

  const handleEdit = () => {
    setEditValues({});
    setIsEditing(true);
    setExpanded(true);
  };

  const handleCancel = () => {
    setEditValues({});
    setIsEditing(false);
  };

  const handleSave = () => {
    if (Object.keys(editValues).length === 0) {
      setIsEditing(false);
      return;
    }
    onSave(row.payroll_id, editValues);
    setIsEditing(false);
  };

  const handleChange = (key: string, val: number) => {
    setEditValues((prev) => ({ ...prev, [key]: val }));
  };

  const posLabel = POSITION_LABEL[row.position ?? ''] ?? row.position ?? '';
  const posColor = POSITION_COLOR[row.position ?? ''] ?? 'bg-gray-100 text-gray-600';

  return (
    <>
      {/* ── 메인 행 ── */}
      <tr
        className={cn(
          'border-t border-gray-100 hover:bg-gray-50/50 transition-colors',
          checked && 'bg-blue-50/40',
        )}
      >
        {/* 체크박스 */}
        <td className="px-3 py-3 text-center">
          <Checkbox
            checked={checked}
            onCheckedChange={() => onToggle(row.payroll_id)}
            aria-label={`${row.name} 선택`}
          />
        </td>

        {/* 토글 */}
        <td className="px-2 py-3 text-center">
          <button
            onClick={() => setExpanded((p) => !p)}
            className="text-gray-400 hover:text-gray-600"
          >
            {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          </button>
        </td>

        {/* 기본 정보 */}
        <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">{row.name}</td>
        <td className="px-4 py-3">
          <span className={cn('text-xs font-medium px-2 py-1 rounded-full', posColor)}>
            {posLabel}
          </span>
        </td>
        <td className="px-4 py-3 text-sm font-mono text-gray-700 whitespace-nowrap">
          {row.rrn || '-'}
        </td>
        <td className="px-4 py-3 text-sm text-right text-gray-700">
          {row.total_work_hours.toFixed(2)}h
        </td>
        <td className="px-4 py-3 text-sm text-right font-semibold text-mega">
          {row.gross_pay.toLocaleString()}
        </td>
        <td className="px-4 py-3 text-sm text-right text-red-600">
          {row.total_deduction.toLocaleString()}
        </td>
        <td className="px-4 py-3 text-sm text-right font-bold text-emerald-700">
          {row.net_pay.toLocaleString()}
        </td>

        {/* 액션 */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-1.5">
            {isEditing ? (
              <>
                <button
                  onClick={handleSave}
                  className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                >
                  <Check className="size-4" />
                </button>
                <button
                  onClick={handleCancel}
                  className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100"
                >
                  <X className="size-4" />
                </button>
              </>
            ) : (
              <button
                onClick={handleEdit}
                className="p-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200"
              >
                <Edit2 className="size-4" />
              </button>
            )}
            {!isEditing && (
              <>
                <button
                  onClick={() => onSendEmail(row.payroll_id)}
                  disabled={isSendingEmail || !row.email}
                  title={row.email ? `${row.email}로 발송` : '이메일 주소 없음'}
                  className="p-1.5 rounded-lg bg-blue-50 text-blue-500 hover:bg-blue-100 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Mail className="size-4" />
                </button>
                <button
                  onClick={() => setDeleteOpen(true)}
                  className="p-1.5 rounded-lg bg-red-50 text-red-400 hover:bg-red-100"
                  title="내역 삭제"
                >
                  <Trash2 className="size-4" />
                </button>
              </>
            )}
          </div>
        </td>
      </tr>

      {/* ── 확장 행 (상세 편집) ── */}
      {expanded && (
        <tr className="bg-mega-light border-t border-gray-100">
          <td colSpan={11} className="px-6 py-4">
            <DetailPanel
              row={row}
              isEditing={isEditing}
              editValues={editValues}
              onChange={handleChange}
            />
          </td>
        </tr>
      )}

      <ConfirmDialog
        open={deleteOpen}
        title="급여 내역 삭제"
        description={`${row.name}님의 급여 내역을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
        confirmLabel="삭제"
        variant="destructive"
        onConfirm={() => { onDelete(row.payroll_id); setDeleteOpen(false); }}
        onCancel={() => setDeleteOpen(false)}
      />
    </>
  );
}

// ── 모바일 카드 + 아코디언 ───────────────────────────────────────
interface CardProps {
  row: PayrollData;
  year: number;
  month: number;
  checked: boolean;
  onToggle: (payrollId: number) => void;
  onSave: (payrollId: number, changes: PayrollUpdateRequest) => void;
  onDelete: (payrollId: number) => void;
  onSendEmail: (payrollId: number) => void;
  isSendingEmail: boolean;
}

function PayrollCard({
  row,
  checked,
  onToggle,
  onSave,
  onDelete,
  onSendEmail,
  isSendingEmail,
}: CardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [editValues, setEditValues] = useState<Partial<PayrollUpdateRequest>>({});
  const [deleteOpen, setDeleteOpen] = useState(false);

  const handleEdit = () => {
    setEditValues({});
    setIsEditing(true);
    setExpanded(true);
  };

  const handleCancel = () => {
    setEditValues({});
    setIsEditing(false);
  };

  const handleSave = () => {
    if (Object.keys(editValues).length === 0) {
      setIsEditing(false);
      return;
    }
    onSave(row.payroll_id, editValues);
    setIsEditing(false);
  };

  const handleChange = (key: string, val: number) => {
    setEditValues((prev) => ({ ...prev, [key]: val }));
  };

  const posLabel = POSITION_LABEL[row.position ?? ''] ?? row.position ?? '';
  const posColor = POSITION_COLOR[row.position ?? ''] ?? 'bg-gray-100 text-gray-600';

  return (
    <div
      className={cn(
        'bg-white rounded-xl border shadow-sm overflow-hidden transition-colors',
        checked ? 'border-blue-300' : 'border-gray-100',
      )}
    >
      {/* ── 카드 헤더 ── */}
      <div className="flex items-center gap-2 px-4 pt-3.5 pb-1">
        {/* 체크박스 — 클릭 전파 차단 */}
        <div onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={checked}
            onCheckedChange={() => onToggle(row.payroll_id)}
            aria-label={`${row.name} 선택`}
          />
        </div>

        <button
          type="button"
          onClick={() => setExpanded((p) => !p)}
          className="flex-1 flex items-center gap-3 text-left"
        >
          <span className="text-gray-400 shrink-0">
            {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-gray-900 truncate">{row.name}</span>
              <span
                className={cn(
                  'text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0',
                  posColor,
                )}
              >
                {posLabel}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span>근무 {row.total_work_hours.toFixed(1)}h</span>
              <span className="text-gray-300">|</span>
              <span className="font-mono">{row.rrn || '-'}</span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm font-bold text-emerald-700 tabular-nums">
              {row.net_pay.toLocaleString()}
            </p>
            <p className="text-[10px] text-gray-400">실수령액</p>
          </div>
        </button>
      </div>

      {/* ── 요약 수치 바 ── */}
      <div className="grid grid-cols-3 border-t border-gray-100 bg-gray-50/50 mt-1">
        <div className="px-3 py-2.5 text-center border-r border-gray-100">
          <p className="text-[10px] text-gray-400">급여총액</p>
          <p className="text-xs font-semibold text-mega tabular-nums">
            {row.gross_pay.toLocaleString()}
          </p>
        </div>
        <div className="px-3 py-2.5 text-center border-r border-gray-100">
          <p className="text-[10px] text-gray-400">공제계</p>
          <p className="text-xs font-semibold text-red-600 tabular-nums">
            {row.total_deduction.toLocaleString()}
          </p>
        </div>
        <div className="px-3 py-2.5 text-center">
          <p className="text-[10px] text-gray-400">실수령액</p>
          <p className="text-xs font-bold text-emerald-700 tabular-nums">
            {row.net_pay.toLocaleString()}
          </p>
        </div>
      </div>

      {/* ── 아코디언 상세 영역 ── */}
      {expanded && (
        <div className="border-t border-gray-100 bg-mega-light px-4 py-4">
          {/* 편집 버튼 */}
          <div className="flex items-center justify-end gap-1.5 mb-3">
            {isEditing ? (
              <>
                <button
                  onClick={handleSave}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 text-xs font-medium"
                >
                  <Check className="size-3.5" />
                  저장
                </button>
                <button
                  onClick={handleCancel}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 text-xs font-medium"
                >
                  <X className="size-3.5" />
                  취소
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleEdit}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 text-xs font-medium"
                >
                  <Edit2 className="size-3.5" />
                  수정
                </button>
                <button
                  onClick={() => onSendEmail(row.payroll_id)}
                  disabled={isSendingEmail || !row.email}
                  title={row.email ? `${row.email}로 발송` : '이메일 주소 없음'}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-500 hover:bg-blue-100 disabled:opacity-40 text-xs font-medium"
                >
                  <Mail className="size-3.5" />
                  메일발송
                </button>
                <button
                  onClick={() => setDeleteOpen(true)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-50 text-red-400 hover:bg-red-100 text-xs font-medium"
                >
                  <Trash2 className="size-3.5" />
                  삭제
                </button>
              </>
            )}
          </div>

          <DetailPanel
            row={row}
            isEditing={isEditing}
            editValues={editValues}
            onChange={handleChange}
          />
        </div>
      )}

      <ConfirmDialog
        open={deleteOpen}
        title="급여 내역 삭제"
        description={`${row.name}님의 급여 내역을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
        confirmLabel="삭제"
        variant="destructive"
        onConfirm={() => { onDelete(row.payroll_id); setDeleteOpen(false); }}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  );
}

// ── 모바일 합계 카드 ─────────────────────────────────────────────
function MobileTotalCard({ data }: { data: PayrollData[] }) {
  return (
    <div className="bg-nav-bg rounded-xl p-4 text-white">
      <p className="text-xs text-white/50 mb-2 font-semibold">합계 ({data.length}명)</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] text-white/40">총근무시간</p>
          <p className="text-sm font-bold tabular-nums">
            {data.reduce((s, r) => s + r.total_work_hours, 0).toFixed(2)}h
          </p>
        </div>
        <div>
          <p className="text-[10px] text-white/40">급여총액</p>
          <p className="text-sm font-bold tabular-nums text-purple-300">
            {data.reduce((s, r) => s + r.gross_pay, 0).toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-white/40">공제계</p>
          <p className="text-sm font-bold tabular-nums text-red-400">
            {data.reduce((s, r) => s + r.total_deduction, 0).toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-white/40">실수령액</p>
          <p className="text-sm font-bold tabular-nums text-emerald-400">
            {data.reduce((s, r) => s + r.net_pay, 0).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── 선택 액션 바 ─────────────────────────────────────────────────
interface SelectionActionBarProps {
  selectedCount: number;
  isSendingSelected: boolean;
  isExporting: boolean;
  onSendSelected: () => void;
  onDownloadSelected: () => void;
  onClearSelection: () => void;
}

function SelectionActionBar({
  selectedCount,
  isSendingSelected,
  isExporting,
  onSendSelected,
  onDownloadSelected,
  onClearSelection,
}: SelectionActionBarProps) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-xl">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-blue-700">
          {selectedCount}명 선택됨
        </span>
        <button
          onClick={onClearSelection}
          className="text-xs text-blue-400 hover:text-blue-600 underline"
        >
          선택 해제
        </button>
      </div>
      <div className="flex items-center gap-2">
        <Button
          onClick={onSendSelected}
          disabled={isSendingSelected}
          size="sm"
          variant="outline"
          className="gap-1.5 border-blue-300 text-blue-600 hover:bg-blue-100 bg-white"
        >
          <Mail className="size-3.5" />
          {isSendingSelected ? '발송 중...' : '선택 발송'}
        </Button>
        <Button
          onClick={onDownloadSelected}
          disabled={isExporting}
          size="sm"
          variant="outline"
          className="gap-1.5 border-blue-300 text-blue-600 hover:bg-blue-100 bg-white"
        >
          <Download className="size-3.5" />
          {isExporting ? '다운로드 중...' : '선택 다운로드'}
        </Button>
      </div>
    </div>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────
export default function AdminPayrollManager({ data, year, month }: Props) {
  const { mutate: updatePayroll } = useUpdatePayrollMutation();
  const { mutate: deletePayrollMutate } = useDeletePayrollMutation();
  const { mutate: exportExcel, isPending: isExporting } = useExportPayrollMutation();
  const { mutate: recalculate, isPending: isRecalculating } = useRecalculatePayrollMutation();
  const { mutate: sendEmail, isPending: isSendingEmail } = useSendPayrollEmailMutation();
  const { mutate: sendBulkEmail, isPending: isSendingBulk } = useSendPayrollEmailBulkMutation();
  const user = useAuthStore((s) => s.user);

  // ── 일괄발송 다이얼로그 ──
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkPassword, setBulkPassword] = useState('');
  const [bulkIsDuplicate, setBulkIsDuplicate] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  // ── 체크박스 선택 상태 ──
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isSendingSelected, setIsSendingSelected] = useState(false);

  const allIds = data.map((r) => r.payroll_id);
  const selectedCount = selectedIds.size;
  const isAllSelected = allIds.length > 0 && allIds.every((id) => selectedIds.has(id));
  const isIndeterminate = selectedCount > 0 && !isAllSelected;

  const handleToggleOne = useCallback((payrollId: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(payrollId)) {
        next.delete(payrollId);
      } else {
        next.add(payrollId);
      }
      return next;
    });
  }, []);

  const handleToggleAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allIds));
    }
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  // ── 선택 발송: 선택된 payroll_id들에 대해 단일 발송 API 순차 호출 ──
  const handleSendSelected = async () => {
    if (selectedCount === 0) return;

    const selectedRows = data.filter((r) => selectedIds.has(r.payroll_id));
    const noEmailRows = selectedRows.filter((r) => !r.email);

    if (noEmailRows.length > 0) {
      const names = noEmailRows.map((r) => r.name).join(', ');
      toast.warning(`이메일 주소가 없는 직원이 있습니다: ${names}`);
    }

    const sendableRows = selectedRows.filter((r) => r.email);
    if (sendableRows.length === 0) {
      toast.error('선택된 직원 중 이메일 주소가 있는 직원이 없습니다.');
      return;
    }

    setIsSendingSelected(true);
    let successCount = 0;
    let failCount = 0;

    for (const row of sendableRows) {
      try {
        await sendPayrollEmail(row.payroll_id, year, month);
        successCount++;
      } catch {
        failCount++;
      }
    }

    setIsSendingSelected(false);

    if (failCount === 0) {
      toast.success(`${successCount}명에게 급여명세서를 발송했습니다.`);
    } else {
      toast.warning(`발송 완료: ${successCount}명 성공, ${failCount}명 실패`);
    }
  };

  // ── 선택 다운로드: 백엔드가 전체 다운로드만 지원 → 전체 엑셀 다운로드 후 안내 ──
  const handleDownloadSelected = () => {
    const selectedNames = data
      .filter((r) => selectedIds.has(r.payroll_id))
      .map((r) => r.name)
      .join(', ');
    toast.info(`엑셀은 전체 직원 데이터로 다운로드됩니다. (선택: ${selectedNames})`);
    exportExcel({ year, month });
  };

  const handleSave = useCallback(
    (payrollId: number, changes: PayrollUpdateRequest) => {
      updatePayroll({ payrollId, data: changes });
    },
    [updatePayroll],
  );

  const handleDelete = useCallback(
    (payrollId: number) => {
      deletePayrollMutate(payrollId);
    },
    [deletePayrollMutate],
  );

  const handleExport = () => {
    exportExcel({ year, month });
  };

  const handleRecalculate = () => {
    recalculate({ year, month });
  };

  const handleSendEmail = useCallback(
    (payrollId: number) => {
      sendEmail({ payrollId, year, month });
    },
    [sendEmail, year, month],
  );

  const handleOpenBulkDialog = () => {
    const key = `${year}-${month}`;
    const sentMonths = getSentMonths();
    setBulkIsDuplicate(sentMonths.has(key));
    setBulkPassword('');
    setBulkDialogOpen(true);
    setTimeout(() => passwordInputRef.current?.focus(), 100);
  };

  const handleConfirmBulkSend = async () => {
    if (!bulkPassword.trim()) {
      toast.error('비밀번호를 입력해주세요.');
      return;
    }
    if (!user?.username) {
      toast.error('사용자 정보를 확인할 수 없습니다.');
      return;
    }

    setIsVerifying(true);
    try {
      await apiClient.post({ url: '/api/auth/login', data: { username: user.username, password: bulkPassword } });
    } catch {
      toast.error('비밀번호가 올바르지 않습니다.');
      setBulkPassword('');
      passwordInputRef.current?.focus();
      setIsVerifying(false);
      return;
    }
    setIsVerifying(false);

    setBulkDialogOpen(false);
    sendBulkEmail(
      { year, month },
      {
        onSuccess: () => {
          const key = `${year}-${month}`;
          const sentMonths = getSentMonths();
          sentMonths.add(key);
          saveSentMonths(sentMonths);
          toast.success(`${year}년 ${month}월 급여명세서를 일괄 발송했습니다.`);
        },
        onError: () => toast.error('일괄 발송에 실패했습니다.'),
      },
    );
  };

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500 mt-0.5">
            전직원 급여 현황 — 행을 펼치면 상세 편집 가능
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleRecalculate}
            disabled={isRecalculating || data.length === 0}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <RefreshCw className={`size-4 ${isRecalculating ? 'animate-spin' : ''}`} />
            {isRecalculating ? '재계산 중...' : '급여 재계산'}
          </Button>
          <Button
            onClick={handleOpenBulkDialog}
            disabled={isSendingBulk || data.length === 0}
            variant="outline"
            size="sm"
            className="gap-2 border-blue-200 text-blue-600 hover:bg-blue-50"
          >
            <Send className="size-4" />
            {isSendingBulk ? '발송 중...' : '명세서 일괄발송'}
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting || data.length === 0}
            className="gap-2 bg-mega hover:bg-mega-hover text-white"
            size="sm"
          >
            <Download className="size-4" />
            {isExporting ? '다운로드 중...' : '엑셀 다운로드'}
          </Button>
        </div>
      </div>

      {/* 선택 액션 바 — 1개 이상 선택 시 표시 */}
      {selectedCount > 0 && (
        <SelectionActionBar
          selectedCount={selectedCount}
          isSendingSelected={isSendingSelected}
          isExporting={isExporting}
          onSendSelected={() => void handleSendSelected()}
          onDownloadSelected={handleDownloadSelected}
          onClearSelection={handleClearSelection}
        />
      )}

      {data.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <p className="text-sm">해당 기간의 급여 데이터가 없습니다.</p>
        </div>
      ) : (
        <>
          {/* ── 데스크톱: 테이블 (lg 이상) ── */}
          <div className="hidden lg:block overflow-x-auto rounded-xl border border-gray-100 shadow-sm">
            <table className="w-full min-w-[960px] text-sm">
              <thead>
                <tr className="bg-nav-bg text-white">
                  {/* 전체선택 체크박스 */}
                  <th className="px-3 py-3 w-10 text-center">
                    <Checkbox
                      checked={isAllSelected}
                      // indeterminate 상태는 ref로 직접 처리
                      ref={(el) => {
                        if (el) {
                          (el as HTMLButtonElement & { indeterminate?: boolean }).indeterminate =
                            isIndeterminate;
                        }
                      }}
                      onCheckedChange={handleToggleAll}
                      aria-label="전체 선택"
                      className="border-white/50 data-[state=checked]:bg-white data-[state=checked]:text-nav-bg"
                    />
                  </th>
                  <th className="px-2 py-3 w-8" />
                  <th className="px-4 py-3 text-left font-semibold">이름</th>
                  <th className="px-4 py-3 text-left font-semibold">직급</th>
                  <th className="px-4 py-3 text-left font-semibold">주민등록번호</th>
                  <th className="px-4 py-3 text-right font-semibold">총근무시간</th>
                  <th className="px-4 py-3 text-right font-semibold">급여총액</th>
                  <th className="px-4 py-3 text-right font-semibold">공제계</th>
                  <th className="px-4 py-3 text-right font-semibold">실수령액</th>
                  <th className="px-4 py-3 text-center font-semibold w-20">액션</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <PayrollRow
                    key={row.payroll_id ?? row.user_id}
                    row={row}
                    year={year}
                    month={month}
                    checked={selectedIds.has(row.payroll_id)}
                    onToggle={handleToggleOne}
                    onSave={handleSave}
                    onDelete={handleDelete}
                    onSendEmail={handleSendEmail}
                    isSendingEmail={isSendingEmail}
                  />
                ))}
              </tbody>
              {/* 합계 행 */}
              <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                <tr>
                  <td colSpan={5} className="px-4 py-3 font-bold text-gray-700">
                    합계 ({data.length}명)
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-gray-700">
                    {data.reduce((s, r) => s + r.total_work_hours, 0).toFixed(2)}h
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-mega">
                    {data.reduce((s, r) => s + r.gross_pay, 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-red-600">
                    {data.reduce((s, r) => s + r.total_deduction, 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-700">
                    {data.reduce((s, r) => s + r.net_pay, 0).toLocaleString()}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>

          {/* ── 모바일: 카드 리스트 + 아코디언 (lg 미만) ── */}
          <div className="lg:hidden space-y-3">
            {/* 모바일 전체선택 */}
            <div className="flex items-center gap-2 px-1">
              <Checkbox
                checked={isAllSelected}
                ref={(el) => {
                  if (el) {
                    (el as HTMLButtonElement & { indeterminate?: boolean }).indeterminate =
                      isIndeterminate;
                  }
                }}
                onCheckedChange={handleToggleAll}
                aria-label="전체 선택"
              />
              <span className="text-sm text-gray-600 font-medium">
                전체 선택 ({data.length}명)
              </span>
            </div>

            <MobileTotalCard data={data} />
            {data.map((row) => (
              <PayrollCard
                key={row.payroll_id ?? row.user_id}
                row={row}
                year={year}
                month={month}
                checked={selectedIds.has(row.payroll_id)}
                onToggle={handleToggleOne}
                onSave={handleSave}
                onDelete={handleDelete}
                onSendEmail={handleSendEmail}
                isSendingEmail={isSendingEmail}
              />
            ))}
          </div>
        </>
      )}

      {/* ── 일괄발송 비밀번호 다이얼로그 ── */}
      <Dialog open={bulkDialogOpen} onOpenChange={(open) => { if (!isVerifying) setBulkDialogOpen(open); }}>
        <DialogContent showCloseButton={false} className="p-0 overflow-hidden max-w-sm rounded-2xl">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
              <Send className="text-white size-5" />
            </div>
            <DialogTitle className="text-white font-bold">명세서 일괄발송</DialogTitle>
            <DialogClose className="ml-auto text-white/70 hover:text-white transition-colors rounded-lg hover:bg-white/10 p-1">
              <X className="size-5" />
            </DialogClose>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4">
            {/* 중복 발송 경고 */}
            {bulkIsDuplicate && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="size-5 text-amber-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-sm mb-1 text-amber-700">
                      이미 발송된 내역이 있습니다
                    </p>
                    <p className="text-xs leading-relaxed text-amber-600">
                      {year}년 {month}월 급여명세서는 이미 발송된 기록이 있습니다.
                      계속 진행하면 동일한 명세서가 재발송됩니다.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-sm text-gray-700 font-medium">
                {year}년 {month}월 급여명세서를 전직원에게 일괄 발송합니다.
              </p>
              <p className="text-xs text-gray-500">본인 확인을 위해 비밀번호를 입력해주세요.</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">비밀번호</label>
              <Input
                ref={passwordInputRef}
                type="password"
                placeholder="비밀번호 입력"
                value={bulkPassword}
                onChange={(e) => setBulkPassword(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') void handleConfirmBulkSend(); }}
                disabled={isVerifying}
                className="h-10"
              />
            </div>
          </div>

          {/* Footer */}
          <DialogFooter className="px-6 pb-6 gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={() => setBulkDialogOpen(false)}
              disabled={isVerifying}
              className="flex-1 rounded-xl h-10"
            >
              취소
            </Button>
            <Button
              onClick={() => void handleConfirmBulkSend()}
              disabled={isVerifying || !bulkPassword.trim()}
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white rounded-xl h-10 shadow-sm"
            >
              {isVerifying ? '확인 중...' : '발송'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
