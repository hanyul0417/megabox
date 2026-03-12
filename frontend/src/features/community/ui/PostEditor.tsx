import { PenLine } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { useCreatePostMutation, useUpdatePostMutation } from '../api/queries';

import { Button } from '@/shared/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';

type Category = '공지' | '자유게시판';

interface PostEditorProps {
  open: boolean;
  onClose: () => void;
  editTarget?: {
    id: number;
    title: string;
    content: string;
    category: Category;
  };
  fixedCategory?: Category;
}

// 직접 작성 가능한 카테고리만 (근무교대/휴무신청은 시스템 자동생성)
const WRITABLE_CATEGORIES: Category[] = ['공지', '자유게시판'];

const CATEGORY_STYLE: Record<Category, string> = {
  공지: 'border-red-300 bg-red-50 text-red-700',
  자유게시판: 'border-purple-300 bg-purple-50 text-purple-700',
};

export function PostEditor({ open, onClose, editTarget, fixedCategory }: PostEditorProps) {
  const isEdit = !!editTarget;

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<Category>(fixedCategory ?? '자유게시판');

  const { mutateAsync: createPost, isPending: isCreating } = useCreatePostMutation();
  const { mutateAsync: updatePost, isPending: isUpdating } = useUpdatePostMutation();
  const isPending = isCreating || isUpdating;

  useEffect(() => {
    if (editTarget) {
      setTitle(editTarget.title);
      setContent(editTarget.content);
      setCategory(editTarget.category);
    } else {
      setTitle('');
      setContent('');
      setCategory(fixedCategory ?? '자유게시판');
    }
  }, [editTarget, fixedCategory, open]);

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error('제목을 입력해주세요.');
      return;
    }
    if (!content.trim()) {
      toast.error('내용을 입력해주세요.');
      return;
    }

    try {
      if (isEdit && editTarget) {
        await updatePost({ id: editTarget.id, data: { title, content } });
        toast.success('게시글이 수정되었습니다.');
      } else {
        await createPost({ title, content, category });
        toast.success('게시글이 등록되었습니다.');
      }
      onClose();
    } catch {
      toast.error(isEdit ? '수정에 실패했습니다.' : '등록에 실패했습니다.');
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="max-w-2xl w-full p-0 gap-0 overflow-hidden" showCloseButton={false}>
        {/* 헤더 */}
        <DialogHeader className="px-6 py-4 border-b border-gray-100">
          <DialogTitle className="flex items-center gap-2 text-base font-semibold text-gray-900">
            <PenLine className="size-4 text-mega-secondary" />
            {isEdit ? '게시글 수정' : '새 게시글 작성'}
          </DialogTitle>
        </DialogHeader>

        {/* 본문 */}
        <div className="px-6 py-5 flex flex-col gap-5 max-h-[70vh] overflow-y-auto">
          {/* 카테고리 선택 (고정이 아닐 때만) */}
          {!fixedCategory && (
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                게시판
              </label>
              <div className="flex flex-wrap gap-2">
                {WRITABLE_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border-2 transition-all ${
                      category === cat
                        ? CATEGORY_STYLE[cat]
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 제목 */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              제목
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="제목을 입력하세요"
              maxLength={100}
              className="h-11 text-sm font-medium"
            />
          </div>

          {/* 내용 */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              내용
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="내용을 입력하세요"
              rows={8}
              className="w-full resize-none rounded-xl border border-input bg-transparent px-3 py-2.5 text-sm leading-relaxed placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-mega-secondary/30 focus:border-mega-secondary/50 transition-all"
            />
            <div className="text-right text-[11px] text-gray-400">{content.length}자</div>
          </div>

          {/* 안내 */}
          <div className="text-[11px] text-gray-400 bg-gray-50 rounded-xl px-4 py-3 leading-relaxed">
            게시글 작성 시 실명이 공개됩니다. 댓글에서 @username 으로 동료를 태그할 수 있습니다.
          </div>
        </div>

        {/* 푸터 버튼 */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={isPending} className="rounded-xl">
            취소
          </Button>
          <Button
            onClick={() => void handleSubmit()}
            disabled={isPending}
            className="bg-mega hover:bg-nav-bg text-white rounded-xl min-w-[72px]"
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                처리 중
              </span>
            ) : isEdit ? (
              '수정 완료'
            ) : (
              '등록'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
