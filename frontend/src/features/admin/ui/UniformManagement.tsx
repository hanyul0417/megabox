import { useState } from 'react';
import { Pencil, X, Check, Shirt } from 'lucide-react';

import { useUniformsQuery, useUpsertUniformMutation } from '../api/queries';

import type { UniformWithUserDTO, UpdateUniformRequestDTO } from '../api/dto';

import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Spinner } from '@/shared/components/ui/spinner';

// ── 상수 ──────────────────────────────────────────────────────────────────────

const HAT_OPTIONS   = ['헌팅캡', '페도라'];
const GENDER_OPTIONS = ['남', '여'];
const TOP_OPTIONS   = ['체크', '데님'];

const NONE_VALUE = '__none__';

// ── 헬퍼 ──────────────────────────────────────────────────────────────────────

function toSelectValue(v: string | null | undefined) {
  return v || NONE_VALUE;
}

function fromSelectValue(v: string): string | null {
  return v === NONE_VALUE ? null : v;
}

function hasAnyUniform(u: UniformWithUserDTO) {
  return !!(u.hat || u.belt || u.top_style || u.bottom_style || u.necktie);
}

type EditState = Required<UpdateUniformRequestDTO>;

function initEdit(u: UniformWithUserDTO): EditState {
  return {
    hat:          u.hat          ?? null,
    belt:         u.belt         ?? null,
    top_style:    u.top_style    ?? null,
    top_size:     u.top_size     ?? null,
    bottom_style: u.bottom_style ?? null,
    bottom_size:  u.bottom_size  ?? null,
    necktie:      u.necktie      ?? null,
  };
}

// ── 선택 셀 ──────────────────────────────────────────────────────────────────

function SelectCell({
  value, options, onChange,
}: {
  value: string | null | undefined;
  options: string[];
  onChange: (v: string | null) => void;
}) {
  return (
    <Select value={toSelectValue(value)} onValueChange={(v) => onChange(fromSelectValue(v))}>
      <SelectTrigger className="h-7 w-full text-xs min-w-[80px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE_VALUE}>
          <span className="text-muted-foreground">미지급</span>
        </SelectItem>
        {options.map((o) => (
          <SelectItem key={o} value={o}>{o}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ── 뷰 셀 ────────────────────────────────────────────────────────────────────

function ViewCell({ value }: { value: string | null | undefined }) {
  if (!value) return <span className="text-muted-foreground text-xs">-</span>;
  return <span className="text-xs font-medium">{value}</span>;
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────

const UniformManagement = () => {
  const { data: uniforms = [], isLoading } = useUniformsQuery();
  const { mutate: upsert, isPending } = useUpsertUniformMutation();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);

  const handleEdit = (u: UniformWithUserDTO) => {
    setEditingId(u.user_id);
    setEditState(initEdit(u));
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditState(null);
  };

  const handleSave = (userId: number) => {
    if (!editState) return;
    upsert(
      { userId, data: editState },
      { onSuccess: handleCancel },
    );
  };

  const set = (key: keyof EditState, value: string | null) => {
    setEditState((prev) => prev ? { ...prev, [key]: value } : prev);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="size-6 text-mega" />
      </div>
    );
  }

  if (uniforms.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-2">
        <Shirt className="size-10 opacity-30" />
        <p className="text-sm">크루·리더 직원이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        크루·리더 직원의 유니폼 지급 현황을 관리합니다. 미지급 항목은 <span className="font-medium">—</span> 로 표시됩니다.
      </p>

      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-600 whitespace-nowrap">이름</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-600 whitespace-nowrap">직급</th>
              <th className="text-center px-3 py-2.5 text-xs font-semibold text-gray-600 whitespace-nowrap">상태</th>
              <th className="text-center px-3 py-2.5 text-xs font-semibold text-gray-600 whitespace-nowrap">모자</th>
              <th className="text-center px-3 py-2.5 text-xs font-semibold text-gray-600 whitespace-nowrap">벨트</th>
              <th className="text-center px-3 py-2.5 text-xs font-semibold text-gray-600 whitespace-nowrap">상의</th>
              <th className="text-center px-3 py-2.5 text-xs font-semibold text-gray-600 whitespace-nowrap">상의사이즈</th>
              <th className="text-center px-3 py-2.5 text-xs font-semibold text-gray-600 whitespace-nowrap">하의</th>
              <th className="text-center px-3 py-2.5 text-xs font-semibold text-gray-600 whitespace-nowrap">하의사이즈</th>
              <th className="text-center px-3 py-2.5 text-xs font-semibold text-gray-600 whitespace-nowrap">넥타이</th>
              <th className="px-3 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {uniforms.map((u) => {
              const isEditing = editingId === u.user_id;
              const issued = hasAnyUniform(u);
              const e = isEditing && editState ? editState : null;

              return (
                <tr key={u.user_id} className="hover:bg-gray-50/60 transition-colors">
                  {/* 이름 */}
                  <td className="px-4 py-2.5 font-medium whitespace-nowrap">{u.name}</td>
                  {/* 직급 */}
                  <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">{u.position}</td>
                  {/* 지급상태 */}
                  <td className="px-3 py-2.5 text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      issued ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {issued ? '지급완료' : '미지급'}
                    </span>
                  </td>
                  {/* 모자 */}
                  <td className="px-3 py-2.5 text-center">
                    {isEditing && e
                      ? <SelectCell value={e.hat} options={HAT_OPTIONS} onChange={(v) => set('hat', v)} />
                      : <ViewCell value={u.hat} />}
                  </td>
                  {/* 벨트 */}
                  <td className="px-3 py-2.5 text-center">
                    {isEditing && e
                      ? <SelectCell value={e.belt} options={GENDER_OPTIONS} onChange={(v) => set('belt', v)} />
                      : <ViewCell value={u.belt} />}
                  </td>
                  {/* 상의 스타일 */}
                  <td className="px-3 py-2.5 text-center">
                    {isEditing && e
                      ? <SelectCell value={e.top_style} options={TOP_OPTIONS} onChange={(v) => set('top_style', v)} />
                      : <ViewCell value={u.top_style} />}
                  </td>
                  {/* 상의 사이즈 */}
                  <td className="px-3 py-2.5 text-center">
                    {isEditing && e
                      ? <Input
                          value={e.top_size ?? ''}
                          onChange={(ev) => set('top_size', ev.target.value || null)}
                          placeholder="예) L"
                          className="h-7 w-20 text-xs text-center px-1"
                        />
                      : <ViewCell value={u.top_size} />}
                  </td>
                  {/* 하의 */}
                  <td className="px-3 py-2.5 text-center">
                    {isEditing && e
                      ? <SelectCell value={e.bottom_style} options={GENDER_OPTIONS} onChange={(v) => set('bottom_style', v)} />
                      : <ViewCell value={u.bottom_style} />}
                  </td>
                  {/* 하의 사이즈 */}
                  <td className="px-3 py-2.5 text-center">
                    {isEditing && e
                      ? <Input
                          value={e.bottom_size ?? ''}
                          onChange={(ev) => set('bottom_size', ev.target.value || null)}
                          placeholder="예) 28"
                          className="h-7 w-20 text-xs text-center px-1"
                        />
                      : <ViewCell value={u.bottom_size} />}
                  </td>
                  {/* 넥타이 */}
                  <td className="px-3 py-2.5 text-center">
                    {isEditing && e
                      ? <SelectCell value={e.necktie} options={GENDER_OPTIONS} onChange={(v) => set('necktie', v)} />
                      : <ViewCell value={u.necktie} />}
                  </td>
                  {/* 액션 */}
                  <td className="px-3 py-2.5 text-right whitespace-nowrap">
                    {isEditing ? (
                      <div className="flex items-center gap-1 justify-end">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-gray-400 hover:text-gray-600"
                          onClick={handleCancel}
                          disabled={isPending}
                        >
                          <X className="size-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          className="h-7 px-2 text-xs bg-mega hover:bg-mega/90"
                          onClick={() => handleSave(u.user_id)}
                          disabled={isPending}
                        >
                          {isPending ? <Spinner className="size-3" /> : <><Check className="size-3 mr-1" />저장</>}
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs text-gray-500 hover:text-mega"
                        onClick={() => handleEdit(u)}
                      >
                        <Pencil className="size-3 mr-1" />
                        편집
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UniformManagement;
