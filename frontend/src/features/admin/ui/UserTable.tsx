import { AlertTriangle, ChevronDown, ChevronUp, Pencil, Trash2 } from 'lucide-react';
import React, { useState } from 'react';

import type { AdminUserDTO } from '../api/dto';

import { getPositionBadgeStyle } from '@/entities/user/model/position';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';

interface UserTableProps {
  users: AdminUserDTO[];
  onEdit: (user: AdminUserDTO) => void;
  onDelete: (user: AdminUserDTO) => void;
  isDeletePending?: boolean;
}

// ─── 유틸 함수 ────────────────────────────────────────────────────────────────

const maskSsn = (ssn?: string): string => {
  if (!ssn) return '-';
  return ssn.length > 6 ? `${ssn.slice(0, 6)}-개인정보입니다` : ssn;
};

const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'] as const;

const formatUnavailableDays = (days?: number[]): string => {
  if (!days || days.length === 0) return '-';
  return days.map((d) => DAY_LABELS[d]).join(', ');
};

const formatWage = (wage?: number): string => {
  if (wage == null) return '-';
  return `${wage.toLocaleString('ko-KR')}원`;
};

/** 보건증 만료일이 오늘로부터 30일 이내인지 확인 */
const isHealthCertExpiringSoon = (expireDate?: string): boolean => {
  if (!expireDate) return false;
  const expire = new Date(expireDate);
  const now = new Date();
  const diffMs = expire.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return diffDays >= 0 && diffDays <= 30;
};

const isHealthCertExpired = (expireDate?: string): boolean => {
  if (!expireDate) return false;
  return new Date(expireDate) < new Date();
};

// ─── 확장 행 컴포넌트 ──────────────────────────────────────────────────────────

type DetailRowProps = {
  user: AdminUserDTO;
  colSpan: number;
};

const DetailRow = ({ user, colSpan }: DetailRowProps) => {
  const healthExpiringSoon = isHealthCertExpiringSoon(user.health_cert_expire);
  const healthExpired = isHealthCertExpired(user.health_cert_expire);

  const healthCertClass = healthExpired
    ? 'text-red-600 font-medium'
    : healthExpiringSoon
      ? 'text-orange font-medium'
      : '';

  return (
    <TableRow className="bg-gray-50/80 hover:bg-gray-50/80 border-b-2 border-border">
      <TableCell colSpan={colSpan} className="px-4 py-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-3 text-sm pl-8">
          {/* 1열 */}
          <div className="space-y-3">
            <DetailItem label="성별" value={user.gender ?? '-'} />
            <DetailItem label="생년월일" value={user.birth_date ?? '-'} />
            <DetailItem label="주민번호" value={maskSsn(user.ssn)} muted />
          </div>
          {/* 2열 */}
          <div className="space-y-3">
            <DetailItem label="이메일" value={user.email ?? '-'} />
            <DetailItem label="은행명" value={user.bank_name ?? '-'} />
            <DetailItem label="계좌번호" value={user.account_number ?? '-'} muted />
          </div>
          {/* 3열 */}
          <div className="space-y-3">
            <DetailItem label="퇴사일" value={user.retire_date ?? '-'} />
            <DetailItem label="고정 불가 요일" value={formatUnavailableDays(user.unavailable_days)} />
          </div>
          {/* 4열 */}
          <div className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">보건증 만료일</p>
              <div className="flex items-center gap-1">
                {(healthExpiringSoon || healthExpired) && (
                  <AlertTriangle
                    className={`size-3.5 shrink-0 ${healthExpired ? 'text-red-500' : 'text-orange'}`}
                  />
                )}
                <span className={healthCertClass}>
                  {user.health_cert_expire ?? '-'}
                </span>
              </div>
            </div>
            <DetailItem label="계정" value={user.username} />
          </div>
        </div>
      </TableCell>
    </TableRow>
  );
};

type DetailItemProps = {
  label: string;
  value: string;
  muted?: boolean;
};

const DetailItem = ({ label, value, muted }: DetailItemProps) => (
  <div>
    <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
    <p className={muted ? 'text-muted-foreground' : 'text-foreground'}>{value}</p>
  </div>
);

// ─── 메인 컴포넌트 ─────────────────────────────────────────────────────────────

const UserTable = React.memo(({ users, onEdit, onDelete, isDeletePending }: UserTableProps) => {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const handleRowClick = (userId: number) => {
    setExpandedId((prev) => (prev === userId ? null : userId));
  };

  const handleEdit = (e: React.MouseEvent, user: AdminUserDTO) => {
    e.stopPropagation();
    onEdit(user);
  };

  const handleDelete = (e: React.MouseEvent, user: AdminUserDTO) => {
    e.stopPropagation();
    onDelete(user);
  };

  // 테이블 전체 컬럼 수 (expand 아이콘 + 이름/계정 + 직급 + 연락처 + 입사일 + 재직상태 + 시급 + 관리)
  const TOTAL_COLS = 8;

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <Table className="text-sm">
        <TableHeader>
          <TableRow className="bg-nav-bg hover:bg-nav-bg border-b-0">
            {/* expand 토글 컬럼 */}
            <TableHead className="w-10 text-white/70 text-xs font-semibold" />
            <TableHead className="text-white/90 text-xs font-semibold min-w-[140px]">
              이름 / 계정
            </TableHead>
            <TableHead className="text-white/90 text-xs font-semibold">직급</TableHead>
            <TableHead className="text-white/90 text-xs font-semibold hidden md:table-cell">
              연락처
            </TableHead>
            <TableHead className="text-white/90 text-xs font-semibold hidden md:table-cell">
              입사일
            </TableHead>
            <TableHead className="text-white/90 text-xs font-semibold">재직상태</TableHead>
            <TableHead className="text-white/90 text-xs font-semibold hidden lg:table-cell">
              시급
            </TableHead>
            <TableHead className="text-white/90 text-xs font-semibold w-20">관리</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => {
            const isExpanded = expandedId === user.id;

            return (
              <React.Fragment key={user.id}>
                <TableRow
                  className="cursor-pointer hover:bg-gray-50/60 transition-colors"
                  onClick={() => handleRowClick(user.id)}
                >
                  {/* expand 아이콘 */}
                  <TableCell className="w-10 pr-0">
                    {isExpanded ? (
                      <ChevronUp className="size-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="size-4 text-muted-foreground" />
                    )}
                  </TableCell>

                  {/* 이름 / 계정 */}
                  <TableCell>
                    <div>
                      <p className="font-semibold text-foreground">{user.name}</p>
                      <p className="text-xs text-muted-foreground lowercase">{user.username}</p>
                    </div>
                  </TableCell>

                  {/* 직급 */}
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={getPositionBadgeStyle(user.position)}
                    >
                      {user.position}
                    </Badge>
                  </TableCell>

                  {/* 연락처 - md 이상만 표시 */}
                  <TableCell className="hidden md:table-cell text-muted-foreground">
                    {user.phone ?? '-'}
                  </TableCell>

                  {/* 입사일 - md 이상만 표시 */}
                  <TableCell className="hidden md:table-cell text-muted-foreground">
                    {user.hire_date ?? '-'}
                  </TableCell>

                  {/* 재직상태 */}
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        user.status === 'pending'
                          ? 'bg-amber-100 text-amber-700 border-amber-200'
                          : user.status === 'rejected'
                            ? 'bg-gray-100 text-gray-500 border-gray-200'
                            : user.status === 'suspended'
                              ? 'bg-orange-100 text-orange-700 border-orange-200'
                              : user.is_active
                                ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                                : 'bg-red-100 text-red-700 border-red-200'
                      }
                    >
                      {user.status === 'pending'
                        ? '가입 대기'
                        : user.status === 'rejected'
                          ? '가입 거절'
                          : user.status === 'suspended'
                            ? '정지'
                            : user.is_active
                              ? '재직중'
                              : '퇴사'}
                    </Badge>
                  </TableCell>

                  {/* 시급 - lg 이상만 표시 */}
                  <TableCell className="hidden lg:table-cell text-muted-foreground">
                    {formatWage(user.wage)}
                  </TableCell>

                  {/* 관리 버튼 */}
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-8 text-muted-foreground hover:text-foreground"
                        onClick={(e) => handleEdit(e, user)}
                        title="수정"
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-8 text-destructive hover:text-destructive"
                        onClick={(e) => handleDelete(e, user)}
                        disabled={isDeletePending}
                        title="삭제"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>

                {/* 확장 상세 행 */}
                {isExpanded && <DetailRow user={user} colSpan={TOTAL_COLS} />}
              </React.Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
});

UserTable.displayName = 'UserTable';

export default UserTable;
