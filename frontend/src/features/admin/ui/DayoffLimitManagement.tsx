import { useState } from 'react';

import { useDayoffSettingQuery, useUpdateDayoffSettingMutation } from '../api/queries';

import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';

export default function DayoffLimitManagement() {
  const { data, isLoading } = useDayoffSettingQuery();
  const { mutate: updateSetting, isPending } = useUpdateDayoffSettingMutation();
  const [value, setValue] = useState<string>('');

  const currentLimit = data?.monthly_limit ?? 2;

  const handleSave = () => {
    const parsed = parseInt(value, 10);
    if (isNaN(parsed) || parsed < 0) return;
    updateSetting({ monthly_limit: parsed }, { onSuccess: () => setValue('') });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-5 space-y-4 max-w-sm">
        <div>
          <h3 className="text-sm font-semibold">주말/공휴일 휴무 월 한도</h3>
          <p className="text-xs text-muted-foreground mt-1">
            직원별 개인 한도가 없을 때 적용되는 전역 기본값입니다. 0으로 설정하면 무제한입니다.
          </p>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">불러오는 중...</p>
        ) : (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">현재 한도:</span>
            <span className="font-semibold text-foreground">
              {currentLimit === 0 ? '무제한' : `월 ${currentLimit}회`}
            </span>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="global-limit" className="text-xs font-medium">
            새 한도
          </Label>
          <div className="flex items-center gap-2">
            <div className="relative w-28">
              <Input
                id="global-limit"
                type="number"
                min={0}
                placeholder={String(currentLimit)}
                className="h-9 pr-8"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                회
              </span>
            </div>
            <Button
              size="sm"
              className="h-9"
              onClick={handleSave}
              disabled={isPending || value === ''}
            >
              저장
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">0 입력 시 무제한</p>
        </div>
      </div>
    </div>
  );
}
