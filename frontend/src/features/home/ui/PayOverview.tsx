import { useQuery } from '@tanstack/react-query';
import { Calendar, ChartLine, History } from 'lucide-react';

import { payQueries } from '@/entities/pay/api/queries';
import { normalizePayOverview } from '@/entities/pay/model/payOverview';

const PayOverview = () => {
  const year = new Date().getFullYear();
  const month = new Date().getMonth() + 1;
  const { data = normalizePayOverview() } = useQuery({
    ...payQueries.payOverview(year, month),
    select: normalizePayOverview,
  });
  const payDate = `${year}-${month}-10`;
  const iconSize = 16;

  const stats = [
    {
      icon: <Calendar size={iconSize} />,
      label: '근무일수',
      value: `${data.total_work_days}`,
      valueLabel: '일',
    },
    {
      icon: <ChartLine size={iconSize} />,
      label: '총 근무시간',
      value: `${data.total_work_hours}`,
      valueLabel: '시간',
    },
    {
      icon: <History size={iconSize} />,
      label: '마지막 근무일',
      value: `${data.total_work_days}`,
      valueLabel: '일',
    },
  ];

  return (
    <div className=" flex flex-col gap-3">
      <div className=" text-2xl font-bold">
        {data?.net_pay.toLocaleString()} <span className="text-lg">원</span>
      </div>
      <div className=" flex justify-between items-center text-sm">
        <p className=" text-gray-300">지급일</p> <p className="text-white">{payDate}</p>
      </div>
      <div className=" h-px bg-border" />
      <div className=" flex justify-between items-center">
        <p className="text-sm text-gray-300">월 급여</p>{' '}
        <h4>{data?.gross_pay.toLocaleString()}원</h4>
      </div>
      <div className=" flex justify-between items-center">
        <p className="text-sm text-gray-300">공제계</p>{' '}
        <h4 className="text-red-300">{data?.total_deduction.toLocaleString()}원</h4>
      </div>
      <div className=" flex justify-between gap-4">
        {stats.map(({ icon, label, value, valueLabel }) => (
          <div
            key={label}
            className=" w-full flex flex-col gap-4 items-start bg-gray-300/30 p-3 rounded-lg"
          >
            <div className="flex gap-2 items-center">
              {icon}
              <p className="text-xs">{label}</p>
            </div>
            <p>
              {value} <span className="text-xs">{valueLabel}</span>
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PayOverview;
