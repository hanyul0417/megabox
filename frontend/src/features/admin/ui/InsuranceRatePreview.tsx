import { Separator } from '@/shared/components/ui/separator';

interface InsuranceRatePreviewProps {
  healthRate: number;
  careRate: number;
  employmentRate: number;
  pensionRate: number;
}

const BASE_SALARY = 2_000_000;

const InsuranceRatePreview = ({
  healthRate,
  careRate,
  employmentRate,
  pensionRate,
}: InsuranceRatePreviewProps) => {
  const health = Math.floor((BASE_SALARY * healthRate) / 100);
  const care = Math.floor((health * careRate) / 100);
  const employment = Math.floor((BASE_SALARY * employmentRate) / 100);
  const pension = Math.floor((BASE_SALARY * pensionRate) / 100);
  const total = health + care + employment + pension;
  const net = BASE_SALARY - total;

  return (
    <div className="bg-muted/40 rounded-lg p-4 mt-6">
      <p className="text-sm font-semibold mb-4">
        급여 {BASE_SALARY.toLocaleString()}원 기준 공제액 예시
      </p>
      <div className="grid grid-cols-4 gap-4 mb-4">
        {[
          { label: '건강보험', value: health },
          { label: '장기요양보험', value: care },
          { label: '고용보험', value: employment },
          { label: '국민연금', value: pension },
        ].map(({ label, value }) => (
          <div key={label}>
            <p className="text-xs text-muted-foreground mb-1">{label}</p>
            <p className="text-sm font-medium">{value.toLocaleString()}원</p>
          </div>
        ))}
      </div>
      <Separator className="mb-3" />
      <div className="flex justify-between text-sm mb-1">
        <span className="text-muted-foreground">총 공제액</span>
        <span className="font-semibold text-danger">{total.toLocaleString()}원</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">실수령액</span>
        <span className="font-semibold text-green">{net.toLocaleString()}원</span>
      </div>
    </div>
  );
};

export default InsuranceRatePreview;
