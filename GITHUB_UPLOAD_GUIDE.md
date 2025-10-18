# GitHub 업로드 가이드 📤

이 문서는 우리가족 일정관리 웹앱을 GitHub에 업로드하는 방법을 안내합니다.

## ✅ 업로드 전 체크리스트

다음 항목들이 준비되었는지 확인하세요:

- [x] Firebase 기반으로 전환 완료
- [x] `.gitignore` 파일 생성 (민감한 정보 보호)
- [x] 환경 변수 예시 파일 준비 (`env_example.txt`)
- [x] README.md 업데이트
- [x] FIREBASE_SETUP.md 가이드 작성

## ⚠️ 중요: 업로드하면 안 되는 파일

다음 파일들은 **절대 GitHub에 업로드하지 마세요**:

- ❌ `.env` - 환경 변수 (API 키 포함)
- ❌ `firebase-key.json` - Firebase 서비스 계정 키 (이전 백엔드용)
- ❌ `frontend/js/firebase-config.js` - Firebase Web 설정 (실제 키 포함) ⭐ 중요!
- ❌ `*.db`, `*.sqlite` - 데이터베이스 파일
- ❌ `__pycache__/` - Python 캐시 파일

> ✅ 이미 `.gitignore`에 포함되어 있으므로 자동으로 제외됩니다!

## 📋 GitHub 업로드 단계

### 방법 1: GitHub Desktop (추천 - 초보자용)

#### 1. GitHub Desktop 설치
- [GitHub Desktop 다운로드](https://desktop.github.com/)

#### 2. 저장소 생성
1. GitHub Desktop 실행
2. `File` > `New Repository` 클릭
3. 정보 입력:
   - **Name**: `family-schedule-webapp`
   - **Description**: `가족 일정관리 웹앱 (Firebase 기반)`
   - **Local Path**: 현재 프로젝트 폴더 선택
   - **Initialize with README**: 체크 해제 (이미 있음)
4. `Create Repository` 클릭

#### 3. 파일 커밋
1. 왼쪽에서 변경된 파일 확인
2. 민감한 정보가 포함된 파일이 없는지 확인
3. Summary 입력: `Initial commit - Firebase 기반 가족 일정관리 앱`
4. `Commit to main` 클릭

#### 4. GitHub에 발행
1. `Publish repository` 클릭
2. **Keep this code private** 체크 (선택 사항)
3. `Publish Repository` 클릭

✅ 완료! GitHub에 업로드되었습니다.

---

### 방법 2: Git 명령어 (고급 사용자용)

#### 1. Git 초기화
```bash
cd schedule_webapp
git init
```

#### 2. 원격 저장소 연결
GitHub에서 새 저장소를 생성한 후:
```bash
git remote add origin https://github.com/your-username/family-schedule-webapp.git
```

#### 3. 파일 추가 및 커밋
```bash
# 모든 파일 스테이징
git add .

# 커밋
git commit -m "Initial commit - Firebase 기반 가족 일정관리 앱"
```

#### 4. GitHub에 푸시
```bash
# 메인 브랜치로 푸시
git push -u origin main
```

또는 master 브랜치인 경우:
```bash
git branch -M main
git push -u origin main
```

---

## 🔍 업로드 후 확인사항

GitHub 저장소에 접속하여 다음을 확인하세요:

### ✅ 업로드되어야 하는 파일들
- `frontend/` 폴더 (HTML, CSS, JS)
  - ✅ `frontend/js/firebase-config-example.js` (예시 파일)
  - ❌ `frontend/js/firebase-config.js` (실제 설정 - 제외!)
- `backend_archive/` 폴더 (이전 백엔드 아카이브)
- `README.md`
- `QUICK_START.md` ⭐ 새로 추가!
- `FIREBASE_SETUP.md`
- `DEPLOYMENT_GUIDE.md` ⭐ 새로 추가!
- `GITHUB_UPLOAD_GUIDE.md`
- `.gitignore`

### ❌ 업로드되면 안 되는 파일들
- `.env` 파일
- `firebase-key.json`
- **`frontend/js/firebase-config.js`** ⭐ 가장 중요!
- `*.db`, `*.sqlite` 파일
- `__pycache__/` 폴더

> 만약 실수로 업로드했다면 즉시 삭제하고 키를 재발급받으세요!

---

## 🛡️ 보안 체크

### 1. .env 파일 확인
```bash
# .env 파일이 .gitignore에 있는지 확인
cat .gitignore | grep .env
```

### 2. Firebase 키 확인
```bash
# firebase-key.json이 .gitignore에 있는지 확인
cat .gitignore | grep firebase-key.json
```

### 3. Git 상태 확인
```bash
# 추적되지 않는 파일 확인
git status
```

---

## 📝 저장소 설명 예시

GitHub 저장소 생성 시 사용할 수 있는 설명:

**짧은 설명:**
```
가족 일정관리 웹앱 - Firebase Firestore 기반 실시간 동기화
```

**자세한 설명:**
```
🏠📅 우리가족 일정관리 웹앱

Firebase Firestore 기반으로 어떤 기기에서든 실시간 동기화되는 가족 일정 관리 웹 애플리케이션입니다.

✨ 주요 기능:
- 캘린더 기반 일정 관리
- 가족 구성원별 색상 구분
- AI 일정 요약 (OpenAI)
- 실시간 동기화 (Firebase)
- 모바일 최적화

🛠 기술 스택:
- Backend: FastAPI, Firebase Admin SDK
- Frontend: Vanilla JS, FullCalendar.js
- Database: Firebase Firestore
- AI: OpenAI GPT-3.5
```

**토픽 (Topics) 추가:**
```
fastapi
firebase
firestore
python
javascript
calendar
family-app
schedule-manager
openai
```

---

## 🔄 업데이트 방법

코드를 수정한 후 GitHub에 다시 업로드하려면:

### GitHub Desktop
1. 변경사항 확인
2. Commit message 작성
3. `Commit to main` 클릭
4. `Push origin` 클릭

### Git 명령어
```bash
git add .
git commit -m "업데이트 내용 설명"
git push
```

---

## 🌐 GitHub Pages 배포 (선택 사항)

GitHub Pages로 프론트엔드만 배포할 수 있습니다:

1. 저장소 설정 > Pages
2. Source: `main` 브랜치 선택
3. 폴더: `/ (root)` 선택
4. Save

> ⚠️ 백엔드는 별도 배포가 필요합니다 (Vercel, Render 등)

---

## 📚 참고 자료

- [GitHub Desktop 사용법](https://docs.github.com/en/desktop)
- [Git 기초 가이드](https://git-scm.com/book/ko/v2)
- [GitHub 저장소 만들기](https://docs.github.com/en/get-started/quickstart/create-a-repo)

---

## 🆘 문제 해결

### "Permission denied" 오류
- SSH 키 설정 또는 HTTPS 사용
- GitHub 계정 로그인 확인

### 민감한 정보를 실수로 업로드한 경우
1. 즉시 GitHub 저장소에서 삭제
2. Firebase 키 재발급
3. OpenAI API 키 재발급
4. `.gitignore` 확인 후 다시 커밋

### 파일이 너무 큰 경우
- `.gitignore`에 큰 파일 추가
- Git LFS 사용 고려

---

**작성일**: 2025-10-18

이제 안심하고 GitHub에 업로드하세요! 🚀

