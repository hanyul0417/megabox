import { CircleDollarSign, Download, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import {
  useDefaultWagesQuery,
  useSyncAllDefaultWagesMutation,
  useSyncDefaultWageMutation,
} from '../api/queries';

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
const YEAR_OPTIONS = Array.from({ length: CURRENT_YEAR - 2020 + 2 }, (_, i) => CURRENT_YEAR + 1 - i);

const DefaultWageManagement = () => {
  const [selectedYear, setSelectedYear] = useState<number>(CURRENT_YEAR);
  const [confirmSyncOpen, setConfirmSyncOpen] = useState(false);
  const [confirmSyncAllOpen, setConfirmSyncAllOpen] = useState(false);

  const { data: wages = [], isLoading } = useDefaultWagesQuery();
  const syncMutation = useSyncDefaultWageMutation();
  const syncAllMutation = useSyncAllDefaultWagesMutation();

  const handleSyncYear = () => {
    syncMutation.mutate(selectedYear, {
      onSuccess: (data) => {
        toast.success(`${data.year}년 최저시급이 ${data.wage.toLocaleString()}원으로 등록되었습니다.`);
        setConfirmSyncOpen(false);
      },
      onError: () => {
        toast.error('최저시급 불러오기에 실패했습니다.');
        setConfirmSyncOpen(false);
      },
    });
  };

  const handleSyncAll = () => {
    syncAllMutation.mutate(undefined, {
      onSuccess: (data) => {
        toast.success(
          `최저시급 동기화 완료 — 신규 ${data.inserted}건, 업데이트 ${data.updated}건 (총 ${data.total}건)`,
        );
        setConfirmSyncAllOpen(false);
      },
      onError: () => {
        toast.error('전체 최저시급 불러오기에 실패했습니다.');
        setConfirmSyncAllOpen(false);
      },
    });
  };

  return (
    <div>
      {/* 헤더 */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex gap-2">
          <CircleDollarSign className="size-5 text-mega-secondary mt-0.5" />
          <div>
            <h2 className="text-base font-semibold">최저시급 관리</h2>
            <p className="text-sm text-muted-foreground">
              최저임금위원회 기준으로 연도별 최저시급을 불러와 등록합니다.
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => setConfirmSyncAllOpen(true)}
          disabled={syncAllMutation.isPending}
          className="text-mega-secondary border-mega-secondary/30 hover:bg-mega-secondary/5 hover:border-mega-secondary/60"
        >
          {syncAllMutation.isPending ? <Spinner className="size-4" /> : <RefreshCw className="size-4" />}
          전체 동기화
        </Button>
      </div>

      {/* 연도별 불러오기 */}
      <div className="flex items-center gap-3 mb-8 p-4 rounded-xl border border-gray-200 bg-gray-50">
        <span className="text-sm font-medium whitespace-nowrap">연도 선택</span>
        <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
          <SelectTrigger className="w-32 bg-white">
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
        <Button
          onClick={() => setConfirmSyncOpen(true)}
          disabled={syncMutation.isPending}
          size="sm"
        >
          {syncMutation.isPending ? <Spinner className="size-4" /> : <Download className="size-4" />}
          불러오기
        </Button>
      </div>

      {/* 등록된 최저시급 목록 */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground mb-3">등록된 최저시급</h3>

        {isLoading && (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        )}

        {!isLoading && wages.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
            <p className="text-sm">등록된 최저시급이 없습니다.</p>
            <p className="text-xs">전체 동기화 버튼을 눌러 불러오세요.</p>
          </div>
        )}

        {!isLoading && wages.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {wages.map((w) => (
              <div
                key={w.id}
                className={`flex flex-col items-center justify-center gap-1 rounded-xl border p-4 ${
                  w.year === CURRENT_YEAR
                    ? 'border-mega-secondary/40 bg-mega-secondary/5'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <span
                  className={`text-xs font-semibold ${
                    w.year === CURRENT_YEAR ? 'text-mega-secondary' : 'text-muted-foreground'
                  }`}
                >
                  {w.year}년
                  {w.year === CURRENT_YEAR && (
                    <span className="ml-1 text-[10px] bg-mega-secondary text-white rounded-full px-1.5 py-0.5">
                      적용중
                    </span>
                  )}
                </span>
                <span className="text-base font-bold text-gray-800">
                  {w.wage.toLocaleString()}원
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmSyncOpen}
        title={`${selectedYear}년 최저시급 불러오기`}
        description={`최저임금위원회 사이트에서 ${selectedYear}년 최저시급을 가져와 DB에 저장합니다.`}
        confirmLabel="불러오기"
        isPending={syncMutation.isPending}
        onConfirm={handleSyncYear}
        onCancel={() => setConfirmSyncOpen(false)}
      />

      <ConfirmDialog
        open={confirmSyncAllOpen}
        title="전체 최저시급 동기화"
        description="최저임금위원회 사이트에서 모든 연도의 최저시급을 가져와 DB에 저장합니다."
        confirmLabel="동기화"
        isPending={syncAllMutation.isPending}
        onConfirm={handleSyncAll}
        onCancel={() => setConfirmSyncAllOpen(false)}
      />
    </div>
  );
};

export default DefaultWageManagement;
