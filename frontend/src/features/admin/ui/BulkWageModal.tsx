import { AlertTriangle, CheckCircle2, Users } from 'lucide-react';
import { useState } from 'react';

import type { DefaultWageResponseDTO } from '../api/dto';

import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Spinner } from '@/shared/components/ui/spinner';

type TargetOption = 'zero_only' | 'all';

type BulkWageModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: (zeroOnly: boolean) => void;
  defaultWage: DefaultWageResponseDTO;
  isPending: boolean;
};

const TARGET_OPTIONS: {
  value: TargetOption;
  label: string;
  description: string;
  safe: boolean;
}[] = [
  {
    value: 'zero_only',
    label: '시급 미설정 직원만',
    description: '현재 시급이 0원(미설정)인 직원에게만 적용됩니다.',
    safe: true,
  },
  {
    value: 'all',
    label: '전체 직원',
    description: '개별 설정된 시급과 무관하게 모든 직원에게 적용됩니다.',
    safe: false,
  },
];

const BulkWageModal = ({
  open,
  onClose,
  onConfirm,
  defaultWage,
  isPending,
}: BulkWageModalProps) => {
  const [target, setTarget] = useState<TargetOption>('zero_only');

  const handleClose = () => {
    setTarget('zero_only');
    onClose();
  };

  const isAllTarget = target === 'all';

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader className="pb-2 border-b border-border">
          <DialogTitle className="text-base font-semibold flex items-center gap-2">
            <Users className="size-4 text-mega-secondary" />
            시급 일괄 적용
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-1">
          {/* 적용할 시급 표시 */}
          <div className="rounded-xl bg-mega-secondary/10 border border-mega-secondary/20 p-4">
            <p className="text-xs text-muted-foreground mb-1">적용할 시급</p>
            <p className="text-3xl font-bold text-mega-secondary tracking-tight">
              {defaultWage.wage.toLocaleString()}
              <span className="text-lg font-medium ml-1">원</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1.5">
              {defaultWage.year}년 최저시급 기준
            </p>
          </div>

          {/* 적용 범위 선택 */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              적용 범위 선택
            </p>
            <div className="space-y-2">
              {TARGET_OPTIONS.map((option) => {
                const isSelected = target === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setTarget(option.value)}
                    className={[
                      'w-full text-left rounded-xl border-2 p-4 transition-all duration-150',
                      isSelected && option.safe
                        ? 'border-mega-secondary bg-mega-secondary/5'
                        : isSelected && !option.safe
                          ? 'border-destructive bg-destructive/5'
                          : 'border-border hover:border-muted-foreground/40 hover:bg-muted/30',
                    ].join(' ')}
                  >
                    <div className="flex items-start gap-3">
                      {/* 라디오 인디케이터 */}
                      <div
                        className={[
                          'mt-0.5 size-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors',
                          isSelected && option.safe
                            ? 'border-mega-secondary bg-mega-secondary'
                            : isSelected && !option.safe
                              ? 'border-destructive bg-destructive'
                              : 'border-muted-foreground/40',
                        ].join(' ')}
                      >
                        {isSelected && (
                          <div className="size-1.5 rounded-full bg-white" />
                        )}
                      </div>

                      {/* 텍스트 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p
                            className={[
                              'text-sm font-semibold',
                              isSelected && option.safe
                                ? 'text-mega-secondary'
                                : isSelected && !option.safe
                                  ? 'text-destructive'
                                  : 'text-foreground',
                            ].join(' ')}
                          >
                            {option.label}
                          </p>
                          {option.safe && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                              권장
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {option.description}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 결과 미리보기 */}
          <div
            className={[
              'flex items-start gap-2.5 rounded-xl p-3.5 border transition-colors',
              isAllTarget
                ? 'bg-destructive/8 border-destructive/25'
                : 'bg-emerald-50 border-emerald-200',
            ].join(' ')}
          >
            {isAllTarget ? (
              <AlertTriangle className="size-4 text-destructive flex-shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="size-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            )}
            <p
              className={[
                'text-xs leading-relaxed',
                isAllTarget ? 'text-destructive' : 'text-emerald-700',
              ].join(' ')}
            >
              {isAllTarget
                ? '전체 직원을 선택하면 개별 설정된 시급도 모두 변경됩니다. 이 작업은 되돌릴 수 없습니다.'
                : '시급 미설정 직원의 시급을 최저시급으로 설정합니다. 개별 설정된 시급은 유지됩니다.'}
            </p>
          </div>
        </div>

        <DialogFooter className="pt-3 border-t border-border gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClose}
            disabled={isPending}
          >
            취소
          </Button>
          <Button
            type="button"
            size="sm"
            variant={isAllTarget ? 'destructive' : 'default'}
            onClick={() => onConfirm(target === 'zero_only')}
            disabled={isPending}
          >
            {isPending ? (
              <Spinner className="size-4" />
            ) : (
              `${isAllTarget ? '전체' : '미설정'} 직원 일괄 적용`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BulkWageModal;
