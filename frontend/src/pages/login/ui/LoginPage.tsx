import { Calendar, Clock, Users } from 'lucide-react';

import { FormCard } from '@/features/login';
import BackgroundImage from '@/shared/assets/img/main_bg.png';
import Logo from '@/shared/assets/logo/Logo_white.png';

const FEATURES = [
  { icon: Calendar, text: '실시간 스케줄 관리' },
  { icon: Clock, text: '근태 현황 확인' },
  { icon: Users, text: '급여 및 직원 관리' },
];

const STORE_NAME = import.meta.env.VITE_STORE_NAME as string | undefined;

const LoginPage = () => {
  return (
    <div className="flex min-h-dvh flex-col bg-white md:flex-row">
      {/* ── 브랜드 패널: 모바일은 상단 헤더, md 이상은 좌측 패널 ── */}
      <div className="relative overflow-hidden bg-nav-bg text-white md:flex md:w-[55%] md:flex-col md:justify-between md:p-10 lg:w-[60%] lg:p-14">
        {/* 배경 이미지 + 은은한 브랜드 광원 */}
        <div
          className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-10 mix-blend-overlay"
          style={{ backgroundImage: `url(${BackgroundImage})` }}
        />
        <div className="pointer-events-none absolute -top-32 -right-24 size-[28rem] rounded-full bg-mega-secondary/45 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -left-24 hidden size-[26rem] rounded-full bg-mega/70 blur-3xl md:block" />

        {/* 로고 */}
        <div className="relative z-10 px-6 pt-[max(2.5rem,env(safe-area-inset-top))] md:p-0">
          <img src={Logo} alt="MEGABOX" className="h-6 w-auto md:h-8" />
        </div>

        {/* 헤드라인 */}
        <div className="relative z-10 space-y-6 px-6 pt-6 pb-12 md:p-0">
          <div>
            <h1 className="text-[26px] font-bold leading-tight tracking-tight md:text-3xl lg:text-4xl">
              메가박스 {STORE_NAME}
              <br />
              <span className="text-purple-300">크루 커뮤니티</span>
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-white/60 md:mt-4 md:text-base">
              메가박스 통합 인사관리 시스템으로
              <br />
              스케줄, 급여, 근태를 한 곳에서 관리하세요.
            </p>
          </div>

          {/* 기능 리스트 (md 이상) */}
          <ul className="hidden space-y-3 md:block">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm text-white/75">
                <span className="flex size-8 items-center justify-center rounded-lg bg-white/10">
                  <Icon className="size-4 text-purple-300" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        {/* 카피라이트 (md 이상) */}
        <div className="relative z-10 hidden md:block">
          <p className="text-xs text-white/35">© 2026 Megabox. All rights reserved.</p>
        </div>
      </div>

      {/* ── 폼 패널 ── */}
      <div className="relative z-10 -mt-6 flex flex-1 flex-col rounded-t-3xl bg-white md:mt-0 md:min-h-dvh md:rounded-none">
        <div className="flex flex-1 items-start justify-center px-6 pt-8 pb-8 md:items-center md:py-0">
          <div className="w-full max-w-sm">
            {/* 데스크탑: 헤더 텍스트 */}
            <div className="mb-8 hidden md:block">
              <h2 className="text-2xl font-bold tracking-tight text-gray-900">환영합니다</h2>
              <p className="mt-1 text-sm text-gray-500">계정에 로그인하여 서비스를 이용하세요</p>
            </div>

            <FormCard />
          </div>
        </div>

        {/* 하단 (모바일) */}
        <div className="flex justify-center pb-[max(2rem,env(safe-area-inset-bottom))] md:hidden">
          <p className="text-xs text-gray-400">© 2026 Megabox. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
