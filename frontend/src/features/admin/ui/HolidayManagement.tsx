import { CalendarDays, Download, Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import {
  useCreateHolidayMutation,
  useDeleteHolidayMutation,
  useHolidaysQuery,
  useSyncHolidaysMutation,
  useUpdateHolidayMutation,
} from '../api/queries';

import HolidayFormDialog from './HolidayFormDialog';
import HolidayTable from './HolidayTable';

import type { HolidayDTO } from '../api/dto';
import type { HolidayFormValues } from '../model/holiday.schema';

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

const HolidayManagement = () => {
  const [selectedYear, setSelectedYear] = useState<number>(CURRENT_YEAR);
  const { data: holidays, isLoading, isError } = useHolidaysQuery(selectedYear);
  const createMutation = useCreateHolidayMutation();
  const updateMutation = useUpdateHolidayMutation();
  const deleteMutation = useDeleteHolidayMutation();
  const syncMutation = useSyncHolidaysMutation();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<HolidayDTO | null>(null);
  const [pendingUpdateValues, setPendingUpdateValues] = useState<HolidayFormValues | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

  const handleSync = () => {
    syncMutation.mutate(selectedYear, {
      onSuccess: (data) => {
        toast.success(`${data.year}년 공휴일 ${data.saved}건을 불러왔습니다.`);
      },
      onError: () => toast.error('공휴일 자동 불러오기에 실패했습니다.'),
    });
  };

  const handleAdd = (values: HolidayFormValues) => {
    createMutation.mutate(values, {
      onSuccess: () => {
        toast.success('공휴일이 추가되었습니다.');
        setIsAddOpen(false);
      },
      onError: () => toast.error('공휴일 추가에 실패했습니다.'),
    });
  };

  // 수정 폼 제출 → 확인 다이얼로그 표시
  const handleUpdateRequest = (values: HolidayFormValues) => {
    setPendingUpdateValues(values);
  };

  // 수정 확인
  const handleUpdateConfirm = () => {
    if (!editTarget || !pendingUpdateValues) return;
    updateMutation.mutate(
      { id: editTarget.id, data: { label: pendingUpdateValues.label } },
      {
        onSuccess: () => {
          toast.success('공휴일이 수정되었습니다.');
          setEditTarget(null);
          setPendingUpdateValues(null);
        },
        onError: () => {
          toast.error('공휴일 수정에 실패했습니다.');
          setPendingUpdateValues(null);
        },
      },
    );
  };

  // 삭제 버튼 클릭 → 확인 다이얼로그 표시
  const handleDeleteRequest = (id: number) => {
    setDeleteTargetId(id);
  };

  // 삭제 확인
  const handleDeleteConfirm = () => {
    if (deleteTargetId === null) return;
    deleteMutation.mutate(deleteTargetId, {
      onSuccess: () => {
        toast.success('공휴일이 삭제되었습니다.');
        setDeleteTargetId(null);
      },
      onError: () => {
        toast.error('공휴일 삭제에 실패했습니다.');
        setDeleteTargetId(null);
      },
    });
  };

  const deleteTarget = holidays?.find((h) => h.id === deleteTargetId);
  const holidayCount = holidays?.length ?? 0;

  return (
    <>
      {/* 헤더 */}
      <div className="flex items-start justify-between mb-5">
        <div className="flex gap-2">
          <CalendarDays className="size-5 text-mega-secondary mt-0.5" />
          <div>
            <h2 className="text-base font-semibold">공휴일 관리</h2>
            <p className="text-sm text-muted-foreground">
              공휴일을 등록하면 급여 계산 시 자동으로 반영됩니다.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSync} disabled={syncMutation.isPending}>
            {syncMutation.isPending ? (
              <Spinner className="size-4" />
            ) : (
              <Download className="size-4" />
            )}
            공휴일 자동 불러오기
          </Button>
          <Button onClick={() => setIsAddOpen(true)}>
            <Plus />
            공휴일 추가
          </Button>
        </div>
      </div>

      {/* 연도 선택 + 통계 */}
      <div className="flex items-center gap-3 mb-5">
        <Select value={String(selectedYear)} onValueChange={(val) => setSelectedYear(Number(val))}>
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
        {!isLoading && !isError && (
          <span className="text-sm text-muted-foreground">
            총{' '}
            <span className="font-semibold text-foreground">{holidayCount}</span>
            개
          </span>
        )}
      </div>

      {/* 에러 상태 */}
      {isError && (
        <p className="text-destructive text-sm py-8 text-center">
          공휴일 목록을 불러오지 못했습니다.
        </p>
      )}

      {/* 목록 — isLoading/빈 상태/skeleton은 HolidayTable 내부에서 처리 */}
      {!isError && (
        <HolidayTable
          holidays={holidays ?? []}
          onEdit={setEditTarget}
          onDelete={handleDeleteRequest}
          isDeleting={deleteMutation.isPending}
          isLoading={isLoading}
        />
      )}

      {/* 추가 모달 */}
      <HolidayFormDialog
        open={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="공휴일 추가"
        onSubmit={handleAdd}
        isPending={createMutation.isPending}
      />

      {/* 수정 모달 */}
      <HolidayFormDialog
        open={!!editTarget && !pendingUpdateValues}
        onClose={() => setEditTarget(null)}
        title="공휴일 수정"
        defaultValues={editTarget ?? undefined}
        onSubmit={handleUpdateRequest}
        isPending={false}
        readonlyDate
      />

      {/* 수정 확인 다이얼로그 */}
      <ConfirmDialog
        open={!!pendingUpdateValues}
        title="공휴일을 수정하시겠습니까?"
        description={`"${pendingUpdateValues?.label}" 으로 공휴일 이름을 변경합니다.`}
        confirmLabel="수정"
        isPending={updateMutation.isPending}
        onConfirm={handleUpdateConfirm}
        onCancel={() => setPendingUpdateValues(null)}
      />

      {/* 삭제 확인 다이얼로그 */}
      <ConfirmDialog
        open={deleteTargetId !== null}
        title="공휴일을 삭제하시겠습니까?"
        description={
          deleteTarget
            ? `"${deleteTarget.label}" (${deleteTarget.date})을 삭제하면 복구할 수 없습니다.`
            : undefined
        }
        confirmLabel="삭제"
        variant="destructive"
        isPending={deleteMutation.isPending}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTargetId(null)}
      />
    </>
  );
};

export default HolidayManagement;
