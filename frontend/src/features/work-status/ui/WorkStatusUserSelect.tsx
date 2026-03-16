import { Check, ChevronDown, Loader2, Search, UserCircle2 } from 'lucide-react';
import { memo, useState, useMemo } from 'react';

import { useWorkStatusEmployeesQuery } from '../api/queries';

import type { WorkStatusEmployee } from '@/entities/work-status/api/dto';

import { getProfileImageUrl } from '@/shared/lib/avatar';
import { cn } from '@/shared/lib/utils';

// ── 직급 한글 매핑 ─────────────────────────────────────────────────────────
const POSITION_LABEL: Record<string, { label: string; color: string }> = {
  CREW: { label: '크루', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  LEADER: { label: '리더', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  CLEANING: { label: '미화', color: 'bg-teal-50 text-teal-700 border-teal-200' },
  // 백엔드가 한글로 내려올 경우도 대비
  크루: { label: '크루', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  리더: { label: '리더', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  미화: { label: '미화', color: 'bg-teal-50 text-teal-700 border-teal-200' },
};

function PositionBadge({ position }: { position: string }) {
  const meta = POSITION_LABEL[position] ?? {
    label: position,
    color: 'bg-gray-50 text-gray-600 border-gray-200',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border',
        meta.color,
      )}
    >
      {meta.label}
    </span>
  );
}

interface WorkStatusUserSelectProps {
  selected: WorkStatusEmployee | null;
  onSelect: (employee: WorkStatusEmployee) => void;
}

export const WorkStatusUserSelect = memo(({ selected, onSelect }: WorkStatusUserSelectProps) => {
  const { data: employees = [], isLoading, isError } = useWorkStatusEmployeesQuery();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter(
      (e) => e.name.toLowerCase().includes(q) || e.position.toLowerCase().includes(q),
    );
  }, [employees, query]);

  const handleSelect = (employee: WorkStatusEmployee) => {
    onSelect(employee);
    setIsOpen(false);
    setQuery('');
  };

  return (
    <div className="relative w-full">
      {/* ── 트리거 버튼 ── */}
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className={cn(
          'w-full flex items-center justify-between gap-3',
          'h-14 px-4 rounded-2xl border-2 text-left transition-all duration-150',
          'bg-white shadow-sm',
          isOpen
            ? 'border-mega-secondary shadow-[0_0_0_3px_rgba(91,49,165,0.1)]'
            : 'border-gray-200 hover:border-mega-secondary/50',
        )}
      >
        <div className="flex items-center gap-3 min-w-0">
          <UserCircle2
            className={cn('size-6 shrink-0', selected ? 'text-mega-secondary' : 'text-gray-400')}
          />
          {selected ? (
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-semibold text-gray-900 truncate">{selected.name}</span>
              <PositionBadge position={selected.position} />
            </div>
          ) : (
            <span className="text-gray-400 font-normal">
              {isLoading ? '직원 목록 불러오는 중...' : '직원을 선택하세요'}
            </span>
          )}
        </div>
        {isLoading ? (
          <Loader2 className="size-5 text-gray-400 animate-spin shrink-0" />
        ) : (
          <ChevronDown
            className={cn(
              'size-5 text-gray-400 shrink-0 transition-transform duration-200',
              isOpen && 'rotate-180',
            )}
          />
        )}
      </button>

      {/* ── 드롭다운 패널 ── */}
      {isOpen && (
        <>
          {/* 백드롭 */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => {
              setIsOpen(false);
              setQuery('');
            }}
          />

          <div className="absolute top-[calc(100%+8px)] left-0 right-0 z-20 bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
            {/* 검색 입력 */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
              <Search className="size-4 text-gray-400 shrink-0" />
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="이름 또는 직급으로 검색"
                className="flex-1 text-sm outline-none placeholder:text-gray-400"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  지우기
                </button>
              )}
            </div>

            {/* 직원 목록 */}
            <div className="max-h-[320px] overflow-y-auto scrollbar-hide">
              {isError ? (
                <p className="py-8 text-center text-sm text-red-500">
                  직원 목록을 불러오지 못했습니다.
                </p>
              ) : filtered.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-400">
                  {query ? '검색 결과가 없습니다.' : '등록된 직원이 없습니다.'}
                </p>
              ) : (
                filtered.map((employee) => (
                  <button
                    key={employee.id}
                    type="button"
                    onClick={() => handleSelect(employee)}
                    className={cn(
                      'w-full flex items-center justify-between gap-3 px-4 py-3.5',
                      'text-left transition-colors duration-100',
                      'hover:bg-mega-secondary/5',
                      selected?.id === employee.id && 'bg-mega-secondary/8',
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-mega-secondary/10 shrink-0 overflow-hidden">
                        {getProfileImageUrl(employee.profile_image) ? (
                          <img
                            src={getProfileImageUrl(employee.profile_image)}
                            alt={employee.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-sm font-bold text-mega-secondary">
                            {employee.name.charAt(0)}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{employee.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <PositionBadge position={employee.position} />
                      {selected?.id === employee.id && (
                        <Check className="size-4 text-mega-secondary shrink-0" />
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* 총 인원 표시 */}
            {!isError && employees.length > 0 && (
              <div className="px-4 py-2 border-t border-gray-100 bg-gray-50">
                <span className="text-xs text-gray-400">
                  총 {employees.length}명 {query && `· 검색결과 ${filtered.length}명`}
                </span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
});

WorkStatusUserSelect.displayName = 'WorkStatusUserSelect';
