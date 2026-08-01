# 인증 시스템 설정 완료 (Credentials + Social + Session)

## 설정 완료 사항

### ✅ 데이터베이스 모델
- `User` 모델: 비밀번호, 소셜 로그인 필드 추가
- `Account` 모델: OAuth/소셜 로그인 계정 연결
- `Session` 모델: next-auth 세션 저장소

### ✅ 인증 제공자
1. **Credentials (ID/PW)**
   - 이메일/비밀번호 로그인
   - bcrypt로 비밀번호 해싱

2. **Google OAuth** (설정 필요)
   - 구글 로그인 연동

3. **GitHub OAuth** (설정 필요)
   - 깃헙 로그인 연동

### ✅ 페이지
- `/login` - 로그인 페이지
- `/signup` - 회원가입 페이지
- `/` - 로그인 필수 (보호된 페이지)

### ✅ API
- `POST /api/auth/signin` - next-auth 로그인
- `GET /api/auth/signout` - next-auth 로그아웃
- `POST /api/auth/signup` - 회원가입
- `GET /api/materials` - 세션 검증 추가 ✓

### ✅ 미들웨어
- 인증되지 않은 사용자 → `/login`으로 자동 리다이렉트

---

## 테스트 계정

```
이메일: admin@church.kr
비밀번호: password123
역할: 교역자

이메일: user@church.kr
비밀번호: password123
역할: 일반인
```

---

## 개발 환경 설정

### 1. Google OAuth 설정 (선택사항)

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 프로젝트 생성 → OAuth 2.0 인증 정보 생성
3. 리디렉트 URI: `http://localhost:3000/api/auth/callback/google`
4. `.env`에 추가:

```env
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### 2. GitHub OAuth 설정 (선택사항)

1. [GitHub Settings → Developer settings → OAuth Apps](https://github.com/settings/developers)
2. "New OAuth App" 생성
3. Authorization callback URL: `http://localhost:3000/api/auth/callback/github`
4. `.env`에 추가:

```env
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
```

---

## 실행 방법

```bash
# 개발 서버 시작
npm run dev

# 접속
# http://localhost:3000 → /login으로 자동 리다이렉트
```

---

## 주요 파일 구조

```
src/
├── lib/
│   └── auth.ts              # next-auth 설정
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── [...nextauth]/route.ts    # NextAuth 핸들러
│   │   │   └── signup/route.ts           # 회원가입 API
│   │   └── materials/route.ts            # 세션 검증 추가 ✓
│   ├── login/page.tsx                    # 로그인 페이지
│   ├── signup/page.tsx                   # 회원가입 페이지
│   └── page.tsx                          # 홈 (보호됨)
├── components/
│   ├── auth/
│   │   └── user-menu.tsx                 # 사용자 메뉴 (로그아웃)
│   └── history/
│       └── providers.tsx                 # SessionProvider 추가 ✓
├── middleware.ts                         # 인증 미들웨어
└── types/
    └── next-auth.d.ts                    # TypeScript 타입 정의

prisma/
├── schema.prisma                         # DB 모델 (수정됨)
└── seed.ts                               # 테스트 데이터 생성 (수정됨)
```

---

## 다음 단계

### 1. Google/GitHub OAuth 활성화 (선택)
- 위의 "개발 환경 설정" 참고
- OAuth 설정 후 로그인 페이지에 버튼이 활성화됨

### 2. 기타 API 라우트 보호
현재 `/api/materials`만 보호됨. 다른 API도 보호하려면:

```typescript
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { error: "로그인이 필요합니다." },
      { status: 401 }
    );
  }
  // 나머지 로직...
}
```

### 3. 역할 기반 권한 관리 (RBAC)
```typescript
// 예: 교역자만 자료 생성 가능
if (session.user.role !== "교역자") {
  return NextResponse.json(
    { error: "권한이 없습니다." },
    { status: 403 }
  );
}
```

### 4. 로그인 세션 길이 조정
`src/lib/auth.ts`에서:
```typescript
session: {
  maxAge: 30 * 24 * 60 * 60, // 30일 → 원하는 값으로 변경
}
```

---

## 보안 체크리스트

- [ ] `NEXTAUTH_SECRET` 변경 (프로덕션에서 반드시 변경)
- [ ] `NEXTAUTH_URL` 프로덕션 URL로 변경
- [ ] Google/GitHub OAuth 설정 (필요 시)
- [ ] 데이터베이스 백업
- [ ] HTTPS 활성화 (프로덕션)
- [ ] rate limiting 추가 (선택)
- [ ] 2FA 구현 (선택)

---

## 문제 해결

### "세션이 저장되지 않음"
→ 미들웨어가 켜져있는지 확인 (`src/middleware.ts`)

### "로그인 후 자동으로 홈으로 안 감"
→ `useRouter().push()`가 실행되는지 확인

### "Google/GitHub 로그인 버튼 안 보임"
→ `.env`에서 `GOOGLE_CLIENT_ID` / `GITHUB_CLIENT_ID` 확인

### "비밀번호 검증 실패"
→ 시드 데이터의 비밀번호와 일치하는지 확인
