# 우리가족 일정관리 웹앱 🏠📅

가족 구성원(아빠, 엄마, 주환, 태환)의 일정을 함께 관리할 수 있는 웹 애플리케이션입니다.

**Firebase Firestore 기반**으로 어떤 기기에서든 실시간으로 동기화됩니다! ☁️

## ✨ 주요 특징

- 📅 **캘린더 기반 일정 관리**: 월/주/일 단위로 일정 확인
- ➕ **일정 추가/수정/삭제**: 간편한 팝업 인터페이스
- 👨‍👩‍👧‍👦 **가족 구성원별 일정**: 색상으로 구분된 일정 표시
- 📱 **모바일 최적화**: 반응형 디자인으로 모든 기기에서 사용 가능
- ☁️ **실시간 동기화**: Firebase Firestore로 모든 기기에서 동기화
- 🌍 **어디서나 접속**: PC, 스마트폰, 태블릿 어디서든 동일한 데이터
- 🚀 **서버 불필요**: 완전 프론트엔드 방식으로 구현
- 🆓 **무료 배포**: Vercel, Netlify, GitHub Pages 등에 무료 배포 가능

## 🎯 주요 기능

### 1. 실시간 동기화
- 집, 직장, 스마트폰 어디서든 동일한 일정 확인
- Firebase 클라우드 데이터베이스로 안전하게 저장
- 자동 백업 및 복구

### 2. 가족 구성원 관리
- 🔵 **아빠**: 파란색
- 🟣 **엄마**: 보라색
- 🟢 **주환**: 초록색
- 🟡 **태환**: 노란색
- ⚪ **전체**: 회색

### 3. 일정 요약
- 오늘의 일정을 한눈에 파악
- 간단한 요약 기능 제공

## 🛠 기술 스택

### 프론트엔드
- **Vanilla JavaScript**: ES6 모듈 시스템 사용
- **FullCalendar.js**: 강력한 캘린더 라이브러리
- **CSS3**: 모던하고 깔끔한 디자인

### 백엔드/데이터베이스
- **Firebase Firestore**: 구글의 NoSQL 클라우드 데이터베이스
- **Firebase Web SDK**: JavaScript용 Firebase SDK
- **완전 프론트엔드 방식**: 별도의 백엔드 서버 불필요

## 📁 프로젝트 구조

```
schedule_webapp/
├── frontend/
│   ├── index.html                      # 메인 페이지
│   ├── css/
│   │   └── style.css                   # 스타일시트
│   └── js/
│       ├── firebase-config.js          # Firebase 설정 (실제 키 입력)
│       ├── firebase-config-example.js  # Firebase 설정 예시
│       ├── api.js                      # Firestore API 통신
│       ├── calendar.js                 # 캘린더 로직
│       └── app.js                      # 메인 애플리케이션
├── backend_archive/                    # 이전 백엔드 코드 아카이브
├── .gitignore                          # Git 제외 파일
├── README.md                           # 프로젝트 문서
├── DEPLOYMENT_GUIDE.md                 # 배포 가이드 📖
└── FIREBASE_SETUP.md                   # Firebase 설정 가이드 📖
```

## 🚀 설치 및 실행

### 전제 조건
- Firebase 프로젝트 (무료)
- 웹 브라우저
- (배포 시) Vercel/Netlify 계정 (무료)

### 1. 저장소 클론
```bash
git clone <repository-url>
cd schedule_webapp
```

### 2. Firebase 설정

#### 2.1 Firebase 프로젝트 생성
1. [Firebase Console](https://console.firebase.google.com/)에 접속
2. "프로젝트 추가" 클릭
3. 프로젝트 이름 입력 (예: `family-schedule-app`)
4. 프로젝트 생성

#### 2.2 Firestore 데이터베이스 활성화
1. Firebase Console > Firestore Database
2. "데이터베이스 만들기" 클릭
3. **데이터베이스 모드**: **Native mode** 선택 ✅
4. "계속" 클릭
5. **보안 규칙**: **프로덕션 모드로 시작** 선택 (무료! 무제한!) ✅
   > ⚠️ 테스트 모드는 30일 후 차단됩니다. 프로덕션 모드를 권장합니다!
6. 위치: **asia-northeast3 (서울)** 권장
7. "사용 설정" 클릭
8. **보안 규칙 설정** (즉시):
   - "규칙" 탭에서 아래 코드로 교체:
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
   - "게시" 클릭

#### 2.3 웹 앱 추가 및 설정 가져오기
1. Firebase Console > 프로젝트 설정
2. "내 앱" 섹션에서 웹 앱(</>)  추가
3. 앱 닉네임 입력
4. Firebase SDK 설정 복사

### 3. Firebase 설정 파일 생성

`frontend/js/firebase-config-example.js` 파일을 복사하여 `frontend/js/firebase-config.js`로 이름 변경:

```bash
cp frontend/js/firebase-config-example.js frontend/js/firebase-config.js
```

그리고 `firebase-config.js` 파일을 열어 실제 Firebase 설정 값을 입력:

```javascript
const firebaseConfig = {
    apiKey: "AIza...",  // 실제 API 키
    authDomain: "your-project-id.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project-id.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:abcdef1234567890"
};
```

> ⚠️ **중요**: `firebase-config.js` 파일은 `.gitignore`에 포함되어 GitHub에 업로드되지 않습니다.

### 4. 로컬 실행

#### 방법 A: 실행 스크립트 사용 (추천) ⭐

**Windows:**
```bash
start-local.bat
```

**Mac/Linux:**
```bash
chmod +x start-local.sh
./start-local.sh
```

#### 방법 B: 직접 실행

**Python 사용:**
```bash
cd frontend
python -m http.server 8000
```

**Node.js 사용:**
```bash
npx http-server frontend -p 8000
```

**VS Code Live Server:**
1. VS Code에서 `frontend/index.html` 열기
2. Live Server 확장 프로그램 설치
3. "Go Live" 클릭

### 5. 브라우저에서 접속
```
http://localhost:8000
```

## 🌐 배포

### Vercel 배포 (추천) ⭐

1. [Vercel](https://vercel.com) 계정 생성
2. GitHub 저장소 연결
3. 프로젝트 설정:
   - **Root Directory**: `frontend`
   - **Framework Preset**: Other
4. 환경 변수 설정:
   - Firebase 설정 값들을 환경 변수로 추가하거나
   - 빌드 전에 `firebase-config.js` 파일을 생성하도록 설정
5. 배포!

### Netlify 배포

1. [Netlify](https://netlify.com) 계정 생성
2. "New site from Git" 클릭
3. GitHub 저장소 선택
4. 빌드 설정:
   - **Base directory**: `frontend`
   - **Publish directory**: `frontend`
5. 배포!

### GitHub Pages 배포

1. GitHub 저장소 설정 > Pages
2. Source: `main` 브랜치, `/frontend` 폴더 선택
3. Firebase 설정 파일(`firebase-config.js`)을 저장소에 직접 추가
   - ⚠️ **주의**: Firebase Web API 키는 공개되어도 보안 규칙으로 보호 가능

> 📖 자세한 배포 가이드는 **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** 참고

## 📱 사용 방법

### 일정 추가
1. "일정 추가" 버튼 또는 캘린더에서 날짜 클릭
2. 일정 정보 입력 (제목, 시간, 담당자, 설명)
3. 저장 버튼 클릭

### 일정 수정/삭제
1. 등록된 일정 클릭
2. 수정 또는 삭제 버튼 클릭

### 다른 기기에서 접속
1. 배포된 URL로 접속 (예: `https://your-app.vercel.app`)
2. Firebase가 자동으로 동기화! ✨

## 🔒 보안

### Firebase 보안 규칙

Firestore 보안 규칙 설정 (Firebase Console > Firestore > 규칙):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // schedules 컬렉션: 모두 읽기/쓰기 가능 (가족용)
    match /schedules/{scheduleId} {
      allow read, write: if true;
    }
  }
}
```

> 💡 **더 강력한 보안**: Firebase Authentication을 추가하여 인증된 사용자만 접근하도록 설정할 수 있습니다.

### API 키 보안

- Firebase Web API 키는 **공개되어도 안전**합니다
- Firestore 보안 규칙으로 데이터 접근을 제어
- API 키 제한 (Firebase Console > API 및 서비스 > 사용자 인증 정보)
  - HTTP 리퍼러 제한 추가 권장

## 💰 비용

### Firebase (무료 플랜)
- ✅ Firestore: 1GB 저장공간
- ✅ 읽기: 50,000회/일
- ✅ 쓰기: 20,000회/일
- ✅ **가족 일정관리 앱으로는 충분합니다!**

### 호스팅
- ✅ Vercel: 무료
- ✅ Netlify: 무료
- ✅ GitHub Pages: 무료

## 🔧 문제 해결

### "Firebase is not defined" 오류
- `firebase-config.js` 파일이 있는지 확인
- Firebase 설정 값이 올바른지 확인
- 브라우저 콘솔에서 오류 메시지 확인

### CORS 오류
- HTTP 서버를 통해 실행하고 있는지 확인
- `file://` 프로토콜이 아닌 `http://`로 접속

### 일정이 로드되지 않음
- Firebase Console에서 Firestore 데이터베이스가 활성화되었는지 확인
- 보안 규칙이 읽기를 허용하는지 확인
- 브라우저 콘솔에서 네트워크 오류 확인

## 📚 참고 문서

- [FIREBASE_SETUP.md](FIREBASE_SETUP.md) - Firebase 상세 설정 가이드
- [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) - 배포 상세 가이드
- [GITHUB_UPLOAD_GUIDE.md](GITHUB_UPLOAD_GUIDE.md) - GitHub 업로드 가이드

## 🤝 기여

이 프로젝트는 우리 가족을 위한 프로젝트입니다. 
개선 사항이나 버그가 있다면 이슈를 등록해주세요!

## 📄 라이선스

MIT License

## 👨‍👩‍👧‍👦 제작

우리가족을 위한 일정관리 웹앱

---

**최초 작성일**: 2025-10-18  
**프론트엔드 전환**: 2025-10-18

## 🎉 빠른 시작

1. Firebase 프로젝트 생성 (5분)
2. `firebase-config.js` 설정 (2분)
3. Vercel/Netlify에 배포 (3분)
4. 완료! 🚀

**총 소요 시간: 약 10분** ⏱️

## 💡 팁

- Firebase Firestore는 실시간 동기화를 지원합니다
- 모바일 브라우저에서 "홈 화면에 추가"로 앱처럼 사용 가능
- PWA(Progressive Web App)로 확장 가능
