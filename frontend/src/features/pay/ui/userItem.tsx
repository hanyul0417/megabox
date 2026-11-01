export function Item({
  label,
  value,
  highlight,
  danger,
}: {
  label: string;
  value?: number;
  highlight?: boolean;
  danger?: boolean;
}) {
  const containerClass = highlight ? 'col-span-1 sm:col-span-2' : '';

  const bgClass = highlight ? (danger ? 'bg-red-50' : 'bg-mega-soft') : 'bg-gray-50';

  return (
    <div
      className={`
        ${containerClass}
        ${bgClass}
        rounded-xl p-4
        flex ${highlight ? 'flex-col items-center justify-center text-center' : 'justify-between items-center'}
      `}
    >
      <span className="text-sm text-gray-600">{label}</span>

      <span
        className={`
          ${highlight ? 'text-xl mt-1 font-bold' : 'font-semibold'}
          ${highlight ? (danger ? 'text-red-600' : 'text-mega-secondary') : ''}
        `}
      >
        {value?.toLocaleString()} 원
      </span>
    </div>
  );
}
