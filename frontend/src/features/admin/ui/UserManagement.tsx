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
import { cn } from '@/shared/lib/utils';

// ─── 상수 ─────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

const POSITION_OPTIONS = ['전체', '관리자', '리더', '크루', '미화'] as const;
type PositionFilter = (typeof POSITION_OPTIONS)[number];

const STATUS_OPTIONS = ['전체', '재직중', '퇴사', '가입 대기', '정지'] as const;
type StatusFilter = (typeof STATUS_OPTIONS)[number];

type UserTab = 'active' | 'deleted';

// ─── 탭 버튼 스타일 ────────────────────────────────────────────────────────────

const tabBtnCls = (active: boolean) =>
  cn(
    'px-4 py-2 rounded-lg text-xs font-medium transition-all duration-150 whitespace-nowrap flex items-center gap-1.5',
    active
      ? 'bg-white text-mega font-semibold shadow-sm border border-gray-200'
      : 'text-gray-500 hover:text-gray-700 hover:bg-white/60',
  );

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
  // 탭 상태
  const [activeTab, setActiveTab] = useState<UserTab>('active');

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
        {activeTab === 'active' && (
          <div className="flex items-center gap-2">
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
        )}
      </div>

      {/* ── 내부 탭 ─────────────────────────────────────────────────────────── */}
      <div className="flex gap-1.5 bg-gray-100/70 rounded-xl p-1 w-fit mb-5">
        <button className={tabBtnCls(activeTab === 'active')} onClick={() => setActiveTab('active')}>
          <Users className="size-3.5" />
          재직 직원
        </button>
        <button className={tabBtnCls(activeTab === 'deleted')} onClick={() => setActiveTab('deleted')}>
          <Trash2 className="size-3.5" />
          삭제된 직원
          {deletedCount > 0 && (
            <span className="inline-flex items-center justify-center size-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
              {deletedCount}
            </span>
          )}
        </button>
      </div>

      {/* ── 재직 직원 탭 ─────────────────────────────────────────────────────── */}
      {activeTab === 'active' && (
        <>
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
        </>
      )}

      {/* ── 삭제된 직원 탭 ───────────────────────────────────────────────────── */}
      {activeTab === 'deleted' && (
        <div>
          <p className="text-sm text-muted-foreground mb-4">
            삭제된 직원은 삭제 후 <span className="font-semibold text-foreground">30일</span> 이내에 복구할 수 있습니다.
          </p>
          <DeletedUsersPanel />
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
