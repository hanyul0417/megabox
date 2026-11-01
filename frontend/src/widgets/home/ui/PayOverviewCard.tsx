import { DollarSign } from 'lucide-react';

import PayOverview from '@/features/home/ui/PayOverview';
import ContentsCard from '@/shared/components/ui/ContentsCard';
import ContentsCardHeader from '@/shared/components/ui/ContentsCardHeader';

const PayOverviewCard = () => {
  return (
    <ContentsCard
      title="이번달 급여"
      profile={<ContentsCardHeader icon={<DollarSign />} title="이번달 급여" variant="gray" />}
      variant="brandMain"
      className="w-full"
    >
      <PayOverview />
    </ContentsCard>
  );
};

export default PayOverviewCard;
