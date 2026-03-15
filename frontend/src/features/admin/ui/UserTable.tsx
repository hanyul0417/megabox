import {
  AlertTriangle,
  Banknote,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Pencil,
  Phone,
  Shield,
  Trash2,
  User,
} from 'lucide-react';
import React, { useState } from 'react';

import type { AdminUserDTO } from '../api/dto';

import { getAvatarBg, getPositionBadgeStyle } from '@/entities/user/model/position';
import { Badge } from '@/shared/components/ui/badge';
import { getProfileImageUrl } from '@/shared/lib/avatar';
import { Button } from '@/shared/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import { cn } from '@/shared/lib/utils';

interface UserTableProps {
  users: AdminUserDTO[];
  onEdit: (user: AdminUserDTO) => void;
  onDelete: (user: AdminUserDTO) => void;
  isDeletePending?: boolean;
}

// ─── 유틸 ─────────────────────────────────────────────────────────────────────

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

const isHealthCertExpiringSoon = (expireDate?: string): boolean => {
  if (!expireDate) return false;
  const expire = new Date(expireDate);
  const now = new Date();
  const diffDays = Math.ceil((expire.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays >= 0 && diffDays <= 30;
};

const isHealthCertExpired = (expireDate?: string): boolean => {
  if (!expireDate) return false;
  return new Date(expireDate) < new Date();
};

/** 이름에서 이니셜 (최대 2자) */
const getInitials = (name: string): string => {
  if (!name) return '?';
  return name.slice(0, 1);
};


// ─── 상태 배지 ─────────────────────────────────────────────────────────────────

const getStatusBadge = (user: AdminUserDTO) => {
  if (user.status === 'pending')
    return { label: '가입 대기', className: 'bg-amber-100 text-amber-700 border-amber-200' };
  if (user.status === 'rejected')
    return { label: '가입 거절', className: 'bg-gray-100 text-gray-500 border-gray-200' };
  if (user.status === 'suspended')
    return { label: '정지', className: 'bg-orange-100 text-orange-700 border-orange-200' };
  if (user.is_active)
    return { label: '재직중', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
  return { label: '퇴사', className: 'bg-red-100 text-red-700 border-red-200' };
};

// ─── 상세 패널 ────────────────────────────────────────────────────────────────

type InfoItemProps = {
  label: string;
  value: string;
  muted?: boolean;
  mono?: boolean;
};

const InfoItem = ({ label, value, muted = false, mono = false }: InfoItemProps) => (
  <div className="flex flex-col gap-0.5 min-w-0">
    <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">{label}</span>
    <span
      className={cn(
        'text-sm leading-snug break-all',
        muted ? 'text-gray-400' : 'text-gray-800 font-medium',
        mono && 'font-mono',
      )}
    >
      {value || '-'}
    </span>
  </div>
);

type SectionProps = {
  icon: React.ReactNode;
  title: string;
  color: string;
  children: React.ReactNode;
};

const Section = ({ icon, title, color, children }: SectionProps) => (
  <div className={cn('rounded-xl border p-3.5 flex flex-col gap-3', color)}>
    <div className="flex items-center gap-1.5">
      <span className="opacity-60">{icon}</span>
      <span className="text-[11px] font-bold uppercase tracking-wider opacity-70">{title}</span>
    </div>
    <div className="flex flex-col gap-2.5">{children}</div>
  </div>
);

type DetailPanelProps = {
  user: AdminUserDTO;
  colSpan: number;
};

const DetailPanel = ({ user, colSpan }: DetailPanelProps) => {
  const healthExpired = isHealthCertExpired(user.health_cert_expire);
  const healthExpiringSoon = isHealthCertExpiringSoon(user.health_cert_expire);
  const healthAlert = healthExpired || healthExpiringSoon;

  return (
    <TableRow className="bg-gray-50/60 hover:bg-gray-50/60 border-b border-gray-200/60">
      <TableCell colSpan={colSpan} className="px-5 py-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pl-6">
          {/* 신분 정보 */}
          <Section
            icon={<User className="size-3.5 text-purple-500" />}
            title="신분 정보"
            color="bg-purple-50/70 border-purple-100"
          >
            <InfoItem label="성별" value={user.gender ?? '-'} />
            <InfoItem label="생년월일" value={user.birth_date ?? '-'} />
            <InfoItem label="주민번호" value={maskSsn(user.ssn)} muted mono />
          </Section>

          {/* 연락 · 금융 */}
          <Section
            icon={<CreditCard className="size-3.5 text-blue-500" />}
            title="연락 · 금융"
            color="bg-blue-50/70 border-blue-100"
          >
            <InfoItem label="이메일" value={user.email ?? '-'} />
            <InfoItem label="은행명" value={user.bank_name ?? '-'} />
            <InfoItem label="계좌번호" value={user.account_number ?? '-'} muted mono />
          </Section>

          {/* 근무 정보 */}
          <Section
            icon={<CalendarDays className="size-3.5 text-emerald-500" />}
            title="근무 정보"
            color="bg-emerald-50/70 border-emerald-100"
          >
            <InfoItem label="퇴사일" value={user.retire_date ?? '-'} />
            <InfoItem
              label="고정 불가 요일"
              value={formatUnavailableDays(user.unavailable_days)}
            />
            {/* 보건증 */}
            {healthAlert ? (
              <div
                className={cn(
                  'rounded-lg px-2.5 py-2 flex items-start gap-1.5 border',
                  healthExpired
                    ? 'bg-red-50 border-red-200'
                    : 'bg-orange-50 border-orange-200',
                )}
              >
                <AlertTriangle
                  className={cn(
                    'size-3.5 shrink-0 mt-0.5',
                    healthExpired ? 'text-red-500' : 'text-orange-500',
                  )}
                />
                <div>
                  <p
                    className={cn(
                      'text-[10px] font-bold uppercase tracking-wide',
                      healthExpired ? 'text-red-500' : 'text-orange-500',
                    )}
                  >
                    보건증 {healthExpired ? '만료됨' : '만료 임박'}
                  </p>
                  <p
                    className={cn(
                      'text-sm font-semibold',
                      healthExpired ? 'text-red-700' : 'text-orange-700',
                    )}
                  >
                    {user.health_cert_expire}
                  </p>
                </div>
              </div>
            ) : (
              <InfoItem label="보건증 만료일" value={user.health_cert_expire ?? '-'} />
            )}
          </Section>

          {/* 계정 정보 */}
          <Section
            icon={<Shield className="size-3.5 text-gray-500" />}
            title="계정 정보"
            color="bg-gray-100/80 border-gray-200"
          >
            <InfoItem label="계정(ID)" value={user.username} mono />
          </Section>
        </div>
      </TableCell>
    </TableRow>
  );
};

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

  const TOTAL_COLS = 8;

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      <Table className="text-sm">
        <TableHeader>
          <TableRow className="bg-nav-bg hover:bg-nav-bg border-b-0">
            <TableHead className="w-10" />
            <TableHead className="text-white/90 text-xs font-semibold min-w-[160px]">
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
            const statusBadge = getStatusBadge(user);
            const avatarBg = getAvatarBg(user.position);
            const healthWarning =
              isHealthCertExpired(user.health_cert_expire) ||
              isHealthCertExpiringSoon(user.health_cert_expire);

            const profileImageUrl = getProfileImageUrl(user.profile_image);

            return (
              <React.Fragment key={user.id}>
                <TableRow
                  className={cn(
                    'cursor-pointer transition-colors duration-100',
                    isExpanded
                      ? 'bg-indigo-50/50 hover:bg-indigo-50/60 border-b-0'
                      : 'hover:bg-gray-50/70',
                  )}
                  onClick={() => handleRowClick(user.id)}
                >
                  {/* 확장 토글 */}
                  <TableCell className="w-10 pr-0 pl-3">
                    <div
                      className={cn(
                        'size-6 rounded-full flex items-center justify-center transition-colors',
                        isExpanded ? 'bg-indigo-100 text-indigo-600' : 'text-gray-400',
                      )}
                    >
                      {isExpanded ? (
                        <ChevronUp className="size-3.5" />
                      ) : (
                        <ChevronDown className="size-3.5" />
                      )}
                    </div>
                  </TableCell>

                  {/* 이름 / 계정 */}
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <div
                        className={cn(
                          'size-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 overflow-hidden',
                          avatarBg,
                        )}
                      >
                        {profileImageUrl ? (
                          <img src={profileImageUrl} alt={user.name} className="w-full h-full object-cover" />
                        ) : (
                          getInitials(user.name)
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-semibold text-gray-900 truncate">{user.name}</p>
                          {healthWarning && (
                            <AlertTriangle className="size-3.5 shrink-0 text-red-400" />
                          )}
                        </div>
                        <p className="text-xs text-gray-400 font-mono truncate">{user.username}</p>
                      </div>
                    </div>
                  </TableCell>

                  {/* 직급 */}
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn('text-xs', getPositionBadgeStyle(user.position))}
                    >
                      {user.position}
                    </Badge>
                  </TableCell>

                  {/* 연락처 */}
                  <TableCell className="hidden md:table-cell">
                    <div className="flex items-center gap-1.5 text-gray-500">
                      <Phone className="size-3 shrink-0 text-gray-300" />
                      <span className="font-mono text-xs">{user.phone ?? '-'}</span>
                    </div>
                  </TableCell>

                  {/* 입사일 */}
                  <TableCell className="hidden md:table-cell">
                    <div className="flex items-center gap-1.5 text-gray-500">
                      <CalendarDays className="size-3 shrink-0 text-gray-300" />
                      <span className="text-xs">{user.hire_date ?? '-'}</span>
                    </div>
                  </TableCell>

                  {/* 재직상태 */}
                  <TableCell>
                    <Badge variant="outline" className={cn('text-xs', statusBadge.className)}>
                      {statusBadge.label}
                    </Badge>
                  </TableCell>

                  {/* 시급 */}
                  <TableCell className="hidden lg:table-cell">
                    <div className="flex items-center gap-1.5">
                      <Banknote className="size-3 shrink-0 text-gray-300" />
                      <span className="text-xs text-gray-600 tabular-nums font-medium">
                        {formatWage(user.wage)}
                      </span>
                    </div>
                  </TableCell>

                  {/* 관리 버튼 */}
                  <TableCell>
                    <div className="flex items-center gap-0.5">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                        onClick={(e) => handleEdit(e, user)}
                        title="수정"
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        onClick={(e) => handleDelete(e, user)}
                        disabled={isDeletePending}
                        title="삭제"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>

                {/* 확장 상세 패널 */}
                {isExpanded && <DetailPanel user={user} colSpan={TOTAL_COLS} />}
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
