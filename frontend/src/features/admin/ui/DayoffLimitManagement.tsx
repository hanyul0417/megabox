import { useState } from 'react';

import { useDayoffSettingQuery, useUpdateDayoffSettingMutation } from '../api/queries';
import type { AnnualLeavePayMethod } from '../api/dto';

import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { cn } from '@/shared/lib/utils';

interface SettingCardProps {
  title: string;
  description: string;
  currentLabel: string;
  inputId: string;
  unit: string;
  value: string;
  onChange: (v: string) => void;
  onSave: () => void;
  isPending: boolean;
  isLoading: boolean;
  hint?: string;
  step?: string;
}

function SettingCard({
  title, description, currentLabel, inputId, unit,
  value, onChange, onSave, isPending, isLoading, hint, step,
}: SettingCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4 flex-1 min-w-0">
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">불러오는 중...</p>
      ) : (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">현재 설정:</span>
          <span className="font-semibold text-foreground">{currentLabel}</span>
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor={inputId} className="text-xs font-medium">새 값</Label>
        <div className="flex items-center gap-2">
          <div className="relative w-32">
            <Input
              id={inputId}
              type="number"
              min={0}
              step={step ?? '1'}
              placeholder={value === '' ? '입력' : value}
              className="h-9 pr-8"
              value={value}
              onChange={(e) => onChange(e.target.value)}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              {unit}
            </span>
          </div>
          <Button
            size="sm"
            className="h-9"
            onClick={onSave}
            disabled={isPending || value === ''}
          >
            저장
          </Button>
        </div>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );
}

const ANNUAL_LEAVE_METHODS: { value: AnnualLeavePayMethod; label: string; description: string }[] = [
  {
    value: 'scheduled',
    label: '소정 근로시간',
    description: '계약된 소정 근로시간으로 연차수당 지급 (현재 방식)',
  },
  {
    value: 'daily_avg',
    label: '일 평균시간',
    description: '해당 월 총근무시간 ÷ 근무일수로 계산한 일 평균으로 지급',
  },
  {
    value: 'daily_avg_min_scheduled',
    label: '일 평균시간 (소정 최소)',
    description: '일 평균시간으로 지급하되, 소정 근로시간보다 작으면 소정 근로시간으로 지급',
  },
];

export default function DayoffLimitManagement() {
  const { data, isLoading } = useDayoffSettingQuery();
  const { mutate: updateSetting, isPending } = useUpdateDayoffSettingMutation();

  const [limitValue, setLimitValue] = useState('');
  const [leaveValue, setLeaveValue] = useState('');

  const currentLimit = data?.monthly_limit ?? 2;
  const currentLeave = data?.default_annual_leave_hours ?? 5.5;
  const currentMethod: AnnualLeavePayMethod = data?.annual_leave_pay_method ?? 'scheduled';

  const handleSaveLimit = () => {
    const parsed = parseInt(limitValue, 10);
    if (isNaN(parsed) || parsed < 0) return;
    updateSetting({ monthly_limit: parsed }, { onSuccess: () => setLimitValue('') });
  };

  const handleSaveLeave = () => {
    const parsed = parseFloat(leaveValue);
    if (isNaN(parsed) || parsed < 0) return;
    updateSetting(
      { monthly_limit: currentLimit, default_annual_leave_hours: parsed },
      { onSuccess: () => setLeaveValue('') },
    );
  };

  const handleSelectMethod = (method: AnnualLeavePayMethod) => {
    if (method === currentMethod) return;
    updateSetting({ monthly_limit: currentLimit, annual_leave_pay_method: method });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <SettingCard
          title="주말/공휴일 휴무 월 한도"
          description="직원별 개인 한도가 없을 때 적용되는 전역 기본값입니다."
          currentLabel={currentLimit === 0 ? '무제한' : `월 ${currentLimit}회`}
          inputId="global-limit"
          unit="회"
          value={limitValue}
          onChange={setLimitValue}
          onSave={handleSaveLimit}
          isPending={isPending}
          isLoading={isLoading}
          hint="0 입력 시 무제한"
        />

        <SettingCard
          title="기본 소정근로시간"
          description="신규 회원가입 시 자동으로 적용되는 소정근로시간입니다."
          currentLabel={`${currentLeave}시간`}
          inputId="default-leave-hours"
          unit="시간"
          step="0.5"
          value={leaveValue}
          onChange={setLeaveValue}
          onSave={handleSaveLeave}
          isPending={isPending}
          isLoading={isLoading}
          hint="0.5 단위로 입력 (예: 5.5, 6.0)"
        />
      </div>

      {/* 연차수당 지급 방식 */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div>
          <h3 className="text-sm font-semibold">연차수당 지급 방식</h3>
          <p className="text-xs text-muted-foreground mt-1">
            급여 계산 시 연차수당 산정에 사용할 근로시간 기준을 선택합니다.
            직접 입력된 연차수당은 이 설정에 영향받지 않습니다.
          </p>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">불러오는 중...</p>
        ) : (
          <div className="flex flex-col sm:flex-row gap-3">
            {ANNUAL_LEAVE_METHODS.map((m) => {
              const isSelected = currentMethod === m.value;
              return (
                <button
                  key={m.value}
                  type="button"
                  disabled={isPending}
                  onClick={() => handleSelectMethod(m.value)}
                  className={cn(
                    'flex-1 text-left rounded-xl border-2 px-4 py-3.5 transition-all',
                    isSelected
                      ? 'border-mega bg-mega/5'
                      : 'border-border bg-background hover:border-mega/40',
                    isPending && 'opacity-60 cursor-not-allowed',
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={cn(
                        'inline-flex size-4 shrink-0 rounded-full border-2 items-center justify-center',
                        isSelected ? 'border-mega' : 'border-gray-300',
                      )}
                    >
                      {isSelected && (
                        <span className="size-2 rounded-full bg-mega" />
                      )}
                    </span>
                    <span className={cn('text-sm font-semibold', isSelected ? 'text-mega' : 'text-foreground')}>
                      {m.label}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground pl-6">{m.description}</p>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
