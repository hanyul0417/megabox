import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, RotateCcw, Save, ShieldCheck, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';

import {
  useCreateInsuranceRateMutation,
  useDeleteInsuranceRateMutation,
  useInsuranceRateByYearQuery,
  useUpdateInsuranceRateMutation,
} from '../api/queries';
import { insuranceRateSchema, type InsuranceRateFormValues } from '../model/insurance.schema';

import InsuranceCurrentRates from './InsuranceCurrentRates';
import InsuranceRateFields from './InsuranceRateFields';
import InsuranceRatePreview from './InsuranceRatePreview';

import { Button } from '@/shared/components/ui/button';
import ConfirmDialog from '@/shared/components/ui/confirm-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Spinner } from '@/shared/components/ui/spinner';

const CURRENT_YEAR = new Date().getFullYear();

const YEAR_OPTIONS = Array.from(
  { length: CURRENT_YEAR - 2020 + 2 },
  (_, i) => CURRENT_YEAR + 1 - i,
);

const DEFAULT_FORM_VALUES: InsuranceRateFormValues = {
  health_insurance_rate: 0,
  long_term_care_rate: 0,
  employment_insurance_rate: 0,
  national_pension_rate: 0,
};

const InsuranceRateManagement = () => {
  const [selectedYear, setSelectedYear] = useState<number>(CURRENT_YEAR);
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [pendingValues, setPendingValues] = useState<InsuranceRateFormValues | null>(null);
  const [isAddMode, setIsAddMode] = useState(false);

  const { data: rateData, isLoading, isError } = useInsuranceRateByYearQuery(selectedYear);

  const createMutation = useCreateInsuranceRateMutation();
  const updateMutation = useUpdateInsuranceRateMutation();
  const deleteMutation = useDeleteInsuranceRateMutation();

  const isEditMode = rateData !== undefined && rateData !== null;
  const isMutating =
    createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<InsuranceRateFormValues>({
    resolver: zodResolver(insuranceRateSchema),
    defaultValues: DEFAULT_FORM_VALUES,
  });

  const watched = useWatch({ control });

  useEffect(() => {
    if (rateData) {
      reset({
        health_insurance_rate: rateData.health_insurance_rate ?? 0,
        long_term_care_rate: rateData.long_term_care_rate ?? 0,
        employment_insurance_rate: rateData.employment_insurance_rate ?? 0,
        national_pension_rate: rateData.national_pension_rate ?? 0,
      });
    } else {
      reset(DEFAULT_FORM_VALUES);
    }
  }, [rateData, reset]);

  const handleSave = (values: InsuranceRateFormValues) => {
    if (isEditMode) {
      setPendingValues(values);
      setConfirmSaveOpen(true);
    } else {
      createMutation.mutate(
        { ...values, year: selectedYear },
        {
          onSuccess: () => toast.success(`${selectedYear}년 4대보험 요율이 등록되었습니다.`),
          onError: () => toast.error('4대보험 요율 등록에 실패했습니다.'),
        },
      );
    }
  };

  const handleConfirmSave = () => {
    if (!pendingValues) return;
    updateMutation.mutate(
      { year: selectedYear, data: { ...pendingValues, year: selectedYear } },
      {
        onSuccess: () => {
          toast.success(`${selectedYear}년 4대보험 요율이 수정되었습니다.`);
          setConfirmSaveOpen(false);
          setPendingValues(null);
        },
        onError: () => toast.error('4대보험 요율 수정에 실패했습니다.'),
      },
    );
  };

  const handleReset = () => {
    if (rateData) {
      reset({
        health_insurance_rate: rateData.health_insurance_rate ?? 0,
        long_term_care_rate: rateData.long_term_care_rate ?? 0,
        employment_insurance_rate: rateData.employment_insurance_rate ?? 0,
        national_pension_rate: rateData.national_pension_rate ?? 0,
      });
    } else {
      reset(DEFAULT_FORM_VALUES);
    }
  };

  const handleConfirmDelete = () => {
    deleteMutation.mutate(selectedYear, {
      onSuccess: () => {
        toast.success(`${selectedYear}년 4대보험 요율이 삭제되었습니다.`);
        setConfirmDeleteOpen(false);
      },
      onError: () => toast.error('4대보험 요율 삭제에 실패했습니다.'),
    });
  };

  return (
    <div>
      {/* 헤더 */}
      <div className="flex gap-2 mb-1">
        <ShieldCheck className="size-5 text-mega-secondary" />
        <div>
          <h2 className="text-base font-semibold">4대 보험 요율 관리</h2>
          <p className="text-sm text-muted-foreground mb-6">
            건강보험, 장기요양보험, 고용보험, 국민연금의 요율을 설정합니다. 설정된 요율은 급여
            계산에 자동으로 반영됩니다.
          </p>
        </div>
      </div>

      {/* 연도 선택 */}
      <div className="flex items-center gap-3 mb-6">
        <span className="text-sm font-medium">적용 연도</span>
        <Select value={String(selectedYear)} onValueChange={(val) => { setSelectedYear(Number(val)); setIsAddMode(false); }}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {YEAR_OPTIONS.map((year) => (
              <SelectItem key={year} value={String(year)}>
                {year}년
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 로딩 */}
      {isLoading && (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      )}

      {/* 에러 */}
      {isError && !isAddMode && (
        <div className="flex flex-col items-center gap-3 py-8">
          <p className="text-sm text-muted-foreground">
            {selectedYear}년에 등록된 요율이 없습니다.
          </p>
          <Button onClick={() => setIsAddMode(true)}>
            <Plus />
            요율 추가
          </Button>
        </div>
      )}

      {/* 현재 적용 중인 요율 */}
      {!isLoading && !isError && rateData && <InsuranceCurrentRates rates={rateData} />}

      {/* 요율 없음 안내 */}
      {!isLoading && !isError && !rateData && (
        <p className="text-sm text-muted-foreground bg-muted/40 rounded-lg px-4 py-3 mb-6">
          {selectedYear}년에 등록된 요율이 없습니다. 아래 폼을 작성하여 새로 등록하세요.
        </p>
      )}

      {/* 요율 수정/등록 폼 */}
      {!isLoading && (!isError || isAddMode) && (
        <form onSubmit={(e) => void handleSubmit(handleSave)(e)}>
          <InsuranceRateFields register={register} errors={errors} />

          {/* 공제액 예시 */}
          <InsuranceRatePreview
            healthRate={Number(watched.health_insurance_rate) || 0}
            careRate={Number(watched.long_term_care_rate) || 0}
            employmentRate={Number(watched.employment_insurance_rate) || 0}
            pensionRate={Number(watched.national_pension_rate) || 0}
          />

          {/* 버튼 */}
          <div className="flex justify-between mt-6">
            {isEditMode ? (
              <Button
                type="button"
                variant="destructive"
                onClick={() => setConfirmDeleteOpen(true)}
                disabled={isMutating}
              >
                <Trash2 />
                삭제
              </Button>
            ) : (
              <div />
            )}

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={handleReset} disabled={isMutating}>
                <RotateCcw />
                초기화
              </Button>
              <Button type="submit" disabled={isMutating}>
                {createMutation.isPending || updateMutation.isPending ? (
                  <Spinner className="size-4" />
                ) : (
                  <Save />
                )}
                {isEditMode ? '수정' : '등록'}
              </Button>
            </div>
          </div>
        </form>
      )}
      <ConfirmDialog
        open={confirmSaveOpen}
        title="4대보험 요율 수정"
        description={`${selectedYear}년 4대보험 요율을 수정하시겠습니까?`}
        confirmLabel="수정"
        isPending={updateMutation.isPending}
        onConfirm={handleConfirmSave}
        onCancel={() => setConfirmSaveOpen(false)}
      />

      <ConfirmDialog
        open={confirmDeleteOpen}
        title="4대보험 요율 삭제"
        description={`${selectedYear}년 4대보험 요율을 삭제하시겠습니까?`}
        confirmLabel="삭제"
        variant="destructive"
        isPending={deleteMutation.isPending}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDeleteOpen(false)}
      />
    </div>
  );
};

export default InsuranceRateManagement;
