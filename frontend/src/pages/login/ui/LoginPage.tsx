import { Calendar, Clock, Users } from 'lucide-react';

import { FormCard } from '@/features/login';
import BackgroundImage from '@/shared/assets/img/main_bg.png';
import Logo from '@/shared/assets/logo/Logo_white.png';
import LogoPurple from '@/shared/assets/logo/Megabox_Logo_Indigo.png';

const FEATURES = [
  { icon: Calendar, text: '실시간 스케줄 관리' },
  { icon: Clock, text: '근태 현황 확인' },
  { icon: Users, text: '급여 및 직원 관리' },
];

const LoginPage = () => {
  return (
    <div className="flex min-h-screen">
      {/* ── 왼쪽 브랜드 패널 (md 이상에서만 표시) ── */}
      <div
        className="hidden md:flex md:w-[55%] lg:w-[60%] relative flex-col justify-between p-10 lg:p-14"
        style={{
          background:
            'linear-gradient(135deg, var(--color-nav-bg) 0%, var(--color-mega) 40%, var(--color-mega-secondary) 100%)',
        }}
      >
        {/* 배경 이미지 오버레이 */}
        <div
          className="absolute inset-0 opacity-10 bg-cover bg-center mix-blend-overlay"
          style={{ backgroundImage: `url(${BackgroundImage})` }}
        />

        {/* 상단: 로고 */}
        <div className="relative z-10">
          <img src={Logo} alt="MegaHub" className="h-8" />
        </div>

        {/* 중앙: 헤드라인 */}
        <div className="relative z-10 space-y-6">
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold text-white leading-tight">
              직원 관리를 더
              <br />
              <span className="text-purple-300">스마트하게</span>
            </h1>
            <p className="mt-4 text-base text-white/60 leading-relaxed">
              메가박스 통합 인사관리 시스템으로
              <br />
              스케줄, 급여, 근태를 한 곳에서 관리하세요.
            </p>
          </div>

          {/* 기능 리스트 */}
          <ul className="space-y-3">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-white/75 text-sm">
                <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-white/10">
                  <Icon className="size-4 text-purple-300" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        {/* 하단: 카피라이트 */}
        <div className="relative z-10">
          <p className="text-xs text-white/30">© 2026 Megabox. All rights reserved.</p>
        </div>
      </div>

      {/* ── 오른쪽 폼 패널 ── */}
      <div className="flex flex-col flex-1 min-h-screen bg-white">
        {/* 모바일: 상단 로고 */}
        <div className="md:hidden flex justify-center pt-12 pb-8">
          <img src={LogoPurple} alt="MegaHub" className="h-8" />
        </div>

        {/* 폼 영역 */}
        <div className="flex flex-1 items-center justify-center px-6 py-8 md:py-0">
          <div className="w-full max-w-sm">
            {/* 데스크탑: 헤더 텍스트 */}
            <div className="hidden md:block mb-8">
              <h2 className="text-2xl font-bold text-gray-900">환영합니다</h2>
              <p className="text-sm text-gray-500 mt-1">계정에 로그인하여 서비스를 이용하세요</p>
            </div>

            <FormCard />
          </div>
        </div>

        {/* 하단 */}
        <div className="md:hidden flex justify-center pb-8">
          <p className="text-xs text-gray-400">© 2026 Megabox. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
