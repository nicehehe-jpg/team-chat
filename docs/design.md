# Team Chat — 설계 문서

## 개요
팀 내부용 카카오톡 유사 채팅 앱 (MVP)

## 기술 스택
- **웹**: Next.js 14 (App Router)
- **모바일**: React Native (Expo)
- **백엔드**: Node.js + Express + Socket.io
- **DB**: PostgreSQL
- **인증**: JWT (Access + Refresh Token)
- **파일 저장**: 로컬 uploads/ (추후 S3 전환)

## MVP 기능 범위
1. 회원가입 / 로그인
2. 사용자 목록 조회
3. 1:1 채팅방 생성
4. 실시간 텍스트 메시지 송수신
5. 채팅방 목록 + 마지막 메시지 표시
6. 읽음 표시

## DB 스키마

### users
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID | PK |
| email | VARCHAR(255) | UNIQUE |
| password_hash | VARCHAR | bcrypt |
| name | VARCHAR(100) | 표시 이름 |
| avatar_url | VARCHAR | 프로필 사진 |
| status | ENUM(online/offline/away) | 상태 |
| created_at | TIMESTAMP | |

### rooms
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID | PK |
| type | ENUM(direct/group) | 채팅 유형 |
| name | VARCHAR(100) | 그룹명 (그룹채팅용) |
| created_at | TIMESTAMP | |

### room_members
| 컬럼 | 타입 | 설명 |
|------|------|------|
| room_id | UUID | FK → rooms |
| user_id | UUID | FK → users |
| joined_at | TIMESTAMP | |
| last_read_at | TIMESTAMP | 읽음 처리 기준 |

### messages
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID | PK |
| room_id | UUID | FK → rooms |
| sender_id | UUID | FK → users |
| content | TEXT | 메시지 내용 |
| type | ENUM(text/image/file) | |
| created_at | TIMESTAMP | |

## API 설계

### 인증
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/refresh
- POST /api/auth/logout

### 사용자
- GET /api/users — 전체 목록
- GET /api/users/me — 내 정보
- PUT /api/users/me — 프로필 수정

### 채팅방
- GET /api/rooms — 내 채팅방 목록
- POST /api/rooms/direct — 1:1 채팅방 생성
- GET /api/rooms/:id/messages — 메시지 내역

## Socket.io 이벤트

### Client → Server
- `join_room` (roomId)
- `send_message` ({roomId, content, type})
- `mark_read` (roomId)
- `typing` ({roomId, isTyping})

### Server → Client
- `new_message` (message)
- `user_online` (userId)
- `user_offline` (userId)
- `typing_indicator` ({userId, roomId, isTyping})
- `message_read` ({roomId, userId, readAt})
