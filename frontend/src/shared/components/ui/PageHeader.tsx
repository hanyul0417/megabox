import { cn } from '@/shared/lib/utils';

interface PageHeaderProps {
  icon?: React.ReactNode;
  iconBg?: string;
  title: string;
  description?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

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
          ? 'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'
          : 'flex items-center gap-3',
        className,
      )}
    >
      <div className="flex items-center gap-3.5 min-w-0 overflow-hidden">
        {icon && (
          <div
            className={cn('flex shrink-0 items-center justify-center w-10 h-10 rounded-xl', iconBg)}
          >
            {icon}
          </div>
        )}
        <div className="min-w-0 overflow-hidden">
          <h1 className="text-2xl font-bold text-gray-900 truncate tracking-tight">{title}</h1>
          {description != null &&
            (typeof description === 'string' ? (
              <p className="text-sm text-gray-400 mt-0.5 truncate">{description}</p>
            ) : (
              description
            ))}
        </div>
      </div>

      {children && <div className="flex-shrink-0">{children}</div>}
    </div>
  );
}
