import { User } from 'lucide-react';

import { useUserQuery } from '@/entities/user/api/queries';
import ContentsCardHeader from '@/shared/components/ui/ContentsCardHeader';

const UserProfile = () => {
  const { data: user } = useUserQuery();

  return <ContentsCardHeader icon={<User />} title={user?.name ?? '-'} variant="brand" />;
};

export default UserProfile;
