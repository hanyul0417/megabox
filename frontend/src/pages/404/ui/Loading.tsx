import logo from '@/shared/assets/logo/LogowithText_white.png';

const Loading = () => {
  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center"
      style={{ background: 'linear-gradient(135deg, #1a0f3c 0%, #2d1a5e 50%, #1a0f3c 100%)' }}
    >
      {/* 배경 장식 원 */}
      <div
        className="absolute inset-0 overflow-hidden pointer-events-none"
        aria-hidden="true"
      >
        <div
          className="absolute -top-40 -left-40 w-80 h-80 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #5b31a5, transparent)' }}
        />
        <div
          className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #351f66, transparent)' }}
        />
      </div>

      {/* 메인 콘텐츠 */}
      <div className="relative flex flex-col items-center gap-8">
        {/* 로고 */}
        <img src={logo} alt="MegaHub" className="h-10 opacity-95" />

        {/* 스피너 + 링 */}
        <div className="relative flex items-center justify-center">
          {/* 외부 회전 링 */}
          <div
            className="absolute w-16 h-16 rounded-full border-2 border-transparent"
            style={{
              borderTopColor: '#5b31a5',
              borderRightColor: '#5b31a5',
              animation: 'spin 1.2s linear infinite',
            }}
          />
          {/* 내부 역회전 링 */}
          <div
            className="absolute w-10 h-10 rounded-full border-2 border-transparent"
            style={{
              borderBottomColor: '#9b72e0',
              borderLeftColor: '#9b72e0',
              animation: 'spin 0.8s linear infinite reverse',
            }}
          />
          {/* 중앙 점 */}
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{
              background: '#9b72e0',
              animation: 'pulse 1.2s ease-in-out infinite',
            }}
          />
        </div>

        {/* 텍스트 */}
        <div className="flex flex-col items-center gap-1.5">
          <p className="text-sm font-medium text-white/80 tracking-widest uppercase">
            시스템 인증 중
          </p>
          {/* 도트 애니메이션 */}
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-white/40"
                style={{
                  animation: `dotBounce 1.2s ease-in-out infinite`,
                  animationDelay: `${i * 0.2}s`,
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* 하단 버전 정보 */}
      <p className="absolute bottom-8 text-xs text-white/20 tracking-wider">
        MegaHub © {new Date().getFullYear()}
      </p>

      {/* 글로벌 키프레임 */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.4; transform: scale(0.7); }
        }
        @keyframes dotBounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40%            { transform: translateY(-5px); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default Loading;
