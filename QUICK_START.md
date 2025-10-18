# 빠른 시작 가이드 ⚡

5단계로 우리가족 일정관리 웹앱을 시작하세요!

## 📦 필요한 것

- ☑️ Google 계정 (Firebase용)
- ☑️ GitHub 계정 (선택 사항)
- ☑️ 10분의 시간

---

## 1단계: Firebase 프로젝트 생성 (3분) 🔥

### 1. Firebase Console 접속
👉 https://console.firebase.google.com/

### 2. 프로젝트 생성
1. **"프로젝트 추가"** 클릭
2. 프로젝트 이름 입력: `family-schedule`
3. Google Analytics: **비활성화** (필요 없음)
4. **"프로젝트 만들기"** 클릭

### 3. Firestore 활성화
1. 왼쪽 메뉴 > **"Firestore Database"** 클릭
2. **"데이터베이스 만들기"** 클릭
3. **데이터베이스 모드**: **"Native mode"** 선택 ✅
4. **"계속"** 클릭
5. **보안 규칙**: **"프로덕션 모드로 시작"** ✅ (무료! 무제한!)
   > ⚠️ 테스트 모드는 30일 후 차단됩니다. 프로덕션 모드를 선택하세요!
6. 위치 선택: **"asia-northeast3 (서울)"** ✅
7. **"사용 설정"** 클릭

### 4. 보안 규칙 설정 (30초) 🔒
데이터베이스 생성 후 "규칙" 탭에서:

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

**"게시"** 버튼 클릭!

✅ **1단계 완료!**

---

## 2단계: Firebase 설정 복사 (2분) 📋

### 1. 웹 앱 추가
1. Firebase Console 홈
2. **웹 아이콘(</>)** 클릭
3. 앱 닉네임: `family-schedule-web`
4. Firebase Hosting: **체크 해제**
5. **"앱 등록"** 클릭

### 2. 설정 복사
다음과 같은 코드가 나타납니다:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "family-schedule-xxxxx.firebaseapp.com",
  projectId: "family-schedule-xxxxx",
  storageBucket: "family-schedule-xxxxx.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

이 설정을 **복사**해두세요! 📝

✅ **2단계 완료!**

---

## 3단계: 프로젝트 설정 (2분) ⚙️

### 1. 코드 다운로드
```bash
git clone <repository-url>
cd schedule_webapp
```

또는 ZIP 파일 다운로드 후 압축 해제

### 2. Firebase 설정 파일 생성

#### Windows (명령 프롬프트):
```cmd
cd frontend\js
copy firebase-config-example.js firebase-config.js
```

#### Mac/Linux:
```bash
cd frontend/js
cp firebase-config-example.js firebase-config.js
```

### 3. Firebase 설정 입력

`frontend/js/firebase-config.js` 파일을 열고 2단계에서 복사한 값을 붙여넣기:

```javascript
const firebaseConfig = {
    apiKey: "여기에_복사한_값",
    authDomain: "여기에_복사한_값",
    projectId: "여기에_복사한_값",
    storageBucket: "여기에_복사한_값",
    messagingSenderId: "여기에_복사한_값",
    appId: "여기에_복사한_값"
};
```

저장! 💾

✅ **3단계 완료!**

---

## 4단계: 로컬 실행 (1분) 🚀

### 옵션 A: Python 사용
```bash
cd frontend
python -m http.server 8000
```

### 옵션 B: Node.js 사용
```bash
npx http-server frontend -p 8000
```

### 옵션 C: VS Code Live Server
1. VS Code로 `frontend/index.html` 열기
2. 우클릭 > "Open with Live Server"

### 브라우저 접속
👉 http://localhost:8000

✅ **4단계 완료!**

---

## 5단계: 배포 (2분) 🌐

### 가장 쉬운 방법: Vercel

#### 1. Vercel 가입
👉 https://vercel.com

GitHub 계정으로 로그인

#### 2. 프로젝트 가져오기
1. "New Project" 클릭
2. GitHub 저장소 연결 (또는 폴더 업로드)
3. Root Directory: **`frontend`** 입력
4. "Deploy" 클릭

#### 3. 환경 변수 설정 (중요!)
1. Project Settings > Environment Variables
2. 다음 변수들 추가:

```
VITE_FIREBASE_API_KEY=여기에_복사한_값
VITE_FIREBASE_AUTH_DOMAIN=여기에_복사한_값
VITE_FIREBASE_PROJECT_ID=여기에_복사한_값
VITE_FIREBASE_STORAGE_BUCKET=여기에_복사한_값
VITE_FIREBASE_MESSAGING_SENDER_ID=여기에_복사한_값
VITE_FIREBASE_APP_ID=여기에_복사한_값
```

#### 4. 재배포
"Deployments" > "Redeploy"

✅ **5단계 완료!**

---

## 🎉 완료!

이제 다음 URL로 어디서든 접속 가능합니다:
```
https://your-project.vercel.app
```

---

## 🔥 첫 일정 추가하기

1. **"일정 추가"** 버튼 클릭
2. 정보 입력:
   - 제목: `주환 수영 수업`
   - 날짜: 오늘
   - 시간: `14:00`
   - 담당자: `주환`
3. **"저장"** 클릭

캘린더에 일정이 표시됩니다! 🎊

---

## 📱 모바일에서 사용하기

### iPhone/iPad
1. Safari로 웹앱 접속
2. 공유 버튼 (↑) 클릭
3. **"홈 화면에 추가"** 선택
4. 이제 앱처럼 사용 가능! 📱

### Android
1. Chrome으로 웹앱 접속
2. 메뉴 (⋮) > **"홈 화면에 추가"**
3. 이제 앱처럼 사용 가능! 📱

---

## 🆘 문제 해결

### "Firebase is not defined" 오류
→ `firebase-config.js` 파일이 제대로 생성되었는지 확인

### 일정이 저장되지 않음
→ Firebase Firestore가 **테스트 모드**로 설정되었는지 확인

### CORS 오류
→ HTTP 서버를 사용하고 있는지 확인 (파일을 직접 열지 말 것)

---

## 📚 다음 단계

- [README.md](README.md) - 전체 문서 읽기
- [FIREBASE_SETUP.md](FIREBASE_SETUP.md) - Firebase 상세 설정
- [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) - 고급 배포 방법

---

## ⏱️ 총 소요 시간

- Firebase 설정: 3분
- 설정 복사: 2분
- 프로젝트 설정: 2분
- 로컬 실행: 1분
- 배포: 2분

**총 10분!** ⚡

---

**작성일**: 2025-10-18

이제 가족과 함께 일정을 관리하세요! 👨‍👩‍👧‍👦

