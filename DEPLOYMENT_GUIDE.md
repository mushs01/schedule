# 배포 가이드 🚀

우리가족 일정관리 웹앱을 무료로 배포하는 방법을 안내합니다.

## 📋 배포 전 준비사항

### 1. Firebase 설정 완료
- Firebase 프로젝트 생성 완료
- Firestore 데이터베이스 활성화 완료
- Firebase 설정 값 확보

### 2. GitHub 저장소 준비
- 코드가 GitHub에 업로드되어 있어야 합니다
- `firebase-config.js` 파일은 업로드하지 마세요 (`.gitignore`에 포함됨)

## 🌟 추천 배포 방식

### ⭐ Vercel (가장 추천)
- ✅ 무료
- ✅ 자동 배포
- ✅ HTTPS 자동 적용
- ✅ 커스텀 도메인 지원
- ✅ 빠른 속도

### 🔷 Netlify
- ✅ 무료
- ✅ 자동 배포
- ✅ HTTPS 자동 적용
- ✅ 폼 처리 기능
- ✅ 서버리스 함수 지원

### 🐙 GitHub Pages
- ✅ 무료
- ✅ GitHub 통합
- ⚠️ 공개 저장소만 무료
- ⚠️ 빌드 과정 필요

---

## 1️⃣ Vercel 배포

### 방법 A: Vercel CLI (빠른 방법)

#### 1. Vercel CLI 설치
```bash
npm install -g vercel
```

#### 2. 프로젝트 폴더로 이동
```bash
cd schedule_webapp
```

#### 3. Vercel 로그인
```bash
vercel login
```

#### 4. 배포
```bash
cd frontend
vercel --prod
```

#### 5. 환경 변수 설정
Firebase 설정을 환경 변수로 설정:

```bash
vercel env add VITE_FIREBASE_API_KEY
vercel env add VITE_FIREBASE_AUTH_DOMAIN
vercel env add VITE_FIREBASE_PROJECT_ID
vercel env add VITE_FIREBASE_STORAGE_BUCKET
vercel env add VITE_FIREBASE_MESSAGING_SENDER_ID
vercel env add VITE_FIREBASE_APP_ID
```

### 방법 B: Vercel 웹사이트 (초보자용)

#### 1. Vercel 계정 생성
1. [Vercel](https://vercel.com) 접속
2. GitHub 계정으로 로그인

#### 2. 프로젝트 가져오기
1. "New Project" 클릭
2. GitHub 저장소 선택
3. Import 클릭

#### 3. 프로젝트 설정
- **Framework Preset**: Other
- **Root Directory**: `frontend`
- **Build Command**: (비워두기)
- **Output Directory**: `.` (점 하나)

#### 4. 배포 스크립트 생성
프로젝트 루트에 `build.sh` 파일 생성:

```bash
#!/bin/bash

# Firebase 설정 파일 생성
cat > frontend/js/firebase-config.js << EOF
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

const firebaseConfig = {
    apiKey: "${VITE_FIREBASE_API_KEY}",
    authDomain: "${VITE_FIREBASE_AUTH_DOMAIN}",
    projectId: "${VITE_FIREBASE_PROJECT_ID}",
    storageBucket: "${VITE_FIREBASE_STORAGE_BUCKET}",
    messagingSenderId: "${VITE_FIREBASE_MESSAGING_SENDER_ID}",
    appId: "${VITE_FIREBASE_APP_ID}"
};

let app;
let db;

try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    console.log('✅ Firebase initialized successfully');
} catch (error) {
    console.error('❌ Firebase initialization error:', error);
}

export { db };
EOF

echo "Firebase config created successfully"
```

그리고 실행 권한 부여:
```bash
chmod +x build.sh
```

#### 5. 환경 변수 설정
1. Vercel 프로젝트 설정 > Environment Variables
2. 다음 환경 변수 추가:

```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

#### 6. 재배포
1. "Deployments" 탭
2. "Redeploy" 클릭

---

## 2️⃣ Netlify 배포

### 방법 A: Netlify CLI

#### 1. Netlify CLI 설치
```bash
npm install -g netlify-cli
```

#### 2. 로그인
```bash
netlify login
```

#### 3. 배포
```bash
cd frontend
netlify deploy --prod
```

### 방법 B: Netlify 웹사이트

#### 1. Netlify 계정 생성
1. [Netlify](https://netlify.com) 접속
2. GitHub 계정으로 로그인

#### 2. 새 사이트 생성
1. "New site from Git" 클릭
2. GitHub 선택
3. 저장소 선택

#### 3. 빌드 설정
- **Base directory**: `frontend`
- **Build command**: (비워두기)
- **Publish directory**: `frontend` 또는 `.`

#### 4. 빌드 스크립트 생성 (선택 사항)
`netlify.toml` 파일을 프로젝트 루트에 생성:

```toml
[build]
  base = "frontend"
  publish = "."
  command = "echo 'No build needed'"

[build.environment]
  NODE_VERSION = "18"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

#### 5. 환경 변수 설정
1. Site settings > Build & deploy > Environment
2. Vercel과 동일한 환경 변수 추가

---

## 3️⃣ GitHub Pages 배포

### 간단한 방법 (Firebase 설정 공개)

> ⚠️ **참고**: Firebase Web API 키는 공개되어도 안전합니다. Firestore 보안 규칙으로 데이터를 보호할 수 있습니다.

#### 1. firebase-config.js 파일 생성
실제 Firebase 설정 값으로 `frontend/js/firebase-config.js` 파일을 생성하고 커밋:

```bash
git add frontend/js/firebase-config.js
git commit -m "Add Firebase config for deployment"
git push
```

#### 2. GitHub Pages 활성화
1. GitHub 저장소 > Settings > Pages
2. Source: `main` 브랜치, `/frontend` 폴더 선택
3. Save

#### 3. 접속
```
https://your-username.github.io/schedule_webapp/
```

### 고급 방법 (GitHub Actions 사용)

`.github/workflows/deploy.yml` 파일 생성:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Create Firebase Config
        run: |
          cat > frontend/js/firebase-config.js << EOF
          import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
          import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
          
          const firebaseConfig = {
              apiKey: "${{ secrets.FIREBASE_API_KEY }}",
              authDomain: "${{ secrets.FIREBASE_AUTH_DOMAIN }}",
              projectId: "${{ secrets.FIREBASE_PROJECT_ID }}",
              storageBucket: "${{ secrets.FIREBASE_STORAGE_BUCKET }}",
              messagingSenderId: "${{ secrets.FIREBASE_MESSAGING_SENDER_ID }}",
              appId: "${{ secrets.FIREBASE_APP_ID }}"
          };
          
          let app;
          let db;
          
          try {
              app = initializeApp(firebaseConfig);
              db = getFirestore(app);
              console.log('✅ Firebase initialized successfully');
          } catch (error) {
              console.error('❌ Firebase initialization error:', error);
          }
          
          export { db };
          EOF
      
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./frontend
          publish_branch: gh-pages
```

GitHub Secrets 설정:
1. Repository Settings > Secrets and variables > Actions
2. 각 Firebase 설정 값을 Secret으로 추가

---

## 4️⃣ Firebase Hosting 배포

Firebase 자체 호스팅 서비스 사용:

### 1. Firebase CLI 설치
```bash
npm install -g firebase-tools
```

### 2. Firebase 로그인
```bash
firebase login
```

### 3. Firebase 초기화
```bash
cd schedule_webapp
firebase init hosting
```

설정:
- Public directory: `frontend`
- Single-page app: Yes
- GitHub action: No (선택 사항)

### 4. firebase-config.js 생성
실제 설정 값으로 파일 생성

### 5. 배포
```bash
firebase deploy --only hosting
```

---

## 🔧 배포 후 설정

### 1. Firebase 보안 규칙 설정

Firebase Console > Firestore Database > 규칙:

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

### 2. Firebase API 키 제한 (권장)

Firebase Console > Google Cloud Console > API 및 서비스 > 사용자 인증 정보:

1. API 키 선택
2. "애플리케이션 제한사항" 설정
3. HTTP 리퍼러 추가:
   ```
   https://your-domain.com/*
   https://your-domain.vercel.app/*
   ```

### 3. 커스텀 도메인 설정 (선택 사항)

#### Vercel
1. Project Settings > Domains
2. 도메인 추가 및 DNS 설정

#### Netlify
1. Domain settings > Add custom domain
2. DNS 설정

---

## 📊 배포 플랫폼 비교

| 기능 | Vercel | Netlify | GitHub Pages | Firebase Hosting |
|------|--------|---------|--------------|------------------|
| 무료 플랜 | ✅ | ✅ | ✅ | ✅ |
| HTTPS | ✅ | ✅ | ✅ | ✅ |
| 자동 배포 | ✅ | ✅ | ✅ (Actions) | ❌ |
| 커스텀 도메인 | ✅ | ✅ | ✅ | ✅ |
| 빌드 시간 | 빠름 | 빠름 | 보통 | N/A |
| 환경 변수 | ✅ | ✅ | ✅ (Secrets) | ❌ |
| 서버리스 함수 | ✅ | ✅ | ❌ | ✅ |

## 🎯 추천

- **초보자**: Vercel 웹사이트 방식
- **빠른 배포**: Vercel CLI
- **Firebase 통합**: Firebase Hosting
- **완전 무료**: GitHub Pages

---

## 🆘 문제 해결

### 404 오류
- 빌드 디렉토리 설정 확인
- `frontend` 폴더가 제대로 배포되었는지 확인

### Firebase 연결 오류
- 환경 변수가 올바르게 설정되었는지 확인
- `firebase-config.js` 파일이 생성되었는지 확인

### CORS 오류
- Firebase 보안 규칙 확인
- API 키 제한 설정 확인

---

**작성일**: 2025-10-18

이제 전 세계 어디서나 접속 가능한 웹앱이 완성되었습니다! 🎉

