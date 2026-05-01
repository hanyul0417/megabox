import { useState } from 'react';

import { useDayoffSettingQuery, useUpdateDayoffSettingMutation } from '../api/queries';

import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';

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

export default function DayoffLimitManagement() {
  const { data, isLoading } = useDayoffSettingQuery();
  const { mutate: updateSetting, isPending } = useUpdateDayoffSettingMutation();

  const [limitValue, setLimitValue] = useState('');
  const [leaveValue, setLeaveValue] = useState('');

  const currentLimit = data?.monthly_limit ?? 2;
  const currentLeave = data?.default_annual_leave_hours ?? 5.5;

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

  return (
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
  );
}
