# Megabox - 편의점 직원 관리 시스템

편의점 직원의 스케줄 관리, 급여 계산, 출퇴근 추적, 커뮤니티 기능을 통합 제공하는 웹 기반 관리 시스템입니다.

---

## 기술 스택

### Frontend

| 분류 | 기술 |
|---|---|
| 언어 | TypeScript 5.9 |
| 프레임워크 | React 19 |
| 빌드 도구 | Vite 7 |
| 아키텍처 | Feature-Sliced Design (FSD) |
| 스타일링 | Tailwind CSS 4, shadcn/ui (Radix UI 기반) |
| 서버 상태 | TanStack React Query 5 |
| 클라이언트 상태 | Zustand 5 |
| HTTP 클라이언트 | Axios |
| 라우팅 | React Router 7 |
| 폼 검증 | React Hook Form + Zod |
| 날짜 처리 | date-fns, dayjs |
| 테스트 | Vitest, Testing Library |
| 린트/포맷 | ESLint (eslint-plugin-fsd-import), Prettier, Husky |

### Backend

| 분류 | 기술 |
|---|---|
| 언어 | Python 3.13 |
| 프레임워크 | FastAPI 0.119 |
| ORM | SQLAlchemy 2.0 |
| DB 마이그레이션 | Alembic |
| 데이터베이스 | MySQL |
| 캐시 | Redis |
| 인증 | JWT (PyJWT) + bcrypt |
| 암호화 | Cryptography (Fernet) |
| 데이터 검증 | Pydantic v2 |
| ASGI 서버 | Uvicorn |
| 테스트 | pytest |
| 린트/포맷 | Black, Flake8 |

### Infra

| 분류 | 기술 |
|---|---|
| 컨테이너 | Docker, Docker Compose |
| 리버스 프록시 | Nginx |
| 터널링 | Cloudflare Tunnel |
| 모니터링 | Sentry |

---

## 주요 기능

### 1. 로그인 / 인증

> 직원 로그인, 관리자 승인 흐름, JWT 기반 자동 토큰 갱신

![로그인 화면](docs/images/login.png)

- 직원 회원가입 후 관리자 승인(`pending` → `approved`) 필요
- Access Token (12시간) + Refresh Token (7일) 자동 갱신
- 로컬스토리지 기반 인증 상태 영속화

---

### 2. 홈 대시보드

> 로그인 후 첫 화면, 오늘의 스케줄 및 주요 정보 요약

![홈 대시보드](docs/images/home.png)

- 오늘의 출근 정보 및 스케줄 확인
- 최근 공지사항 바로가기

---

### 3. 스케줄 관리

> 월별 캘린더 기반 근무 스케줄 조회

![스케줄 페이지](docs/images/schedule.png)

- 월별 달력 뷰로 전체 직원 스케줄 확인
- 시프트 등록 및 관리
- 휴무 신청 기능

---

### 4. 급여 확인

> 월별 급여 명세서 조회

![급여 페이지](docs/images/payroll.png)

- 근무 시간 기반 자동 급여 계산
- 4대보험 공제 내역 포함
- 월별 명세서 조회

---

### 5. 출퇴근 관리 (키오스크)

> 키오스크 전용 화면에서 출퇴근 기록

![키오스크 화면](docs/images/work-status.png)

- 직원 목록에서 선택 후 출근 / 휴식 시작 / 복귀 / 퇴근 처리
- system 계정 전용 JWT 인증
- 퇴근 시 급여 자동 누적 계산

---

### 6. 커뮤니티

> 직원 간 소통 및 정보 공유 게시판

![커뮤니티](docs/images/community.png)

#### 6-1. 공지사항

![공지사항](docs/images/notice.png)

- 관리자가 전체 공지 작성

#### 6-2. 자유게시판

![자유게시판](docs/images/freeboard.png)

- 직원 간 자유로운 게시글 및 댓글 작성

#### 6-3. 시프트 교환

![시프트 교환](docs/images/shift.png)

- 시프트 교환 요청 및 승인

#### 6-4. 휴무 신청

![휴무 신청](docs/images/dayoff.png)

- 휴무 신청 및 처리 현황 확인

---

### 7. 마이페이지

> 내 정보 조회 및 수정

![마이페이지](docs/images/mypage.png)

- 개인 정보 및 프로필 사진 수정
- 비밀번호 변경

---

### 8. 관리자 페이지

> 직원 관리 및 시스템 설정 (관리자 전용)

![관리자 페이지](docs/images/admin.png)

- 직원 가입 승인 / 거절 / 권한 변경
- 기본 시급 및 4대보험 요율 설정

---

### 9. 관리자 대시보드

> 전체 현황 한눈에 파악 (관리자 전용)

![관리자 대시보드](docs/images/admin-dashboard.png)

- 오늘 출근 현황 실시간 확인
- 직원별 월 근무 시간 및 급여 요약

---

## 프로젝트 구조

```
megabox-ansan/
├── frontend/               # React + Vite (FSD 아키텍처)
│   └── src/
│       ├── app/            # 라우팅, 전역 Provider
│       ├── pages/          # 페이지 컴포넌트
│       ├── widgets/        # 독립적인 UI 블록 조합
│       ├── features/       # 기능 단위 모듈
│       ├── entities/       # 비즈니스 엔티티
│       └── shared/         # 공통 유틸, API 클라이언트, UI
├── backend/                # FastAPI (Python)
│   └── app/
│       ├── core/           # 설정, DB, 보안, 라우터
│       └── modules/        # auth, schedule, payroll, community, admin, ...
├── nginx/                  # Nginx 설정
├── cloudflared/            # Cloudflare Tunnel 설정
└── docker-compose.yml      # 전체 스택 오케스트레이션
```

---

## 시작하기

### Docker로 전체 스택 실행

```bash
# 최초 실행 또는 코드 변경 후
docker-compose up --build

# 백그라운드 실행
docker-compose up -d
```

### 환경변수 설정

**Frontend** (`frontend/.env`)
```env
VITE_BASE_URL=http://localhost:8000
```

**Backend** (`backend/.env`)
```env
DB_HOST=...
DB_PORT=3306
DB_NAME=...
DB_USER=...
DB_PASSWORD=...
JWT_SECRET_KEY=...
SSN_SECRET_KEY=...
CORS_ORIGINS=http://localhost:5173
HOLIDAY_API_KEY=...
```

---

## 이미지 삽입 안내

`docs/images/` 디렉토리를 생성하고 아래 파일명으로 스크린샷을 추가하면 자동으로 적용됩니다.

| 파일명 | 설명 |
|---|---|
| `login.png` | 로그인 화면 |
| `home.png` | 홈 대시보드 |
| `schedule.png` | 스케줄 페이지 |
| `payroll.png` | 급여 페이지 |
| `work-status.png` | 키오스크 출퇴근 화면 |
| `community.png` | 커뮤니티 메인 |
| `notice.png` | 공지사항 |
| `freeboard.png` | 자유게시판 |
| `shift.png` | 시프트 교환 |
| `dayoff.png` | 휴무 신청 |
| `mypage.png` | 마이페이지 |
| `admin.png` | 관리자 페이지 |
| `admin-dashboard.png` | 관리자 대시보드 |
