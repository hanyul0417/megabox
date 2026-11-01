import { Captions, MessageSquare } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { useCreatePostMutation } from '../../api/queries';

import type { PostModalProps } from '../../model/modalType';

import { Input } from '@/shared/components/ui/input';

export default function CommunityModal({
  mode,
  category,
  onClose,
  onSubmit,
  initialData,
}: PostModalProps) {
  const isCreate = mode === 'create';

  const { mutateAsync, isPending } = useCreatePostMutation();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  // 수정일 경우 초기값 유지
  useEffect(() => {
    if (!isCreate && initialData) {
      setTitle(initialData.title);
      setContent(initialData.content);
    }
  }, [isCreate, initialData]);

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) {
      toast.error('제목 및 내용을 모두 입력하세요.');
      return;
    }

    try {
      if (isCreate) {
        await mutateAsync({ title, content, category });
        toast.success('등록이 완료되었습니다!');
      } else {
        await onSubmit({ title, content });
        toast.success('수정이 완료되었습니다!');
      }

      onClose();
    } catch {
      toast.error(isCreate ? '등록에 실패했습니다.' : '수정에 실패했습니다.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white w-[92vw] max-w-[520px] max-h-[85vh] rounded-lg overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between bg-mega text-white px-4 sm:px-6 py-3 sm:py-4">
          <div className="text-base sm:text-lg font-bold">
            {isCreate
              ? category === '공지'
                ? '공지사항 작성'
                : '자유게시판 작성'
              : category === '공지'
                ? '공지사항 수정'
                : '자유게시판 수정'}
          </div>
          <button onClick={onClose} className="text-xl sm:text-2xl text-white/80 hover:text-white">
            ×
          </button>
        </div>

        <div className="flex flex-col gap-6 sm:gap-8 p-4 sm:p-5 overflow-y-auto">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1">
              <Captions size={18} />
              <div className="text-sm font-bold">제목</div>
            </div>
            <Input
              placeholder="제목"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className=" px-3 py-2 rounded placeholder:text-sm placeholder:text-gray-500"
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1">
              <MessageSquare size={18} />
              <div className="text-sm font-bold">내용</div>
            </div>
            <textarea
              placeholder="내용"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="border border-input px-3 py-2 rounded h-32 sm:h-40 resize-none placeholder:text-sm placeholder:text-gray-500"
            />
          </div>

          <div className="text-[11px] sm:text-xs border border-gray-300 rounded-lg bg-gray-100 p-3 sm:p-4 mb-2">
            게시글 작성 시 실명이 표시됩니다. 익명기능은 제공하지 않습니다.
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-center gap-2 px-4 sm:px-6 pb-5">
          <button onClick={onClose} className="px-4 py-2 border rounded">
            취소
          </button>
          <button
            onClick={() => void handleSubmit()}
            disabled={isPending}
            className="px-4 py-2 bg-mega text-white rounded disabled:opacity-50"
          >
            {isCreate ? '등록' : '수정'}
          </button>
        </div>
      </div>
    </div>
  );
}
