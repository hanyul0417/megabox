import { CalendarClock, Pencil, RotateCcw, Trash2, Wand2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import {
  useAutoCalculatePayDateMutation,
  useCreatePayDateMutation,
  useDeletePayDateMutation,
  usePayDatesQuery,
  useUpdatePayDateMutation,
} from '../api/queries';

import { Button } from '@/shared/components/ui/button';
import ConfirmDialog from '@/shared/components/ui/confirm-dialog';
import { Input } from '@/shared/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Spinner } from '@/shared/components/ui/spinner';

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 3 }, (_, i) => CURRENT_YEAR + 1 - i);
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

type ManualTarget = { year: number; month: number; currentDate?: string };

const PayDateManagement = () => {
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
  const [paymentDay, setPaymentDay] = useState(10);
  const [autoAllConfirmOpen, setAutoAllConfirmOpen] = useState(false);
  const [manualTarget, setManualTarget] = useState<ManualTarget | null>(null);
  const [manualDate, setManualDate] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ year: number; month: number } | null>(null);

  const { data: payDates = [], isLoading } = usePayDatesQuery(selectedYear);
  const autoMutation = useAutoCalculatePayDateMutation();
  const createMutation = useCreatePayDateMutation();
  const updateMutation = useUpdatePayDateMutation();
  const deleteMutation = useDeletePayDateMutation();

  const isMutating =
    autoMutation.isPending ||
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending;

  const payDateMap = new Map(payDates.map((d) => [d.month, d]));

  const handleAutoSingle = (month: number) => {
    autoMutation.mutate(
      { year: selectedYear, month, payment_day: paymentDay },
      {
        onSuccess: (data) => toast.success(`${selectedYear}년 ${month}월 지급일: ${data.pay_date}`),
        onError: () => toast.error('자동 계산에 실패했습니다.'),
      },
    );
  };

  const handleAutoAll = () => {
    const mutations = MONTHS.map(
      (month) =>
        new Promise<void>((resolve, reject) => {
          autoMutation.mutate(
            { year: selectedYear, month, payment_day: paymentDay },
            { onSuccess: () => resolve(), onError: reject },
          );
        }),
    );
    void Promise.all(mutations)
      .then(() => {
        toast.success(`${selectedYear}년 전체 지급일 자동 계산 완료`);
        setAutoAllConfirmOpen(false);
      })
      .catch(() => toast.error('일부 월 자동 계산에 실패했습니다.'));
  };

  const openManual = (month: number) => {
    const existing = payDateMap.get(month);
    setManualTarget({ year: selectedYear, month, currentDate: existing?.pay_date });
    setManualDate(existing?.pay_date ?? `${selectedYear}-${String(month).padStart(2, '0')}-${String(paymentDay).padStart(2, '0')}`);
  };

  const handleManualSave = () => {
    if (!manualTarget || !manualDate) return;
    const { year, month, currentDate } = manualTarget;

    const onSuccess = () => {
      toast.success(`${year}년 ${month}월 지급일이 ${manualDate}로 설정되었습니다.`);
      setManualTarget(null);
    };
    const onError = () => toast.error('지급일 저장에 실패했습니다.');

    if (currentDate) {
      updateMutation.mutate({ year, month, data: { pay_date: manualDate } }, { onSuccess, onError });
    } else {
      createMutation.mutate({ year, month, pay_date: manualDate }, { onSuccess, onError });
    }
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget, {
      onSuccess: () => {
        toast.success(`${deleteTarget.year}년 ${deleteTarget.month}월 지급일이 삭제되었습니다.`);
        setDeleteTarget(null);
      },
      onError: () => toast.error('지급일 삭제에 실패했습니다.'),
    });
  };

  return (
    <div>
      {/* 헤더 */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex gap-2">
          <CalendarClock className="size-5 text-mega-secondary mt-0.5" />
          <div>
            <h2 className="text-base font-semibold">급여 지급일 관리</h2>
            <p className="text-sm text-muted-foreground">
              월별 급여 지급일을 자동 계산하거나 수동으로 설정합니다. 주말·공휴일은 직전 평일로
              자동 조정됩니다.
            </p>
          </div>
        </div>
      </div>

      {/* 설정 바 */}
      <div className="flex flex-wrap items-center gap-3 mb-6 p-4 rounded-xl border border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium whitespace-nowrap">연도</span>
          <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
            <SelectTrigger className="w-28 bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {YEAR_OPTIONS.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}년
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium whitespace-nowrap">기준일</span>
          <div className="flex items-center gap-1">
            <Input
              type="number"
              min={1}
              max={28}
              value={paymentDay}
              onChange={(e) => setPaymentDay(Number(e.target.value))}
              className="w-16 bg-white text-center"
            />
            <span className="text-sm text-muted-foreground">일</span>
          </div>
        </div>

        <Button
          variant="outline"
          onClick={() => setAutoAllConfirmOpen(true)}
          disabled={isMutating}
          className="ml-auto text-mega-secondary border-mega-secondary/30 hover:bg-mega-secondary/5 hover:border-mega-secondary/60"
        >
          <Wand2 className="size-4" />
          전체 자동 계산
        </Button>
      </div>

      {/* 월별 지급일 그리드 */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {MONTHS.map((month) => {
            const record = payDateMap.get(month);
            const isThisMonth =
              month === new Date().getMonth() + 1 && selectedYear === CURRENT_YEAR;

            return (
              <div
                key={month}
                className={`flex flex-col gap-2 rounded-xl border p-4 ${
                  isThisMonth
                    ? 'border-mega-secondary/40 bg-mega-secondary/5'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-sm font-semibold ${isThisMonth ? 'text-mega-secondary' : 'text-gray-700'}`}
                  >
                    {month}월
                    {isThisMonth && (
                      <span className="ml-1 text-[10px] bg-mega-secondary text-white rounded-full px-1.5 py-0.5">
                        이번달
                      </span>
                    )}
                  </span>
                  {record && (
                    <button
                      onClick={() => setDeleteTarget({ year: selectedYear, month })}
                      className="text-muted-foreground hover:text-red-500 transition-colors"
                      disabled={isMutating}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </div>

                {record ? (
                  <p className="text-base font-bold text-gray-800">{record.pay_date}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">미설정</p>
                )}

                <div className="flex gap-1.5 mt-auto">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 h-7 text-xs"
                    onClick={() => handleAutoSingle(month)}
                    disabled={isMutating}
                  >
                    {autoMutation.isPending ? (
                      <Spinner className="size-3" />
                    ) : (
                      <RotateCcw className="size-3" />
                    )}
                    자동
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 h-7 text-xs"
                    onClick={() => openManual(month)}
                    disabled={isMutating}
                  >
                    <Pencil className="size-3" />
                    수동
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 수동 입력 다이얼로그 */}
      <ConfirmDialog
        open={manualTarget !== null}
        title={`${manualTarget?.year}년 ${manualTarget?.month}월 지급일 수동 입력`}
        description={
          <div className="flex flex-col gap-2 mt-1">
            <span className="text-sm text-muted-foreground">날짜를 직접 입력합니다.</span>
            <Input
              type="date"
              value={manualDate}
              onChange={(e) => setManualDate(e.target.value)}
              className="w-full"
            />
          </div>
        }
        confirmLabel="저장"
        isPending={createMutation.isPending || updateMutation.isPending}
        onConfirm={handleManualSave}
        onCancel={() => setManualTarget(null)}
      />

      {/* 전체 자동 계산 확인 */}
      <ConfirmDialog
        open={autoAllConfirmOpen}
        title={`${selectedYear}년 전체 급여 지급일 자동 계산`}
        description={`${selectedYear}년 1~12월 지급일을 매월 ${paymentDay}일 기준으로 자동 계산합니다. 기존 등록된 날짜도 덮어씁니다.`}
        confirmLabel="계산"
        isPending={autoMutation.isPending}
        onConfirm={handleAutoAll}
        onCancel={() => setAutoAllConfirmOpen(false)}
      />

      {/* 삭제 확인 */}
      <ConfirmDialog
        open={deleteTarget !== null}
        title="급여 지급일 삭제"
        description={`${deleteTarget?.year}년 ${deleteTarget?.month}월 지급일을 삭제하시겠습니까?`}
        confirmLabel="삭제"
        variant="destructive"
        isPending={deleteMutation.isPending}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default PayDateManagement;
