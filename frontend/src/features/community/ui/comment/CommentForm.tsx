import { Send } from 'lucide-react';
import { memo, useCallback, useEffect, useRef, useState } from 'react';

import { searchUsersForMention } from '../../api/service';

import type { UserSearchResultDTO } from '../../api/dto';

import { cn } from '@/shared/lib/utils';

interface CommentFormProps {
  onSubmit: (content: string) => void;
  isLoading?: boolean;
  placeholder?: string;
}

const CommentForm = memo(({ onSubmit, isLoading, placeholder }: CommentFormProps) => {
  const [content, setContent] = useState('');
  const [mentionQuery, setMentionQuery] = useState('');
  const [suggestions, setSuggestions] = useState<UserSearchResultDTO[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const suggestionRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

  const isEmpty = !content.trim();

  // @ 트리거 감지
  const detectMention = useCallback((text: string, cursorPos: number) => {
    const textBeforeCursor = text.slice(0, cursorPos);
    const match = textBeforeCursor.match(/@([\w가-힣]*)$/);
    if (match) {
      setMentionQuery(match[1]);
      return true;
    }
    setMentionQuery('');
    setShowSuggestions(false);
    setSuggestions([]);
    return false;
  }, []);

  // 유저 검색 (디바운스)
  useEffect(() => {
    if (!mentionQuery && mentionQuery !== '') {
      setShowSuggestions(false);
      setSuggestions([]);
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await searchUsersForMention(mentionQuery);
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
        setSelectedIndex(0);
      } catch {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 200);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [mentionQuery]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setContent(newValue);
    detectMention(newValue, e.target.selectionStart ?? newValue.length);
  };

  // 멘션 선택 - 텍스트에 @username 삽입
  const selectMention = useCallback(
    (user: UserSearchResultDTO) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const cursorPos = textarea.selectionStart ?? content.length;
      const textBeforeCursor = content.slice(0, cursorPos);
      const textAfterCursor = content.slice(cursorPos);

      // @ 이후 입력된 부분을 name으로 교체
      const newTextBefore = textBeforeCursor.replace(/@([\w가-힣]*)$/, `@${user.name} `);
      const newContent = newTextBefore + textAfterCursor;

      setContent(newContent);
      setShowSuggestions(false);
      setSuggestions([]);
      setMentionQuery('');

      // 커서 위치 조정
      setTimeout(() => {
        if (textarea) {
          const newCursorPos = newTextBefore.length;
          textarea.setSelectionRange(newCursorPos, newCursorPos);
          textarea.focus();
        }
      }, 0);
    },
    [content],
  );

  const handleSubmit = () => {
    if (isEmpty || isLoading) return;
    onSubmit(content.trim());
    setContent('');
    setShowSuggestions(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing) return;

    // 자동완성 탐색
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, suggestions.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === 'Tab' || e.key === 'Enter') {
        if (showSuggestions) {
          e.preventDefault();
          selectMention(suggestions[selectedIndex]);
          return;
        }
      }
      if (e.key === 'Escape') {
        setShowSuggestions(false);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="relative flex gap-3 items-end">
      <div className="flex-1 relative">
        {/* 멘션 자동완성 드롭다운 */}
        {showSuggestions && suggestions.length > 0 && (
          <div
            ref={suggestionRef}
            className={cn(
              'absolute bottom-full mb-1 left-0 right-0 z-50',
              'bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden',
              'max-h-48 overflow-y-auto',
            )}
          >
            {suggestions.map((user, index) => (
              <button
                key={user.id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault(); // textarea blur 방지
                  selectMention(user);
                }}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors',
                  index === selectedIndex ? 'bg-mega/5' : 'hover:bg-gray-50',
                )}
              >
                {/* 아바타 */}
                <div className="flex items-center justify-center w-7 h-7 rounded-full bg-mega-secondary/10 shrink-0">
                  <span className="text-[11px] font-bold text-mega-secondary">
                    {user.name.charAt(0)}
                  </span>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-medium text-gray-800 truncate">{user.name}</span>
                  <span className="text-[11px] text-gray-400">
                    @{user.name} · {user.position}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={
            placeholder ?? '댓글을 입력하세요  (Enter: 등록, Shift+Enter: 줄바꿈, @: 유저 태그)'
          }
          rows={2}
          className={cn(
            'w-full resize-none rounded-2xl border px-4 py-3 text-sm leading-relaxed',
            'placeholder:text-gray-400 bg-gray-50 transition-all',
            'focus:outline-none focus:ring-2 focus:ring-mega-secondary/20 focus:border-mega-secondary/40 focus:bg-white',
            'border-gray-200',
          )}
        />
      </div>
      <button
        type="button"
        onClick={handleSubmit}
        disabled={isEmpty || isLoading}
        className={cn(
          'flex items-center justify-center w-10 h-10 rounded-2xl transition-all duration-150 shrink-0 mb-0.5',
          'disabled:opacity-40 disabled:cursor-not-allowed',
          isEmpty || isLoading
            ? 'bg-gray-100 text-gray-400'
            : 'bg-mega text-white hover:bg-nav-bg shadow-sm active:scale-95',
        )}
      >
        {isLoading ? (
          <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
        ) : (
          <Send className="size-4" />
        )}
      </button>
    </div>
  );
});

CommentForm.displayName = 'CommentForm';
export default CommentForm;
