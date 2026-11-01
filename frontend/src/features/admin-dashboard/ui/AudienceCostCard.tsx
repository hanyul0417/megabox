import { Ticket } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { useMonthlyAudienceQuery, useSaveMonthlyAudienceMutation } from '../api/queries';

import { isApiError } from '@/shared/api/error';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';

interface AudienceCostCardProps {
  year: number;
  month: number;
  /** 실제 인건비 (근태기록 기반 세전 합계) */
  laborCost: number;
  isLaborLoading: boolean;
}

const MAX_DIGITS = 9;

const fmt = (n: number) => n.toLocaleString('ko-KR');

function fmtSavedAt(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const pad = (v: number) => String(v).padStart(2, '0');
  return `${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * 객단가 카드 — 관리자가 월별 관객수를 직접 입력·저장하면
 * 실제 인건비 ÷ 관객수 로 객단가(관객 1명당 인건비)를 보여준다.
 */
const AudienceCostCard = ({ year, month, laborCost, isLaborLoading }: AudienceCostCardProps) => {
  const { data, isLoading } = useMonthlyAudienceQuery(year, month);
  const { mutate: save, isPending } = useSaveMonthlyAudienceMutation();

  const savedCount = data?.audience_count ?? null;
  const [digits, setDigits] = useState('');

  // 월 변경 / 저장값 로드 시 입력창을 저장된 값으로 맞춘다
  useEffect(() => {
    setDigits(savedCount != null ? String(savedCount) : '');
  }, [savedCount, year, month]);

  const perCustomer =
    savedCount && savedCount > 0 && !isLaborLoading ? Math.round(laborCost / savedCount) : null;

  const isDirty = digits !== (savedCount != null ? String(savedCount) : '');
  const canSave = digits !== '' && isDirty && !isPending;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    save(
      { year, month, audience_count: Number(digits) },
      {
        onSuccess: () => toast.success(`${month}월 관객수가 저장되었습니다.`),
        onError: (err) =>
          toast.error(isApiError(err) ? err.message : '관객수 저장에 실패했습니다.'),
      },
    );
  };

  const savedAt = fmtSavedAt(data?.updated_at ?? null);

  return (
    <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-4 sm:p-5 flex min-w-0 flex-col gap-2 sm:gap-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] font-medium text-gray-500">객단가 (관객 1명당 인건비)</span>
        <span className="flex shrink-0 items-center justify-center size-8 rounded-lg bg-blue-50">
          <Ticket className="size-4 text-blue-500" />
        </span>
      </div>

      <div>
        <p className="whitespace-nowrap text-xl font-bold tracking-tight text-gray-900 tabular-nums sm:text-2xl">
          {perCustomer != null ? `${fmt(perCustomer)}원` : '-'}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          {savedCount && savedCount > 0
            ? `실제 인건비 ÷ 관객수 ${fmt(savedCount)}명`
            : '관객수를 입력하면 객단가가 계산됩니다'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <label htmlFor={`audience-${year}-${month}`} className="sr-only">
            {month}월 관객수
          </label>
          <Input
            id={`audience-${year}-${month}`}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder={isLoading ? '불러오는 중…' : '관객수 입력'}
            disabled={isLoading || isPending}
            value={digits === '' ? '' : fmt(Number(digits))}
            onChange={(e) => setDigits(e.target.value.replace(/\D/g, '').slice(0, MAX_DIGITS))}
            className="h-9 pr-8 tabular-nums"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
            명
          </span>
        </div>
        <Button type="submit" size="sm" disabled={!canSave}>
          {isPending ? '저장 중…' : '저장'}
        </Button>
      </form>

      {savedAt && <p className="text-[11px] text-gray-400 -mt-1">마지막 저장 {savedAt}</p>}
    </div>
  );
};

export default AudienceCostCard;
