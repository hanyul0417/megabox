// Vercel 서버리스 함수: /api/auth/{login,refresh,logout} 을 같은 origin에서
// 백엔드로 그대로 중계한다.
//
// 왜 필요한가: Refresh Token은 httpOnly 쿠키로 주고받는데, 프론트(이 도메인)와
// 백엔드(api.cwmegaboxansan.co.kr 등)가 서로 다른 도메인이라 cross-site 쿠키로
// 취급된다. 모바일(특히 iOS Safari/홈 화면에 추가된 PWA)은 cross-site 쿠키를
// 공격적으로 차단/삭제해서 "앱을 다시 열면 로그인이 풀리는" 문제가 생긴다.
// 이 함수를 거치면 브라우저 입장에서 쿠키 요청이 모두 같은 origin이 되어
// 그 문제를 피할 수 있다.
//
// 배포 환경(Vercel 프로젝트)마다 실제 백엔드 주소가 다르므로(안산/진천),
// 환경변수 BACKEND_ORIGIN을 프로젝트 설정에서 지정해야 한다.
// 지정하지 않으면 안산 백엔드를 기본값으로 사용한다.

export const config = {
  api: {
    bodyParser: false,
  },
};

const ALLOWED_ACTIONS = new Set(['login', 'refresh', 'logout']);

const BACKEND_ORIGIN = process.env.BACKEND_ORIGIN || 'https://api.cwmegaboxansan.co.kr';

const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'host',
  'content-length',
  'content-encoding',
]);

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  return chunks.length > 0 ? Buffer.concat(chunks) : undefined;
}

export default async function handler(req, res) {
  const { action } = req.query;

  if (!ALLOWED_ACTIONS.has(action)) {
    res.status(404).json({ detail: 'Not Found' });
    return;
  }

  const targetUrl = `${BACKEND_ORIGIN}/api/auth/${action}`;

  const headers = {};
  for (const [key, value] of Object.entries(req.headers)) {
    if (value !== undefined && !HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      headers[key] = value;
    }
  }

  const method = req.method || 'POST';
  const body = method === 'GET' || method === 'HEAD' ? undefined : await readRawBody(req);

  let backendRes;
  try {
    backendRes = await fetch(targetUrl, { method, headers, body });
  } catch {
    res.status(502).json({ detail: '백엔드 연결에 실패했습니다.' });
    return;
  }

  res.status(backendRes.status);

  backendRes.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (lower === 'set-cookie' || HOP_BY_HOP_HEADERS.has(lower)) return;
    res.setHeader(key, value);
  });

  const setCookieHeaders = backendRes.headers.getSetCookie
    ? backendRes.headers.getSetCookie()
    : backendRes.headers.get('set-cookie')
      ? [backendRes.headers.get('set-cookie')]
      : [];
  if (setCookieHeaders.length > 0) {
    res.setHeader('set-cookie', setCookieHeaders);
  }

  const responseBody = Buffer.from(await backendRes.arrayBuffer());
  res.send(responseBody);
}
