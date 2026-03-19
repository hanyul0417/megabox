# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Megabox**는 편의점 직원 관리 시스템입니다. 스케줄 관리, 급여 계산, 출퇴근 추적, 커뮤니티 기능을 제공합니다.

- **Backend**: FastAPI (Python 3.13) + MySQL + Redis
- **Frontend**: React 19 + Vite + TypeScript (FSD 아키텍처)
- **Infra**: Docker Compose + Nginx 리버스 프록시

---

## Commands

### Docker (전체 스택 실행)

```bash
# 빌드 후 실행 (최초 또는 코드 변경 후)
docker-compose up --build

# 백그라운드 실행
docker-compose up -d

# 로그 확인
docker-compose logs -f backend
docker-compose logs -f frontend

# 중지
docker-compose down
```

### Backend (FastAPI)

```bash
cd backend

# 의존성 설치
pip install -r requirements.txt

# 개발 서버 실행
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 린트/포맷
black .
flake8 .
mypy .

# 테스트 실행
pytest
pytest app/tests/test_auth.py          # 단일 파일
pytest app/tests/test_auth.py::test_fn  # 단일 함수

# DB 마이그레이션 (Alembic)
alembic revision --autogenerate -m "description"
alembic upgrade head
```

### Frontend (React + Vite)

```bash
cd frontend

# 의존성 설치
npm install

# 개발 서버 실행 (포트 5173)
npm run dev

# 빌드 (타입 체크 포함)
npm run build

# 린트
npm run lint
npm run lint:fix

# 포맷
npm run format

# 테스트
npm test
npm run test:watch
npm run test:coverage          # Coverage 리포트 (HTML)
```

---

## Architecture

### Backend 구조

```
backend/app/
├── core/
│   ├── config.py       # Pydantic BaseSettings — 환경변수 로딩
│   ├── database.py     # SQLAlchemy 엔진, 세션 팩토리
│   ├── security.py     # JWT 검증, get_current_user / get_current_admin dependency
│   └── routers.py      # 모든 라우터를 한 곳에서 등록
├── modules/
│   ├── auth/           # 로그인, 회원가입, 토큰 갱신
│   ├── schedule/       # 스케줄 + 시프트 + 휴무 (각각 router/service/schema 분리)
│   ├── payroll/        # 급여 계산 및 기록
│   ├── community/      # 게시글, 댓글, 공지
│   ├── admin/          # 유저 관리, 4대보험 요율
│   ├── wage/           # 기본 시급 관리
│   ├── workstatus/     # 출퇴근 관리 (system 계정 전용)
│   └── utils/          # response_utils, date_utils, permission_utils
└── main.py             # FastAPI 앱 생성, 미들웨어 설정, startup 이벤트
```

**모듈 내부 패턴**: `models.py` → `schemas.py` → `services.py` → `routers.py`

**인증 흐름**:

- Access Token (JWT, 12시간) + Refresh Token (7일, DB 저장)
- `get_current_user()` / `get_current_admin()` — FastAPI Depends로 주입
- 유저 상태: `pending` → `approved` / `rejected` (관리자 승인 필요)
- SSN은 Fernet 암호화, 패스워드는 bcrypt_sha256

**API 베이스 경로**: `/api/{module}/`

### Frontend 구조 (Feature-Sliced Design)

FSD 레이어 순서 (상위가 하위에만 의존 가능):

```
src/
├── app/        # 라우팅, 전역 Provider, 레이아웃
├── pages/      # 페이지 컴포넌트 (라우터와 1:1)
├── widgets/    # 독립적인 UI 블록 조합
├── features/   # 사용자 기능 단위 (API 호출 + UI 묶음)
├── entities/   # 비즈니스 엔티티 (타입, 기본 UI)
└── shared/     # 공통 유틸, API 클라이언트, shadcn/ui 컴포넌트
```

**ESLint의 `eslint-plugin-fsd-import`가 레이어 의존 규칙을 강제합니다.**
상위 레이어에서 하위 레이어 임포트만 허용, 같은 레이어 간 임포트 금지.

### API 클라이언트 (`shared/api/`)

- `apiClients.ts` — Axios 인스턴스, `VITE_BASE_URL` 환경변수 사용
- `interceptors.ts` — 요청 시 JWT 자동 주입, 401 시 토큰 갱신 + 요청 큐잉
- `queryKeys.ts` — TanStack Query 키 팩토리
- `error.ts` — `ApiError` 커스텀 에러 클래스 (code, status, details)

토큰 갱신 중 실패한 요청은 큐에 쌓였다가 갱신 완료 후 재시도됩니다.

### 라우팅 & 레이아웃

`app/routes/router.tsx`에서 세 가지 레이아웃으로 분기:

| 유형    | 경로                                               | 조건               |
| ------- | -------------------------------------------------- | ------------------ |
| Public  | `/login`                                           | 미인증 사용자 전용 |
| System  | `/work-status`                                     | system 계정 전용   |
| Private | `/`, `/pay`, `/schedule`, `/admin`, `/community/*` | 일반 인증 사용자   |

`<AuthRoute isPublic={} allowSystem={} requireAdmin={}>` 컴포넌트로 제어.

**레이아웃 구조** (`Layout.tsx`):

- 데스크탑: `bg-[#1a0f3c]` 다크 사이드바 240px 고정 (`fixed`) + `lg:pl-[240px]` 콘텐츠 오프셋
- 모바일: sticky top 헤더 (`MobileHeader`) + slide-in drawer (`SideNav`)
- `SystemLayOut`은 `/work-status` 전용 — `<Outlet />` 만 렌더링 (WorkStatusPanel이 자체 full-screen 처리)

### 키오스크 근태 API (`/api/workstatus/`)

| 메서드 | 경로                 | 설명                                     |
| ------ | -------------------- | ---------------------------------------- |
| GET    | `/employees`         | approved + crew/leader/cleaner 직원 목록 |
| GET    | `/today/{user_id}`   | 오늘 근태 기록 (없으면 null 반환)        |
| POST   | `/kiosk/check-in`    | `{ user_id }` 출근                       |
| POST   | `/kiosk/break-start` | `{ user_id }` 휴식 시작                  |
| POST   | `/kiosk/break-end`   | `{ user_id }` 복귀                       |
| POST   | `/kiosk/check-out`   | `{ user_id }` 퇴근 (payroll 누적)        |

모든 키오스크 엔드포인트는 **system 계정 JWT 필수** (`require_system_user` 의존성).
기존 `/check-in`, `/break-start`, `/break-end`, `/check-out`은 `{ username, password }` 레거시 방식 유지.

**백엔드 응답 형식**: 시간 필드(`check_in` 등)는 `HH:MM:SS` 문자열 (ISO datetime 아님). 프론트에서 `timeString.slice(0, 5)`로 `HH:MM` 파싱.

### 상태 관리

- **서버 상태**: TanStack React Query (캐싱, 재조회)
- **클라이언트 상태**: Zustand `authStore` (`shared/model/authStore.ts`)
  - `accessToken`, `refreshToken`, `user` → localStorage에 `auth-storage` 키로 영속화
  - 401 영구 실패 시 `clearAuth()` 호출

---

## Environment Variables

### Frontend (`frontend/.env`)

```env
VITE_BASE_URL=http://localhost:8000   # 브라우저 기준 백엔드 주소
```

### Backend (`backend/.env`)

주요 변수: `DB_*`, `JWT_*`, `ADMIN_*`, `CORS_ORIGINS`, `SSN_SECRET_KEY`, `HOLIDAY_API_KEY`

---

## Commit Convention

```
Feat:     새 기능
Add:      에셋 파일 추가
Fix:      버그 수정
Docs:     문서
Style:    스타일
Refactor: 코드 리팩터링
Test:     테스트
Deploy:   배포
Conf:     빌드/환경 설정
Chore:    기타
```

브랜치: `feature/[module]/#[issue-number]`
PR 제목: `#[issue] Feat: 설명`
