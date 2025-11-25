# 📱 앱 아이콘 설정 가이드

## 🎨 아이콘 이미지 준비

### 1. 아이콘 디자인
원하는 캘린더 아이콘을 준비하세요. (512x512 이상 권장)

### 2. 온라인 도구로 자동 생성 (추천)

**방법 1: PWA Asset Generator**
1. https://www.pwabuilder.com/imageGenerator 접속
2. 원본 이미지 업로드 (512x512 이상)
3. "Generate" 클릭
4. 다운로드된 ZIP 파일 압축 해제
5. `frontend/icons/` 폴더에 모든 아이콘 복사

**방법 2: RealFaviconGenerator**
1. https://realfavicongenerator.net/ 접속
2. 원본 이미지 업로드
3. "Generate your Favicons and HTML code" 클릭
4. iOS, Android 옵션 모두 선택
5. 다운로드된 아이콘들을 `frontend/icons/` 폴더에 복사

### 3. 수동 생성 (Photoshop, GIMP 등)

필요한 크기:
- 72x72
- 96x96
- 128x128
- 144x144
- 152x152
- 192x192
- 384x384
- 512x512

모든 파일을 `frontend/icons/` 폴더에 저장:
```
frontend/
  icons/
    icon-72x72.png
    icon-96x96.png
    icon-128x128.png
    icon-144x144.png
    icon-152x152.png
    icon-192x192.png
    icon-384x384.png
    icon-512x512.png
```

## 📱 홈 화면에 추가하는 방법

### iPhone (Safari)
1. Safari에서 웹앱 열기
2. 하단 공유 버튼 탭
3. "홈 화면에 추가" 선택
4. 이름 확인 후 "추가" 탭

### Android (Chrome)
1. Chrome에서 웹앱 열기
2. 우측 상단 메뉴 (⋮) 탭
3. "홈 화면에 추가" 또는 "앱 설치" 선택
4. "설치" 또는 "추가" 탭

## 🎨 임시 아이콘 사용

아이콘을 아직 준비하지 않았다면, 임시로 단색 아이콘을 생성할 수 있습니다:

1. Canva (무료): https://www.canva.com/
   - 512x512 크기로 새 디자인 생성
   - 캘린더 이모지 📅 추가
   - 배경색 설정 (#1a73e8 추천)
   - PNG로 다운로드

2. Figma (무료): https://www.figma.com/
   - 512x512 프레임 생성
   - 아이콘 디자인
   - Export as PNG

## ✅ 확인사항

아이콘 설정 후:
1. `frontend/icons/` 폴더에 모든 PNG 파일이 있는지 확인
2. GitHub에 푸시
3. 모바일 브라우저에서 "홈 화면에 추가" 시도
4. 홈 화면에 앱 아이콘이 표시되는지 확인

## 🔧 문제 해결

### 아이콘이 표시되지 않음
1. 파일 경로 확인: `docs/icons/icon-*.png`
2. 파일 이름 대소문자 확인
3. 브라우저 캐시 삭제 후 재시도
4. GitHub Pages 배포 완료 대기 (1-2분)

### iOS에서 아이콘이 깨짐
- 최소 152x152 크기 이상 사용
- 투명 배경 제거 (흰색 배경 권장)
- PNG 형식 확인

