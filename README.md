# Team Chat

팀 내부용 카카오톡 유사 채팅 앱

## 구조

```
team-chat/
├── backend/    Node.js + Express + Socket.io + PostgreSQL
├── web/        Next.js 14 (웹 클라이언트)
├── mobile/     React Native Expo (iOS / Android)
└── docs/       설계 문서
```

## 기능

- 회원가입 / 로그인 (JWT)
- 1:1 채팅
- 그룹 채팅 (멤버 선택, 초대)
- 실시간 메시지 (Socket.io)
- 이미지 / 파일 전송
- 읽음 표시
- 입력 중 표시
- 온라인 / 오프라인 상태

## 빠른 시작

### 1. PostgreSQL (Docker)
```bash
docker run -d --name teamchat-db \
  -e POSTGRES_DB=teamchat \
  -e POSTGRES_PASSWORD=password \
  -p 5432:5432 postgres:16
```

### 2. 백엔드
```bash
cd backend
cp .env.example .env   # JWT_SECRET 등 수정
npm install
npm run db:migrate
npm run dev            # http://localhost:4000
```

### 3. 웹
```bash
cd web
cp .env.local.example .env.local
npm install
npm run dev            # http://localhost:3000
```

### 4. 모바일 (Expo)
```bash
cd mobile
npm install
npx expo start
# 실기기 테스트: mobile/src/lib/api.ts의 BASE_URL을 PC IP로 변경
# 예: http://192.168.1.x:4000/api
```

## 기술 스택

| 영역 | 기술 |
|------|------|
| 백엔드 | Node.js, Express, Socket.io, PostgreSQL, JWT, Multer |
| 웹 | Next.js 14, Zustand, Tailwind CSS, Socket.io-client |
| 모바일 | React Native, Expo, Expo Router, SecureStore |
| 공통 | TypeScript, date-fns, axios |
