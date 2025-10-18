# Firebase 설정 가이드

이 문서는 우리가족 일정관리 웹앱에서 Firebase Firestore를 설정하는 방법을 안내합니다.

## 📋 준비사항

- Google 계정
- 인터넷 연결

## 🔥 Firebase 프로젝트 생성

### 1. Firebase Console 접속

1. [Firebase Console](https://console.firebase.google.com/)에 접속
2. Google 계정으로 로그인

### 2. 새 프로젝트 생성

1. **"프로젝트 추가"** 또는 **"Add project"** 클릭
2. 프로젝트 이름 입력 (예: `family-schedule-app`)
3. Google Analytics 사용 여부 선택 (선택 사항, 비활성화 가능)
4. **"프로젝트 만들기"** 클릭
5. 프로젝트 생성 완료 대기 (1-2분 소요)

### 3. Firestore 데이터베이스 생성

1. 왼쪽 메뉴에서 **"Firestore Database"** 클릭
2. **"데이터베이스 만들기"** 클릭
3. **데이터베이스 모드 선택**:
   - **Native mode (Standard)** 선택 ✅ **← 이것!**
   - ~~Datastore mode (Enterprise)~~ ← 선택 안 함
   - "계속" 클릭
4. 보안 규칙 선택:
   - **테스트 모드로 시작**: 개발/테스트용 (30일 제한 ⚠️)
   - **프로덕션 모드로 시작**: 실제 운영용 (무제한 ✅) **← 추천!**
   
   > 💡 **중요**: 테스트 모드는 30일 후 자동 차단됩니다. **프로덕션 모드로 시작**하고 아래 보안 규칙을 설정하는 것을 강력히 추천합니다!
   
   > ✅ **프로덕션 모드도 완전 무료**입니다! 비용 걱정 없이 사용하세요.

5. Firestore 위치 선택:
   - **asia-northeast3 (서울)** - 한국에서 가장 빠름 ✅ 추천
   - **asia-northeast1 (도쿄)** - 두 번째 선택
   
6. **"사용 설정"** 클릭

7. **보안 규칙 즉시 설정** (프로덕션 모드 선택 시):
   - 데이터베이스 생성 후 자동으로 "규칙" 탭이 열립니다
   - 아래 "보안 규칙 설정" 섹션의 규칙을 복사하여 붙여넣기
   - **"게시"** 버튼 클릭

### 4. 웹 앱 추가 및 설정 가져오기

> 💡 **중요**: 이제 서비스 계정 키가 아닌 **웹 앱 설정**을 사용합니다!

1. Firebase Console 홈 또는 **프로젝트 설정** 페이지로 이동
2. **"내 앱"** 섹션 찾기
3. **웹 아이콘 (`</>`)** 클릭
4. 앱 닉네임 입력: `family-schedule-web`
5. **Firebase Hosting 설정**: 체크 해제 (필요 없음)
6. **"앱 등록"** 클릭
7. **Firebase SDK 설정** 화면에서 `firebaseConfig` 객체 전체를 복사:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef..."
};
```

8. **"콘솔로 이동"** 클릭

> ✅ **팁**: 나중에 다시 보려면 프로젝트 설정 > 내 앱 > 웹 앱에서 확인할 수 있습니다.

## 🔐 보안 규칙 설정 ⭐ 중요!

### 프로덕션 모드 사용 시 필수!

프로덕션 모드로 시작하면 보안 규칙을 설정해야 합니다. 걱정하지 마세요 - 매우 간단합니다!

### Firestore 보안 규칙 설정 방법

1. Firebase Console > Firestore Database > **"규칙"** 탭 클릭
2. 기본 규칙을 아래 코드로 **전체 교체**:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // schedules 컬렉션: 모두 읽기/쓰기 가능 (가족용 앱)
    match /schedules/{scheduleId} {
      allow read, write: if true;
    }
  }
}
```

3. **"게시"** 버튼 클릭
4. 완료! ✅

### 💡 이 규칙의 의미

- `allow read, write: if true` = 누구나 읽기/쓰기 가능
- **가족용 앱에 적합**: 별도 인증 없이 가족 모두 사용 가능
- **완전 무료**: 무료 플랜에서 무제한 사용

### 🔒 보안 강화 옵션 (선택 사항)

더 강력한 보안이 필요하다면:

#### 옵션 1: 특정 도메인만 허용
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /schedules/{scheduleId} {
      // 특정 도메인에서만 접근 가능
      allow read, write: if request.auth == null && 
                            request.time < timestamp.date(2026, 1, 1);
    }
  }
}
```

#### 옵션 2: Firebase Authentication 추가 (고급)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /schedules/{scheduleId} {
      // 로그인한 사용자만 접근 가능
      allow read, write: if request.auth != null;
    }
  }
}
```

> 💡 **가족용 앱에는 기본 규칙으로 충분**합니다! Firebase API 키 제한으로 추가 보안을 설정할 수 있습니다 (아래 참고).

## 💻 로컬 개발 환경 설정

### 방법 1: 파일 경로 사용 (추천 - 로컬 개발용)

1. 다운로드한 JSON 파일을 프로젝트 루트에 `firebase-key.json`으로 저장
2. `.env` 파일 생성:

```bash
# .env 파일
FIREBASE_SERVICE_ACCOUNT_PATH=firebase-key.json
OPENAI_API_KEY=your-openai-api-key-here
SECRET_KEY=your-secret-key-here
DEBUG=True
CORS_ORIGINS=http://localhost:8000,http://127.0.0.1:8000
```

### 방법 2: JSON 문자열 사용 (추천 - 배포/프로덕션용)

1. JSON 파일 내용을 한 줄로 변환
2. `.env` 파일에 설정:

```bash
# .env 파일
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"your-project-id",...전체 내용...}
OPENAI_API_KEY=your-openai-api-key-here
SECRET_KEY=your-secret-key-here
DEBUG=False
CORS_ORIGINS=https://yourdomain.com
```

## ☁️ 배포 환경 설정

### Vercel / Netlify / Heroku 등

1. 환경 변수 설정 페이지로 이동
2. `FIREBASE_SERVICE_ACCOUNT_JSON` 환경 변수 추가
3. JSON 파일의 전체 내용을 값으로 붙여넣기

### Docker

`docker-compose.yml`에서 환경 변수 설정:

```yaml
environment:
  - FIREBASE_SERVICE_ACCOUNT_JSON=${FIREBASE_SERVICE_ACCOUNT_JSON}
  - OPENAI_API_KEY=${OPENAI_API_KEY}
```

## 🧪 연결 테스트

### 1. 패키지 설치

```bash
cd backend
pip install -r requirements.txt
```

### 2. 서버 실행

```bash
cd backend
python app.py
# 또는
uvicorn app:app --reload
```

### 3. Health Check

브라우저에서 다음 URL 접속:
```
http://localhost:8000/api/health
```

다음과 같은 응답이 나오면 성공:
```json
{
  "status": "healthy",
  "timestamp": "2025-10-18T...",
  "database": "Firebase Firestore",
  "connected": true
}
```

## 📊 Firestore 데이터 구조

### schedules 컬렉션

각 문서는 다음 필드를 가집니다:

```javascript
{
  title: string,              // 일정 제목
  description: string | null, // 일정 설명
  start_datetime: timestamp,  // 시작 시간
  end_datetime: timestamp | null, // 종료 시간
  person: string,             // 'all', 'dad', 'mom', 'juhwan', 'taehwan'
  color: string,              // 색상 코드 (예: '#3788d8')
  is_past: boolean,           // 지난 일정 여부
  created_at: timestamp,      // 생성 시간
  updated_at: timestamp       // 수정 시간
}
```

## 💰 무료 사용량 (Spark Plan)

Firebase는 **완전 무료 플랜**에서 다음을 제공합니다:

- ✅ **Firestore**: 1 GiB 저장공간
- ✅ **읽기**: 50,000회/일
- ✅ **쓰기**: 20,000회/일
- ✅ **삭제**: 20,000회/일
- ✅ **무제한 기간**: 30일 제한 없음!
- ✅ **신용카드 불필요**: 등록 없이 사용 가능

> 가족 일정관리 앱으로는 충분합니다! 💯

### 💡 무료 플랜 vs 유료 플랜

| 항목 | Spark (무료) | Blaze (종량제) |
|------|-------------|---------------|
| 비용 | 0원 | 사용량 초과 시 과금 |
| Firestore | 1GB, 50K reads/day | 무제한 |
| 신용카드 | 불필요 | 필요 |
| 적합 대상 | 가족용 앱 ✅ | 대규모 서비스 |

**가족 일정관리 앱은 무료 플랜으로 충분합니다!**

## ❓ 자주 묻는 질문 (FAQ)

### Q1: Native mode vs Datastore mode, 어떤 걸 선택해야 하나요?

**A:** **Native mode**를 선택하세요! ✅

| 항목 | Native mode | Datastore mode |
|------|------------|----------------|
| 용도 | 웹/모바일 앱 ✅ | 서버 백엔드 |
| 실시간 동기화 | 지원 ✅ | 미지원 |
| 쿼리 | 간단 ✅ | 복잡 |
| 우리 앱 | ✅ 이것! | ❌ |

**→ 우리 가족 일정 앱은 Native mode가 딱 맞습니다!**

### Q2: 테스트 모드 vs 프로덕션 모드, 어떤 차이가 있나요?

**A:** 비용은 동일하게 **무료**입니다! 차이점은:

| 항목 | 테스트 모드 | 프로덕션 모드 |
|------|------------|--------------|
| 비용 | 무료 | 무료 |
| 기간 | 30일 제한 ⚠️ | 무제한 ✅ |
| 보안 규칙 | 자동 설정 (모두 접근) | 수동 설정 필요 |

**→ 프로덕션 모드를 선택하고 간단한 보안 규칙을 설정하는 것을 추천합니다!**

### Q3: 프로덕션 모드를 사용하면 비용이 발생하나요?

**A:** 아니요! **완전 무료**입니다. Firebase 무료 플랜(Spark Plan)은:
- 신용카드 등록 불필요
- 무제한 기간 사용
- 가족 앱으로 충분한 용량 제공

### Q4: 테스트 모드로 시작했는데 30일 후에는 어떻게 하나요?

**A:** 두 가지 방법이 있습니다:

**방법 1: 보안 규칙 업데이트 (추천)**
1. Firebase Console > Firestore Database > 규칙
2. 위의 프로덕션 모드 보안 규칙 복사
3. "게시" 클릭

**방법 2: 새 프로젝트 생성**
- 새 Firebase 프로젝트를 만들고 데이터 수동 이동

### Q5: 보안 규칙 설정이 어려워요. 어떻게 하나요?

**A:** 매우 간단합니다! 다음 코드만 복사-붙여넣기:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /schedules/{scheduleId} {
      allow read, write: if true;
    }
  }
}
```

이것만으로 충분합니다!

### Q6: 무료 용량이 부족하면 어떻게 되나요?

**A:** 가족 일정 앱 기준:
- 일일 예상 사용량: 읽기 ~50회, 쓰기 ~10회
- 무료 한도: 읽기 50,000회/일, 쓰기 20,000회/일
- **→ 1,000배 이상 여유** 있습니다!

부족할 일이 거의 없지만, 만약 초과하면 해당 날짜에만 일시적으로 접근이 제한됩니다.

### Q7: 다른 사람이 내 데이터에 접근할 수 있나요?

**A:** Firebase 설정 URL을 모르면 접근할 수 없습니다. 추가 보안이 필요하면:
1. Firebase API 키 제한 설정 (HTTP 리퍼러)
2. Firebase Authentication 추가

기본 설정으로도 가족 앱으로는 안전합니다.

## 🔧 문제 해결

### "Firebase credentials not found" 오류

1. `firebase-config.js` 파일이 `frontend/js/` 폴더에 있는지 확인
2. Firebase 설정 값이 올바르게 입력되었는지 확인
3. 따옴표와 쉼표가 제대로 있는지 확인

### "Permission denied" 오류

1. **테스트 모드 30일 만료**: 보안 규칙을 프로덕션 모드로 업데이트
2. **보안 규칙 미설정**: 위의 보안 규칙 복사하여 "게시"
3. **Firestore 미활성화**: Firebase Console에서 Firestore 활성화

### 연결 속도가 느린 경우

1. Firestore 위치가 한국(asia-northeast3) 또는 일본(asia-northeast1)인지 확인
2. 인터넷 연결 상태 확인
3. 브라우저 캐시 삭제

## 📚 참고 자료

- [Firebase 공식 문서](https://firebase.google.com/docs)
- [Firestore 시작하기](https://firebase.google.com/docs/firestore/quickstart)
- [Firebase Admin SDK (Python)](https://firebase.google.com/docs/admin/setup)

## 🆘 도움이 필요하신가요?

- [Firebase 커뮤니티](https://firebase.google.com/community)
- [Stack Overflow - Firebase 태그](https://stackoverflow.com/questions/tagged/firebase)

---

**작성일**: 2025-10-18

