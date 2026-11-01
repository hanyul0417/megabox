import type { InsuranceRateResponseDTO } from '../api/dto';

interface InsuranceCurrentRatesProps {
  rates: InsuranceRateResponseDTO;
}

const RATE_LABELS: {
  key: keyof Pick<
    InsuranceRateResponseDTO,
    | 'health_insurance_rate'
    | 'long_term_care_rate'
    | 'employment_insurance_rate'
    | 'national_pension_rate'
  >;
  label: string;
}[] = [
  { key: 'health_insurance_rate', label: '건강보험' },
  { key: 'long_term_care_rate', label: '장기요양보험' },
  { key: 'employment_insurance_rate', label: '고용보험' },
  { key: 'national_pension_rate', label: '국민연금' },
];

const InsuranceCurrentRates = ({ rates }: InsuranceCurrentRatesProps) => {
  return (
    <div className="bg-mega-soft border border-mega-light rounded-lg p-4 mb-6">
      <p className="text-sm font-semibold text-mega mb-3">{rates.year}년 적용 중인 요율</p>
      <div className="grid grid-cols-4 gap-4">
        {RATE_LABELS.map(({ key, label }) => (
          <div key={key}>
            <p className="text-xs text-mega-secondary mb-1">{label}</p>
            <p className="text-lg font-bold text-mega">{rates[key] ?? '-'}%</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default InsuranceCurrentRates;
