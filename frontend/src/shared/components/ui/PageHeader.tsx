import { cn } from '@/shared/lib/utils';

interface PageHeaderProps {
  icon?: React.ReactNode;
  iconBg?: string;
  title: string;
  description?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

/**
 * 페이지 상단 제목 영역
 * - 제목/설명은 잘라내지 않고 자연스럽게 줄바꿈 (keep-all + balance)
 * - 우측 액션(children)은 모바일에서 제목 아래 전체 폭으로 내려간다
 */
export function PageHeader({
  icon,
  iconBg = 'bg-gray-100',
  title,
  description,
  children,
  className,
}: PageHeaderProps) {
  const hasChildren = !!children;

  return (
    <div
      className={cn(
        hasChildren
          ? 'flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'
          : 'flex items-center gap-3',
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-3 sm:gap-3.5">
        {icon && (
          <div
            className={cn(
              'flex size-10 shrink-0 items-center justify-center rounded-xl sm:size-11',
              iconBg,
            )}
          >
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-xl font-bold leading-tight tracking-tight text-gray-900 sm:text-2xl">
            {title}
          </h1>
          {description != null &&
            (typeof description === 'string' ? (
              <p className="mt-1 text-[13px] leading-snug text-gray-500 sm:text-sm">
                {description}
              </p>
            ) : (
              description
            ))}
        </div>
      </div>

      {children && <div className="min-w-0 sm:shrink-0">{children}</div>}
    </div>
  );
}
