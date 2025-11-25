# GitHub 업로드 가이드

## 📋 개요
이 문서는 로컬에서 수정한 파일을 GitHub 저장소에 업로드하는 방법을 설명합니다.

---

## 🗂️ 경로 구조

### 로컬 작업 폴더
```
C:\Users\ADMIN\.cursor\schedule_webapp\
├── frontend\
│   ├── css\
│   │   └── style.css
│   ├── js\
│   │   ├── app.js
│   │   ├── api.js
│   │   └── calendar.js
│   ├── icons\
│   │   └── kakao-icon.svg
│   └── index.html
└── backend\
```

### GitHub 저장소 폴더
```
C:\Users\ADMIN\Documents\GitHub\Schedule\
└── docs\
    ├── css\
    │   └── style.css
    ├── js\
    │   ├── app.js
    │   ├── api.js
    │   └── calendar.js
    ├── icons\
    │   └── kakao-icon.svg
    └── index.html
```

---

## 📝 업로드 단계별 가이드

### 1단계: 로컬 파일을 GitHub 저장소로 복사

PowerShell에서 다음 명령어를 실행합니다:

```powershell
# 작업 폴더로 이동
cd C:\Users\ADMIN\.cursor\schedule_webapp

# CSS 파일 복사
Copy-Item "frontend\css\style.css" -Destination "C:\Users\ADMIN\Documents\GitHub\Schedule\docs\css\style.css" -Force

# JavaScript 파일 복사
Copy-Item "frontend\js\calendar.js" -Destination "C:\Users\ADMIN\Documents\GitHub\Schedule\docs\js\calendar.js" -Force
Copy-Item "frontend\js\app.js" -Destination "C:\Users\ADMIN\Documents\GitHub\Schedule\docs\js\app.js" -Force
Copy-Item "frontend\js\api.js" -Destination "C:\Users\ADMIN\Documents\GitHub\Schedule\docs\js\api.js" -Force

# HTML 파일 복사
Copy-Item "frontend\index.html" -Destination "C:\Users\ADMIN\Documents\GitHub\Schedule\docs\index.html" -Force

# 아이콘 파일 복사 (필요시)
Copy-Item "frontend\icons\kakao-icon.svg" -Destination "C:\Users\ADMIN\Documents\GitHub\Schedule\docs\icons\kakao-icon.svg" -Force
```

---

### 2단계: Git에 변경사항 추가

```powershell
# GitHub 저장소로 이동
cd C:\Users\ADMIN\Documents\GitHub\Schedule

# Git 실행 파일 경로 찾기
$gitPath = (Get-ChildItem "$env:LOCALAPPDATA\GitHubDesktop\app-*\resources\app\git\cmd\git.exe" | Select-Object -First 1).FullName

# 변경된 파일들을 Git에 추가
& $gitPath add docs/css/style.css
& $gitPath add docs/js/calendar.js
& $gitPath add docs/js/app.js
& $gitPath add docs/js/api.js
& $gitPath add docs/index.html

# 또는 한 번에 추가
& $gitPath add docs/css/style.css docs/js/calendar.js docs/js/app.js docs/js/api.js docs/index.html
```

---

### 3단계: 변경사항 커밋

```powershell
# 커밋 메시지와 함께 변경사항 저장
& $gitPath commit -m "커밋 메시지 작성"

# 예시:
& $gitPath commit -m "Fix: 월 일정 담당자별 색상 표시 수정"
& $gitPath commit -m "Feature: 새로운 기능 추가"
& $gitPath commit -m "Update: UI 개선"
```

#### 커밋 메시지 작성 가이드
- `Fix:` - 버그 수정
- `Feature:` - 새로운 기능 추가
- `Update:` - 기존 기능 개선
- `Style:` - CSS/UI 변경
- `Refactor:` - 코드 리팩토링
- `Docs:` - 문서 수정

---

### 4단계: GitHub에 푸시

```powershell
# 원격 저장소(GitHub)에 업로드
& $gitPath push origin main
```

---

## 🚀 전체 과정 한 번에 실행

다음 스크립트를 PowerShell에 복사하여 실행하면 전체 과정을 한 번에 수행할 수 있습니다:

```powershell
# 1. 로컬 → GitHub 저장소로 파일 복사
cd C:\Users\ADMIN\.cursor\schedule_webapp
Copy-Item "frontend\css\style.css" -Destination "C:\Users\ADMIN\Documents\GitHub\Schedule\docs\css\style.css" -Force
Copy-Item "frontend\js\calendar.js" -Destination "C:\Users\ADMIN\Documents\GitHub\Schedule\docs\js\calendar.js" -Force
Copy-Item "frontend\js\app.js" -Destination "C:\Users\ADMIN\Documents\GitHub\Schedule\docs\js\app.js" -Force
Copy-Item "frontend\index.html" -Destination "C:\Users\ADMIN\Documents\GitHub\Schedule\docs\index.html" -Force

# 2. GitHub 저장소로 이동 및 Git 추가/커밋/푸시
cd C:\Users\ADMIN\Documents\GitHub\Schedule
$gitPath = (Get-ChildItem "$env:LOCALAPPDATA\GitHubDesktop\app-*\resources\app\git\cmd\git.exe" | Select-Object -First 1).FullName
& $gitPath add docs/css/style.css docs/js/calendar.js docs/js/app.js docs/index.html
& $gitPath commit -m "Update: 파일 업데이트"
& $gitPath push origin main
```

---

## 📌 주의사항

### 1. CSS 캐시 버스팅
CSS 파일 수정 시 `index.html`에서 버전 번호를 올려주세요:

```html
<!-- 기존 -->
<link rel="stylesheet" href="css/style.css?v=42">

<!-- 변경 -->
<link rel="stylesheet" href="css/style.css?v=43">
```

이렇게 하면 브라우저가 새 CSS를 강제로 로드합니다.

### 2. 파일 경로 확인
복사하기 전에 파일이 존재하는지 확인:

```powershell
# 파일 존재 확인
Test-Path "C:\Users\ADMIN\.cursor\schedule_webapp\frontend\css\style.css"
# True가 나오면 파일 존재
```

### 3. Git 상태 확인
커밋 전 변경사항 확인:

```powershell
& $gitPath status
```

### 4. 커밋 히스토리 확인
최근 커밋 내역 보기:

```powershell
& $gitPath log --oneline -5
```

---

## 🔧 문제 해결

### 문제: Git 명령어가 작동하지 않음
**해결**: GitHub Desktop의 Git 경로 다시 찾기
```powershell
$gitPath = (Get-ChildItem "$env:LOCALAPPDATA\GitHubDesktop\app-*\resources\app\git\cmd\git.exe" | Select-Object -First 1).FullName
echo $gitPath
```

### 문제: 파일 복사가 안됨
**해결**: 경로 확인
```powershell
# 원본 파일 확인
Test-Path "C:\Users\ADMIN\.cursor\schedule_webapp\frontend\css\style.css"

# 대상 폴더 확인
Test-Path "C:\Users\ADMIN\Documents\GitHub\Schedule\docs\css"
```

### 문제: Push가 거부됨
**해결**: 먼저 Pull 받기
```powershell
& $gitPath pull origin main
& $gitPath push origin main
```

---

## 📚 자주 사용하는 명령어 모음

### 특정 파일만 업로드
```powershell
# CSS만 업데이트
cd C:\Users\ADMIN\.cursor\schedule_webapp
Copy-Item "frontend\css\style.css" -Destination "C:\Users\ADMIN\Documents\GitHub\Schedule\docs\css\style.css" -Force
cd C:\Users\ADMIN\Documents\GitHub\Schedule
$gitPath = (Get-ChildItem "$env:LOCALAPPDATA\GitHubDesktop\app-*\resources\app\git\cmd\git.exe" | Select-Object -First 1).FullName
& $gitPath add docs/css/style.css
& $gitPath commit -m "Style: CSS 업데이트"
& $gitPath push origin main
```

### 여러 파일 한 번에 업로드
```powershell
cd C:\Users\ADMIN\.cursor\schedule_webapp
Copy-Item "frontend\css\style.css" -Destination "C:\Users\ADMIN\Documents\GitHub\Schedule\docs\css\style.css" -Force
Copy-Item "frontend\js\calendar.js" -Destination "C:\Users\ADMIN\Documents\GitHub\Schedule\docs\js\calendar.js" -Force
Copy-Item "frontend\index.html" -Destination "C:\Users\ADMIN\Documents\GitHub\Schedule\docs\index.html" -Force

cd C:\Users\ADMIN\Documents\GitHub\Schedule
$gitPath = (Get-ChildItem "$env:LOCALAPPDATA\GitHubDesktop\app-*\resources\app\git\cmd\git.exe" | Select-Object -First 1).FullName
& $gitPath add docs/css/style.css docs/js/calendar.js docs/index.html
& $gitPath commit -m "Update: 멀티 파일 업데이트"
& $gitPath push origin main
```

### 변경사항 확인 후 업로드
```powershell
cd C:\Users\ADMIN\Documents\GitHub\Schedule
$gitPath = (Get-ChildItem "$env:LOCALAPPDATA\GitHubDesktop\app-*\resources\app\git\cmd\git.exe" | Select-Object -First 1).FullName

# 변경된 파일 목록 확인
& $gitPath status

# 변경 내용 상세 확인
& $gitPath diff

# 확인 후 커밋
& $gitPath add .
& $gitPath commit -m "커밋 메시지"
& $gitPath push origin main
```

---

## 📖 추가 참고사항

### GitHub Pages 배포
- 저장소의 `docs` 폴더가 자동으로 GitHub Pages로 배포됩니다.
- URL: `https://[username].github.io/Schedule/`
- 배포 후 반영까지 1-2분 소요

### 브라우저 캐시 새로고침
업로드 후 변경사항이 안 보이면:
- **Windows**: `Ctrl + Shift + R` 또는 `Ctrl + F5`
- **Mac**: `Cmd + Shift + R`

---

## ✅ 체크리스트

파일 업로드 전 확인사항:
- [ ] 로컬에서 코드 테스트 완료
- [ ] CSS 버전 번호 업데이트 (필요시)
- [ ] 커밋 메시지 작성
- [ ] 변경된 파일 모두 복사
- [ ] Git add 완료
- [ ] Git commit 완료
- [ ] Git push 완료
- [ ] GitHub Pages에서 확인

---

**작성일**: 2025년 10월 23일  
**마지막 수정**: 2025년 10월 23일
