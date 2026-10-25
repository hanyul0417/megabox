import { LockKeyhole, UserPlus2 } from 'lucide-react';
import { useState } from 'react';

import LoginForm from './LoginForm';
import { RegisterFunnel } from './RegisterFunnel';

type Mode = 'login' | 'register';

const FormCard = () => {
  const [mode, setMode] = useState<Mode>('login');

  return (
    <div className="w-full">
      {mode === 'login' ? (
        <div className="flex flex-col gap-6">
          {/* 로그인 헤더 */}
          <div className="flex items-center gap-2 md:hidden">
            <div className="flex items-center justify-center size-10 rounded-xl bg-mega-soft">
              <LockKeyhole className="size-5 text-mega" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">로그인</h2>
              <p className="text-xs text-gray-500">계정에 접속하세요</p>
            </div>
          </div>

          <LoginForm />

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-100" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-3 text-gray-400">또는</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setMode('register')}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 transition-colors duration-150 hover:border-mega-secondary/30 hover:bg-gray-50 hover:text-mega-secondary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
          >
            <UserPlus2 className="size-4" />
            가입 신청하기
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* 가입 신청 헤더 */}
          <div className="flex items-center gap-2 md:hidden">
            <div className="flex items-center justify-center size-10 rounded-xl bg-mega-soft">
              <UserPlus2 className="size-5 text-mega" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">가입 신청</h2>
              <p className="text-xs text-gray-500">관리자 승인 후 이용 가능합니다</p>
            </div>
          </div>

          <RegisterFunnel onBack={() => setMode('login')} />
        </div>
      )}
    </div>
  );
};

export default FormCard;
