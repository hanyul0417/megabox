import { Megaphone } from 'lucide-react';

import { useActiveKioskNoticesQuery } from '@/features/admin/api/queries';

/**
 * 키오스크 근태 화면 상단 공지사항 배너
 * - 현재 활성 공지(오늘 날짜가 start_date~end_date 범위)를 모두 표시
 * - 공지 없으면 렌더링하지 않음
 */
export function KioskNoticeBanner() {
  const { data: notices = [], isLoading } = useActiveKioskNoticesQuery();

  if (isLoading || notices.length === 0) return null;

  return (
    <div className="bg-[#1a0f3c]/90 border-b border-white/10">
      <div className="max-w-3xl mx-auto px-5 py-2 space-y-0">
        {notices.map((notice, idx) => (
          <div
            key={notice.id}
            className={[
              'flex items-center gap-2.5 py-2',
              idx < notices.length - 1 ? 'border-b border-white/10' : '',
            ].join(' ')}
          >
            <div className="flex-shrink-0 flex items-center justify-center size-5 rounded-full bg-amber-400/20">
              <Megaphone className="size-3 text-amber-400" />
            </div>
            <p className="text-sm text-white/90 leading-snug">{notice.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
