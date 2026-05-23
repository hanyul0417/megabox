import { ChevronLeft, ChevronRight, Plus, Search, Trash2, Users, Wand2 } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';

import {
  useAdminUserDetailQuery,
  useAdminUsersQuery,
  useBulkUpdateWageMutation,
  useCreateAdminUserMutation,
  useCurrentDefaultWageQuery,
  useDeleteAdminUserMutation,
  useDeletedUsersQuery,
  useRestoreUserMutation,
  useUpdateAdminUserMutation,
} from '../api/queries';

import BulkWageModal from './BulkWageModal';
import DeletedUsersPanel from './DeletedUsersPanel';
import DeleteWithPasswordDialog from './DeleteWithPasswordDialog';
import UserFormDialog from './UserFormDialog';
import UserTable from './UserTable';

import type {
  AdminUserDTO,
  CreateAdminUserRequestDTO,
  UpdateAdminUserRequestDTO,
} from '../api/dto';

import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';

// ─── 상수 ─────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

const POSITION_OPTIONS = ['전체', '관리자', '리더', '크루', '미화'] as const;
type PositionFilter = (typeof POSITION_OPTIONS)[number];

const STATUS_OPTIONS = ['전체', '재직중', '퇴사', '가입 대기', '정지'] as const;
type StatusFilter = (typeof STATUS_OPTIONS)[number];

// ─── 필터 버튼 컴포넌트 ────────────────────────────────────────────────────────

type FilterButtonProps = {
  label: string;
  isActive: boolean;
  onClick: () => void;
};

const FilterButton = ({ label, isActive, onClick }: FilterButtonProps) => (
  <button
    type="button"
    onClick={onClick}
    className={[
      'px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap',
      isActive
        ? 'bg-mega-secondary text-white'
        : 'bg-white text-muted-foreground border border-border hover:bg-gray-50',
    ].join(' ')}
  >
    {label}
  </button>
);

// ─── 스켈레톤 ─────────────────────────────────────────────────────────────────

const TableSkeleton = () => (
  <div className="rounded-lg border border-border overflow-hidden animate-pulse">
    {/* 헤더 */}
    <div className="bg-nav-bg h-10" />
    {/* 행 */}
    {Array.from({ length: 8 }).map((_, i) => (
      <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-border last:border-0">
        <div className="size-4 bg-gray-200 rounded" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3.5 bg-gray-200 rounded w-24" />
          <div className="h-3 bg-gray-100 rounded w-16" />
        </div>
        <div className="h-5 bg-gray-200 rounded w-12" />
        <div className="hidden md:block h-3.5 bg-gray-100 rounded w-28" />
        <div className="hidden md:block h-3.5 bg-gray-100 rounded w-20" />
        <div className="h-5 bg-gray-200 rounded w-14" />
        <div className="hidden lg:block h-3.5 bg-gray-100 rounded w-16" />
        <div className="flex gap-1">
          <div className="size-8 bg-gray-100 rounded" />
          <div className="size-8 bg-gray-100 rounded" />
        </div>
      </div>
    ))}
  </div>
);

// ─── 직급 정렬 순서 ────────────────────────────────────────────────────────────

const POSITION_ORDER: Record<string, number> = {
  관리자: 0,
  리더: 1,
  크루: 2,
  미화: 3,
};

// ─── 메인 컴포넌트 ─────────────────────────────────────────────────────────────

const UserManagement = () => {
  // 검색 상태
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // 페이지네이션
  const [offset, setOffset] = useState(0);

  // 클라이언트 사이드 필터
  const [positionFilter, setPositionFilter] = useState<PositionFilter>('전체');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('재직중');

  // 다이얼로그 상태
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AdminUserDTO | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AdminUserDTO | null>(null);
  const [isBulkWageOpen, setIsBulkWageOpen] = useState(false);
  // 삭제된 직원 패널
  const [showDeletedPanel, setShowDeletedPanel] = useState(false);

  // 서버 쿼리
  const { data, isLoading, isError } = useAdminUsersQuery({
    q: debouncedSearch || undefined,
    limit: PAGE_SIZE,
    offset,
  });

  const createMutation = useCreateAdminUserMutation();
  const updateMutation = useUpdateAdminUserMutation();
  const deleteMutation = useDeleteAdminUserMutation();
  const bulkWageMutation = useBulkUpdateWageMutation();
  const { data: currentDefaultWage } = useCurrentDefaultWageQuery();
  const { data: deletedData } = useDeletedUsersQuery();

  const { data: editUserDetail, isLoading: isDetailLoading } = useAdminUserDetailQuery(
    editTarget?.id ?? 0,
  );

  // 클라이언트 사이드 필터 적용
  const allUsers = data?.items ?? [];
  const total = data?.total ?? 0;
  const deletedCount = deletedData?.total ?? 0;

  const filteredUsers = useMemo(() => {
    const filtered = allUsers.filter((user) => {
      const matchPosition = positionFilter === '전체' || user.position === positionFilter;
      const matchStatus =
        statusFilter === '전체' ||
        (statusFilter === '재직중' && user.status === 'approved' && user.is_active) ||
        (statusFilter === '퇴사' && !user.is_active) ||
        (statusFilter === '가입 대기' && user.status === 'pending') ||
        (statusFilter === '정지' && user.status === 'suspended');
      return matchPosition && matchStatus;
    });
    return filtered.sort((a, b) => {
      const posA = POSITION_ORDER[a.position] ?? 99;
      const posB = POSITION_ORDER[b.position] ?? 99;
      if (posA !== posB) return posA - posB;
      const dateA = a.hire_date ?? '';
      const dateB = b.hire_date ?? '';
      return dateA.localeCompare(dateB);
    });
  }, [allUsers, positionFilter, statusFilter]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  // ─── 핸들러 ───────────────────────────────────────────────────────────────

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearch(value);
    setOffset(0);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(value), 300);
  };

  const handlePositionFilter = (position: PositionFilter) => {
    setPositionFilter(position);
  };

  const handleStatusFilter = (status: StatusFilter) => {
    setStatusFilter((prev) => (prev === status && status !== '전체' ? '전체' : status));
  };

  const handleCreate = (formData: CreateAdminUserRequestDTO) => {
    createMutation.mutate(formData, {
      onSuccess: () => {
        toast.success('직원이 추가되었습니다.');
        setIsCreateOpen(false);
      },
      onError: () => toast.error('직원 추가에 실패했습니다.'),
    });
  };

  const handleUpdate = (memberId: number, formData: UpdateAdminUserRequestDTO) => {
    updateMutation.mutate(
      { memberId, data: formData },
      {
        onSuccess: () => {
          toast.success('직원 정보가 수정되었습니다.');
          setEditTarget(null);
        },
        onError: () => toast.error('직원 정보 수정에 실패했습니다.'),
      },
    );
  };

  const handleDeleteRequest = (user: AdminUserDTO) => {
    setPendingDelete(user);
  };

  const handleBulkWageConfirm = (zeroOnly: boolean) => {
    if (!currentDefaultWage) return;
    bulkWageMutation.mutate(
      { wage: currentDefaultWage.wage, zero_only: zeroOnly },
      {
        onSuccess: (result) => {
          toast.success(
            `${result.updated_count}명의 시급이 ${currentDefaultWage.wage.toLocaleString()}원으로 변경되었습니다.`,
          );
          setIsBulkWageOpen(false);
        },
        onError: () => toast.error('시급 일괄 적용에 실패했습니다.'),
      },
    );
  };

  const handleDeleteConfirm = (adminPassword: string, deleteReason?: string) => {
    if (!pendingDelete) return;
    deleteMutation.mutate(
      { memberId: pendingDelete.id, data: { admin_password: adminPassword, delete_reason: deleteReason } },
      {
        onSuccess: () => {
          toast.success(`'${pendingDelete.name}' 직원이 삭제되었습니다. 30일 이내 복구 가능합니다.`);
          setPendingDelete(null);
        },
        onError: (err: unknown) => {
          const detail =
            (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
          if (detail?.includes('비밀번호')) {
            toast.error('관리자 비밀번호가 올바르지 않습니다.');
          } else {
            toast.error('직원 삭제에 실패했습니다.');
          }
        },
      },
    );
  };

  const hasActiveFilter = positionFilter !== '전체' || statusFilter !== '전체';
  const isEmpty = !isLoading && !isError && filteredUsers.length === 0;

  // ─── 렌더링 ───────────────────────────────────────────────────────────────

  return (
    <>
      {/* 헤더 */}
      <div className="flex items-start justify-between mb-5">
        <div className="flex gap-2">
          <Users className="size-5 text-mega-secondary mt-0.5" />
          <div>
            <h2 className="text-base font-semibold">직원 관리</h2>
            <p className="text-sm text-muted-foreground">직원 계정을 생성하고 정보를 관리합니다.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* 삭제된 직원 복구 버튼 */}
          <Button
            variant="outline"
            onClick={() => setShowDeletedPanel((v) => !v)}
            className={[
              'relative text-muted-foreground border-border hover:bg-gray-50',
              showDeletedPanel ? 'bg-gray-50 border-gray-300' : '',
            ].join(' ')}
          >
            <Trash2 className="size-4" />
            삭제된 직원
            {deletedCount > 0 && (
              <span className="ml-1 inline-flex items-center justify-center size-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
                {deletedCount}
              </span>
            )}
          </Button>

          {currentDefaultWage && (
            <Button
              variant="outline"
              onClick={() => setIsBulkWageOpen(true)}
              className="text-mega-secondary border-mega-secondary/30 hover:bg-mega-secondary/5 hover:border-mega-secondary/60"
            >
              <Wand2 className="size-4" />
              시급 일괄 적용
            </Button>
          )}
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus />
            직원 추가
          </Button>
        </div>
      </div>

      {/* 삭제된 직원 복구 패널 */}
      {showDeletedPanel && (
        <div className="mb-5 p-4 rounded-lg border border-amber-200 bg-amber-50/50">
          <div className="flex items-center gap-2 mb-3">
            <Trash2 className="size-4 text-amber-600" />
            <h3 className="text-sm font-semibold text-amber-800">삭제된 직원 (30일 내 복구 가능)</h3>
          </div>
          <DeletedUsersPanel />
        </div>
      )}

      {/* 필터 바 */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        {/* 검색 */}
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            className="pl-9 bg-white"
            placeholder="이름으로 검색..."
            value={search}
            onChange={handleSearchChange}
          />
        </div>

        {/* 직급 필터 */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {POSITION_OPTIONS.map((pos) => (
            <FilterButton
              key={pos}
              label={pos}
              isActive={positionFilter === pos}
              onClick={() => handlePositionFilter(pos)}
            />
          ))}
        </div>

        {/* 재직상태 필터 */}
        <div className="flex items-center gap-1.5">
          {STATUS_OPTIONS.filter((s) => s !== '전체').map((status) => (
            <FilterButton
              key={status}
              label={status}
              isActive={statusFilter === status}
              onClick={() => handleStatusFilter(status)}
            />
          ))}
        </div>
      </div>

      {/* 결과 요약 */}
      {!isLoading && !isError && (
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-muted-foreground">
            총{' '}
            <span className="font-semibold text-foreground">{filteredUsers.length}</span>명
            {hasActiveFilter && (
              <span className="ml-1 text-xs text-mega-secondary">
                (전체 {total}명 중 필터 적용)
              </span>
            )}
          </p>
          {totalPages > 1 && (
            <p className="text-xs text-muted-foreground">
              페이지 {currentPage} / {totalPages}
            </p>
          )}
        </div>
      )}

      {/* 테이블 영역 */}
      {isLoading && <TableSkeleton />}

      {isError && (
        <p className="text-destructive text-sm py-8 text-center">
          직원 목록을 불러오지 못했습니다.
        </p>
      )}

      {!isLoading && !isError && !isEmpty && (
        <>
          <UserTable
            users={filteredUsers}
            onEdit={setEditTarget}
            onDelete={handleDeleteRequest}
            isDeletePending={deleteMutation.isPending}
          />

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-end gap-2 mt-4">
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                onClick={() => setOffset((prev) => Math.max(0, prev - PAGE_SIZE))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                onClick={() => setOffset((prev) => prev + PAGE_SIZE)}
                disabled={currentPage >= totalPages}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          )}
        </>
      )}

      {isEmpty && (
        <div className="py-16 text-center">
          <p className="text-muted-foreground text-sm">
            {debouncedSearch || hasActiveFilter
              ? '검색 결과가 없습니다.'
              : '등록된 직원이 없습니다.'}
          </p>
          {hasActiveFilter && (
            <button
              type="button"
              className="mt-2 text-xs text-mega-secondary hover:underline"
              onClick={() => {
                setPositionFilter('전체');
                setStatusFilter('전체');
              }}
            >
              필터 초기화
            </button>
          )}
        </div>
      )}

      {/* 다이얼로그 */}
      <UserFormDialog
        mode="create"
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreate}
        isPending={createMutation.isPending}
      />

      <UserFormDialog
        mode="edit"
        open={editTarget !== null}
        user={editUserDetail ?? editTarget}
        onClose={() => setEditTarget(null)}
        onSubmit={handleUpdate}
        isPending={updateMutation.isPending || isDetailLoading}
      />

      {currentDefaultWage && (
        <BulkWageModal
          open={isBulkWageOpen}
          onClose={() => setIsBulkWageOpen(false)}
          onConfirm={handleBulkWageConfirm}
          defaultWage={currentDefaultWage}
          isPending={bulkWageMutation.isPending}
        />
      )}

      {/* 비밀번호 확인 삭제 다이얼로그 */}
      <DeleteWithPasswordDialog
        open={pendingDelete !== null}
        user={pendingDelete}
        isPending={deleteMutation.isPending}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
};

export default UserManagement;
