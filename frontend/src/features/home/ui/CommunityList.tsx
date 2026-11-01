import type { PostDTO } from '@/entities/post/api/dto';

import { formatDate } from '@/shared/lib/date';
interface ComunityListProps {
  post: PostDTO;
}

const ComunityList = ({ post }: ComunityListProps) => {
  return (
    <div className=" flex justify-between items-center">
      {/* 게시글 타이틀 및 카테고리 */}
      <p>
        <span className=" text-gray-600 font-bold mr-1">[{post.category}]</span>
        {post.title}
      </p>
      <p className="text-xs">{formatDate(post.created_at)}</p>
    </div>
  );
};

export default ComunityList;
