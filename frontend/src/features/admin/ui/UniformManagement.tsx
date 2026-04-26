import { useState } from 'react';
import { Pencil, X, Check, Shirt, Package } from 'lucide-react';

import {
  useUniformsQuery,
  useUpsertUniformMutation,
  useUniformStockQuery,
  useUpdateUniformStockMutation,
} from '../api/queries';

import type { UniformWithUserDTO, UpdateUniformRequestDTO, UniformStockDTO } from '../api/dto';

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

const HAT_OPTIONS     = ['헌팅캡', '페도라'];
const GENDER_OPTIONS  = ['남', '여'];
const TOP_STYLE_OPTIONS = ['체크', '데님'];
const NONE_VALUE      = '__none__';

// 상의: 성별 무관, 전체 사이즈 제공 (남자·여자 모두 상대방 사이즈 착용 가능)
const TOP_SIZE_MALE   = ['95', '100', '105', '110', '115'];
const TOP_SIZE_FEMALE = ['44', '55', '66', '77'];

// 하의: bottom_style 기준으로 사이즈 결정 (컷이 다르므로)
const BOTTOM_SIZE: Record<string, string[]> = {
  남: ['29', '30', '32', '34', '36'],
  여: ['44', '55', '66', '77'],
};

const STOCK_CATEGORY_ORDER = ['모자', '벨트', '상의', '하의', '넥타이'];

// ── 헬퍼 ──────────────────────────────────────────────────────────────────────

function toSelectValue(v: string | null | undefined) { return v || NONE_VALUE; }
function fromSelectValue(v: string): string | null   { return v === NONE_VALUE ? null : v; }
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

// ── 공통 셀 ───────────────────────────────────────────────────────────────────

function SelectCell({ value, options, onChange, groupLabels }: {
  value: string | null | undefined;
  options: string[];
  onChange: (v: string | null) => void;
  groupLabels?: { after: string; label: string }[];
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
        {options.map((o, idx) => {
          const groupLabel = groupLabels?.find((g) => g.after === options[idx - 1]);
          return (
            <>
              {groupLabel && (
                <div key={`g-${o}`} className="px-2 pt-1.5 pb-0.5 text-[10px] font-semibold text-muted-foreground uppercase">
                  {groupLabel.label}
                </div>
              )}
              <SelectItem key={o} value={o}>{o}</SelectItem>
            </>
          );
        })}
      </SelectContent>
    </Select>
  );
}

function ViewCell({ value }: { value: string | null | undefined }) {
  if (!value) return <span className="text-muted-foreground text-xs">-</span>;
  return <span className="text-xs font-medium">{value}</span>;
}

// ── 재고 섹션 ─────────────────────────────────────────────────────────────────

function StockSection() {
  const { data: stockList = [], isLoading } = useUniformStockQuery();
  const { mutate: updateStock } = useUpdateUniformStockMutation();
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editQty, setEditQty]       = useState<string>('');

  const grouped = STOCK_CATEGORY_ORDER.map((cat) => ({
    category: cat,
    items: stockList.filter((s) => s.category === cat),
  })).filter((g) => g.items.length > 0);

  const totalQty    = stockList.reduce((s, i) => s + i.quantity, 0);
  const totalIssued = stockList.reduce((s, i) => s + i.issued, 0);
  const totalRemain = stockList.reduce((s, i) => s + i.remaining, 0);

  const startEdit = (item: UniformStockDTO) => {
    setEditingKey(item.item_key);
    setEditQty(String(item.quantity));
  };

  const saveEdit = (item: UniformStockDTO) => {
    const qty = parseInt(editQty, 10);
    if (isNaN(qty) || qty < 0) return;
    updateStock({ itemKey: item.item_key, data: { quantity: qty } }, {
      onSuccess: () => setEditingKey(null),
    });
  };

  if (isLoading) {
    return <div className="flex justify-center py-10"><Spinner className="size-5 text-mega" /></div>;
  }

  // 상의/하의는 variant 기준 서브그룹 (앞 2토큰: "데님 남", "체크 여" 등)
  function getSubgroup(item: UniformStockDTO) {
    const parts = item.variant.split(' ');
    return parts.slice(0, 2).join(' '); // "데님 남" / "체크 여" / "남" / "여"
  }

  return (
    <div className="space-y-3">
      {/* 합계 카드 */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: '총 재고', value: totalQty,    color: 'text-blue-600 bg-blue-50' },
          { label: '총 지급', value: totalIssued, color: 'text-green-600 bg-green-50' },
          { label: '총 잔여', value: totalRemain, color: totalRemain < 0 ? 'text-red-600 bg-red-50' : 'text-gray-700 bg-gray-50' },
        ].map(({ label, value, color }) => (
          <div key={label} className={`rounded-xl p-4 ${color.split(' ')[1]} text-center`}>
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className={`text-2xl font-bold ${color.split(' ')[0]}`}>{value}</p>
            <p className="text-xs text-gray-400">개</p>
          </div>
        ))}
      </div>

      {/* 카테고리별 테이블 */}
      <div className="space-y-4">
        {grouped.map(({ category, items }) => {
          // 상의/하의는 서브그룹핑
          const needsSubgroup = category === '상의' || category === '하의';
          const subgroups: { label: string; rows: UniformStockDTO[] }[] = [];
          if (needsSubgroup) {
            const seen = new Map<string, UniformStockDTO[]>();
            items.forEach((item) => {
              const sg = getSubgroup(item);
              if (!seen.has(sg)) seen.set(sg, []);
              seen.get(sg)!.push(item);
            });
            seen.forEach((rows, label) => subgroups.push({ label, rows }));
          }

          return (
            <div key={category} className="rounded-xl border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                <span className="text-xs font-semibold text-gray-700">{category}</span>
              </div>

              {needsSubgroup ? (
                subgroups.map(({ label, rows }) => (
                  <div key={label}>
                    <div className="bg-gray-50/60 px-4 py-1.5 border-b border-gray-100">
                      <span className="text-[11px] font-medium text-gray-500">{label}</span>
                    </div>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 w-20">사이즈</th>
                          <th className="text-center px-4 py-2 text-xs font-medium text-gray-500">재고</th>
                          <th className="text-center px-4 py-2 text-xs font-medium text-gray-500">지급</th>
                          <th className="text-center px-4 py-2 text-xs font-medium text-gray-500">잔여</th>
                          <th className="px-3 py-2 w-20" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {rows.map((item) => {
                          const isEdit = editingKey === item.item_key;
                          const size = item.variant.split(' ').pop() ?? item.variant;
                          const remainColor = item.remaining < 0
                            ? 'text-red-600 font-semibold'
                            : item.remaining === 0
                            ? 'text-amber-600'
                            : 'text-green-700';
                          return (
                            <tr key={item.item_key} className="hover:bg-gray-50/60">
                              <td className="px-4 py-2 text-xs font-medium">{size}</td>
                              <td className="px-4 py-2 text-center">
                                {isEdit ? (
                                  <Input
                                    type="number" min={0} value={editQty}
                                    onChange={(e) => setEditQty(e.target.value)}
                                    className="h-7 w-20 text-xs text-center mx-auto"
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') saveEdit(item);
                                      if (e.key === 'Escape') setEditingKey(null);
                                    }}
                                  />
                                ) : (
                                  <span className="text-xs font-medium">{item.quantity}</span>
                                )}
                              </td>
                              <td className="px-4 py-2 text-center text-xs text-gray-600">{item.issued}</td>
                              <td className={`px-4 py-2 text-center text-xs ${remainColor}`}>{item.remaining}</td>
                              <td className="px-3 py-2 text-right">
                                {isEdit ? (
                                  <div className="flex gap-1 justify-end">
                                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-gray-400 hover:text-gray-600" onClick={() => setEditingKey(null)}>
                                      <X className="size-3.5" />
                                    </Button>
                                    <Button size="sm" className="h-7 px-2 text-xs bg-mega hover:bg-mega/90" onClick={() => saveEdit(item)}>
                                      <Check className="size-3 mr-0.5" />저장
                                    </Button>
                                  </div>
                                ) : (
                                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-gray-500 hover:text-mega" onClick={() => startEdit(item)}>
                                    <Pencil className="size-3 mr-1" />편집
                                  </Button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ))
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">종류</th>
                      <th className="text-center px-4 py-2 text-xs font-medium text-gray-500">재고</th>
                      <th className="text-center px-4 py-2 text-xs font-medium text-gray-500">지급</th>
                      <th className="text-center px-4 py-2 text-xs font-medium text-gray-500">잔여</th>
                      <th className="px-3 py-2 w-20" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {items.map((item) => {
                      const isEdit = editingKey === item.item_key;
                      const remainColor = item.remaining < 0
                        ? 'text-red-600 font-semibold'
                        : item.remaining === 0
                        ? 'text-amber-600'
                        : 'text-green-700';
                      return (
                        <tr key={item.item_key} className="hover:bg-gray-50/60">
                          <td className="px-4 py-2 text-xs text-gray-600">{item.variant}</td>
                          <td className="px-4 py-2 text-center">
                            {isEdit ? (
                              <Input
                                type="number" min={0} value={editQty}
                                onChange={(e) => setEditQty(e.target.value)}
                                className="h-7 w-20 text-xs text-center mx-auto"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveEdit(item);
                                  if (e.key === 'Escape') setEditingKey(null);
                                }}
                              />
                            ) : (
                              <span className="text-xs font-medium">{item.quantity}</span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-center text-xs text-gray-600">{item.issued}</td>
                          <td className={`px-4 py-2 text-center text-xs ${remainColor}`}>{item.remaining}</td>
                          <td className="px-3 py-2 text-right">
                            {isEdit ? (
                              <div className="flex gap-1 justify-end">
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-gray-400 hover:text-gray-600" onClick={() => setEditingKey(null)}>
                                  <X className="size-3.5" />
                                </Button>
                                <Button size="sm" className="h-7 px-2 text-xs bg-mega hover:bg-mega/90" onClick={() => saveEdit(item)}>
                                  <Check className="size-3 mr-0.5" />저장
                                </Button>
                              </div>
                            ) : (
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-gray-500 hover:text-mega" onClick={() => startEdit(item)}>
                                <Pencil className="size-3 mr-1" />편집
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── 지급현황 섹션 ─────────────────────────────────────────────────────────────

function IssueSection() {
  const { data: uniforms = [], isLoading } = useUniformsQuery();
  const { mutate: upsert, isPending } = useUpsertUniformMutation();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);

  const handleEdit   = (u: UniformWithUserDTO) => { setEditingId(u.user_id); setEditState(initEdit(u)); };
  const handleCancel = () => { setEditingId(null); setEditState(null); };
  const handleSave   = (userId: number) => {
    if (!editState) return;
    upsert({ userId, data: editState }, { onSuccess: handleCancel });
  };
  const set = (key: keyof EditState, value: string | null) =>
    setEditState((prev) => prev ? { ...prev, [key]: value } : prev);

  if (isLoading) return <div className="flex justify-center py-10"><Spinner className="size-5 text-mega" /></div>;

  if (uniforms.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
        <Shirt className="size-10 opacity-30" />
        <p className="text-sm">크루·리더 직원이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            {['이름', '직급', '상태', '모자', '벨트', '상의', '상의사이즈', '하의', '하의사이즈', '넥타이', ''].map((h) => (
              <th
                key={h}
                className={`px-3 py-2.5 text-xs font-semibold text-gray-600 whitespace-nowrap ${
                  h === '이름' || h === '직급' ? 'text-left' : 'text-center'
                }`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {uniforms.map((u) => {
            const isEditing = editingId === u.user_id;
            const e = isEditing && editState ? editState : null;
            const issued = hasAnyUniform(u);

            // 하의사이즈 옵션: 현재 편집중인 bottom_style 기준
            const bottomSizeOptions = BOTTOM_SIZE[e?.bottom_style ?? u.bottom_style ?? ''] ?? [];

            return (
              <tr key={u.user_id} className="hover:bg-gray-50/60 transition-colors">
                {/* 이름 */}
                <td className="px-3 py-2.5 font-medium whitespace-nowrap">{u.name}</td>
                {/* 직급 */}
                <td className="px-3 py-2.5 text-gray-500 text-xs whitespace-nowrap">{u.position}</td>
                {/* 상태 */}
                <td className="px-3 py-2.5 text-center">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${issued ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {issued ? '지급완료' : '미지급'}
                  </span>
                </td>
                {/* 모자 */}
                <td className="px-3 py-2.5 text-center">
                  {e ? <SelectCell value={e.hat} options={HAT_OPTIONS} onChange={(v) => set('hat', v)} />
                     : <ViewCell value={u.hat} />}
                </td>
                {/* 벨트 */}
                <td className="px-3 py-2.5 text-center">
                  {e ? <SelectCell value={e.belt} options={GENDER_OPTIONS} onChange={(v) => set('belt', v)} />
                     : <ViewCell value={u.belt} />}
                </td>
                {/* 상의 스타일 */}
                <td className="px-3 py-2.5 text-center">
                  {e ? (
                    <Select
                      value={toSelectValue(e.top_style)}
                      onValueChange={(v) => {
                        set('top_style', fromSelectValue(v));
                        set('top_size', null); // 스타일 바꾸면 사이즈 초기화
                      }}
                    >
                      <SelectTrigger className="h-7 w-full text-xs min-w-[70px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE_VALUE}>
                          <span className="text-muted-foreground">미지급</span>
                        </SelectItem>
                        {TOP_STYLE_OPTIONS.map((o) => (
                          <SelectItem key={o} value={o}>{o}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : <ViewCell value={u.top_style} />}
                </td>
                {/* 상의 사이즈: 남/여 모두 가능 (크로스 사이즈 허용) */}
                <td className="px-3 py-2.5 text-center">
                  {e ? (
                    <Select
                      value={toSelectValue(e.top_size)}
                      onValueChange={(v) => set('top_size', fromSelectValue(v))}
                      disabled={!e.top_style}
                    >
                      <SelectTrigger className="h-7 w-full text-xs min-w-[80px]">
                        <SelectValue placeholder="사이즈" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE_VALUE}>
                          <span className="text-muted-foreground">-</span>
                        </SelectItem>
                        <div className="px-2 pt-1.5 pb-0.5 text-[10px] font-semibold text-muted-foreground">
                          남 사이즈
                        </div>
                        {TOP_SIZE_MALE.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                        <div className="px-2 pt-1.5 pb-0.5 text-[10px] font-semibold text-muted-foreground">
                          여 사이즈
                        </div>
                        {TOP_SIZE_FEMALE.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : <ViewCell value={u.top_size} />}
                </td>
                {/* 하의 스타일 */}
                <td className="px-3 py-2.5 text-center">
                  {e ? (
                    <Select
                      value={toSelectValue(e.bottom_style)}
                      onValueChange={(v) => {
                        set('bottom_style', fromSelectValue(v));
                        set('bottom_size', null); // 스타일 바꾸면 사이즈 초기화
                      }}
                    >
                      <SelectTrigger className="h-7 w-full text-xs min-w-[60px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE_VALUE}>
                          <span className="text-muted-foreground">미지급</span>
                        </SelectItem>
                        {GENDER_OPTIONS.map((o) => (
                          <SelectItem key={o} value={o}>{o}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : <ViewCell value={u.bottom_style} />}
                </td>
                {/* 하의 사이즈: bottom_style 기준 */}
                <td className="px-3 py-2.5 text-center">
                  {e ? (
                    <Select
                      value={toSelectValue(e.bottom_size)}
                      onValueChange={(v) => set('bottom_size', fromSelectValue(v))}
                      disabled={!e.bottom_style}
                    >
                      <SelectTrigger className="h-7 w-full text-xs min-w-[80px]">
                        <SelectValue placeholder="사이즈" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE_VALUE}>
                          <span className="text-muted-foreground">-</span>
                        </SelectItem>
                        {bottomSizeOptions.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : <ViewCell value={u.bottom_size} />}
                </td>
                {/* 넥타이 */}
                <td className="px-3 py-2.5 text-center">
                  {e ? <SelectCell value={e.necktie} options={GENDER_OPTIONS} onChange={(v) => set('necktie', v)} />
                     : <ViewCell value={u.necktie} />}
                </td>
                {/* 액션 */}
                <td className="px-3 py-2.5 text-right whitespace-nowrap">
                  {isEditing ? (
                    <div className="flex items-center gap-1 justify-end">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-gray-400 hover:text-gray-600" onClick={handleCancel} disabled={isPending}>
                        <X className="size-3.5" />
                      </Button>
                      <Button size="sm" className="h-7 px-2 text-xs bg-mega hover:bg-mega/90" onClick={() => handleSave(u.user_id)} disabled={isPending}>
                        {isPending ? <Spinner className="size-3" /> : <><Check className="size-3 mr-1" />저장</>}
                      </Button>
                    </div>
                  ) : (
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-gray-500 hover:text-mega" onClick={() => handleEdit(u)}>
                      <Pencil className="size-3 mr-1" />편집
                    </Button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────

type Tab = 'issue' | 'stock';

const UniformManagement = () => {
  const [tab, setTab] = useState<Tab>('issue');

  const tabCls = (t: Tab) =>
    `px-4 py-2 rounded-lg text-xs font-medium transition-all duration-150 whitespace-nowrap flex items-center gap-1.5 ${
      tab === t
        ? 'bg-white text-mega font-semibold shadow-sm border border-gray-200'
        : 'text-gray-500 hover:text-gray-700 hover:bg-white/60'
    }`;

  return (
    <div className="space-y-4">
      <div className="flex gap-1.5 bg-gray-100/70 rounded-xl p-1 w-fit">
        <button className={tabCls('issue')} onClick={() => setTab('issue')}>
          <Shirt className="size-3.5" />지급 현황
        </button>
        <button className={tabCls('stock')} onClick={() => setTab('stock')}>
          <Package className="size-3.5" />재고 관리
        </button>
      </div>

      {tab === 'issue' && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            크루·리더 직원의 유니폼 지급 현황입니다.{' '}
            <span className="text-red-500 font-medium">퇴사</span> 직원도 함께 표시됩니다.
            상의 사이즈는 남/여 구분 없이 선택 가능합니다.
          </p>
          <IssueSection />
        </div>
      )}

      {tab === 'stock' && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            유니폼 항목별 보유 재고를 입력하세요.{' '}
            <span className="font-medium">잔여 = 재고 − 지급</span> 으로 계산됩니다.
          </p>
          <StockSection />
        </div>
      )}
    </div>
  );
};

export default UniformManagement;
