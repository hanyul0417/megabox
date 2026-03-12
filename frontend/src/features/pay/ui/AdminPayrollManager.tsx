/**
 * 관리자 전직원 급여 관리
 * - 데스크톱(lg+): 테이블 + 인라인 편집
 * - 모바일(<lg): 카드 리스트 + 아코디언 상세
 * - 엑셀 다운로드
 * - SSN 마스킹 없음 (관리자 전용)
 */
import { Check, Download, Edit2, X, ChevronDown, ChevronRight } from 'lucide-react';
import { useState, useCallback } from 'react';

import { useUpdatePayrollMutation, useExportPayrollMutation } from '../api/queries';

import type { PayrollUpdateRequest } from '../api/dto';
import type { PayrollData } from '../model/type';

import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { cn } from '@/shared/lib/utils';

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
  크루: 'bg-green-100 text-green-700',
  미화: 'bg-orange-100 text-orange-700',
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
              ['annual_leave_pay', '연차수당', row.annual_leave_pay],
              ['holiday_pay', '공휴일수당', row.holiday_pay],
              ['labor_day_pay', '근로자의날수당', row.labor_day_pay],
            ] as [string, string, number][]
          ).map(([key, label, val]) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-gray-500">{label}</span>
              <span className="text-mega font-medium tabular-nums">{fmt(val)}</span>
            </div>
          ))}
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
  onSave: (payrollId: number, changes: PayrollUpdateRequest) => void;
}

function PayrollRow({ row, onSave }: RowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [editValues, setEditValues] = useState<Partial<PayrollUpdateRequest>>({});

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
      <tr className="border-t border-gray-100 hover:bg-gray-50/50 transition-colors">
        {/* 토글 */}
        <td className="px-3 py-3 text-center">
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
          </div>
        </td>
      </tr>

      {/* ── 확장 행 (상세 편집) ── */}
      {expanded && (
        <tr className="bg-mega-light border-t border-gray-100">
          <td colSpan={9} className="px-6 py-4">
            <DetailPanel
              row={row}
              isEditing={isEditing}
              editValues={editValues}
              onChange={handleChange}
            />
          </td>
        </tr>
      )}
    </>
  );
}

// ── 모바일 카드 + 아코디언 ───────────────────────────────────────
interface CardProps {
  row: PayrollData;
  onSave: (payrollId: number, changes: PayrollUpdateRequest) => void;
}

function PayrollCard({ row, onSave }: CardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [editValues, setEditValues] = useState<Partial<PayrollUpdateRequest>>({});

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
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      {/* ── 카드 헤더 (클릭으로 토글) ── */}
      <button
        type="button"
        onClick={() => setExpanded((p) => !p)}
        className="w-full text-left px-4 py-3.5 flex items-center gap-3 hover:bg-gray-50/50 transition-colors"
      >
        <span className="text-gray-400 shrink-0">
          {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-gray-900 truncate">{row.name}</span>
            <span
              className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0', posColor)}
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

      {/* ── 요약 수치 바 ── */}
      <div className="grid grid-cols-3 border-t border-gray-100 bg-gray-50/50">
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
              <button
                onClick={handleEdit}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 text-xs font-medium"
              >
                <Edit2 className="size-3.5" />
                수정
              </button>
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

// ── 메인 컴포넌트 ─────────────────────────────────────────────────
export default function AdminPayrollManager({ data, year, month }: Props) {
  const { mutate: updatePayroll } = useUpdatePayrollMutation();
  const { mutate: exportExcel, isPending: isExporting } = useExportPayrollMutation();

  const handleSave = useCallback(
    (payrollId: number, changes: PayrollUpdateRequest) => {
      updatePayroll({ payrollId, data: changes });
    },
    [updatePayroll],
  );

  const handleExport = () => {
    exportExcel({ year, month });
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

      {data.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <p className="text-sm">해당 기간의 급여 데이터가 없습니다.</p>
        </div>
      ) : (
        <>
          {/* ── 데스크톱: 테이블 (lg 이상) ── */}
          <div className="hidden lg:block overflow-x-auto rounded-xl border border-gray-100 shadow-sm">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="bg-nav-bg text-white">
                  <th className="px-3 py-3 w-8" />
                  <th className="px-4 py-3 text-left font-semibold">이름</th>
                  <th className="px-4 py-3 text-left font-semibold">직급</th>
                  <th className="px-4 py-3 text-left font-semibold">주민등록번호</th>
                  <th className="px-4 py-3 text-right font-semibold">총근무시간</th>
                  <th className="px-4 py-3 text-right font-semibold">급여총액</th>
                  <th className="px-4 py-3 text-right font-semibold">공제계</th>
                  <th className="px-4 py-3 text-right font-semibold">실수령액</th>
                  <th className="px-4 py-3 text-center font-semibold w-20">수정</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <PayrollRow key={row.payroll_id ?? row.user_id} row={row} onSave={handleSave} />
                ))}
              </tbody>
              {/* 합계 행 */}
              <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                <tr>
                  <td colSpan={4} className="px-4 py-3 font-bold text-gray-700">
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
            <MobileTotalCard data={data} />
            {data.map((row) => (
              <PayrollCard key={row.payroll_id ?? row.user_id} row={row} onSave={handleSave} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
