# Strava 연동 설정 가이드 (베타)

Strava 앱에서 기록한 운동 데이터를 웹앱으로 가져오는 기능의 설정 방법입니다.

## 사전 준비

1. **Strava 계정**: [strava.com](https://www.strava.com)에서 계정 생성
2. **Strava 앱**: 핸드폰에 Strava 앱 설치 (운동 기록용)
3. **Firebase 프로젝트**: 이미 설정되어 있어야 함

## 1. Strava 앱 등록

1. [Strava API 설정](https://www.strava.com/settings/api) 접속
2. "Create & Manage Your App" 섹션에서 새 앱 생성
3. 다음 정보 입력:
   - **Application Name**: 예) 우리가족 일정관리
   - **Category**: 예) Fitness
   - **Website**: 웹앱 URL (예: https://your-app.vercel.app)
   - **Authorization Callback Domain**:
     - 로컬 테스트: `localhost`
     - 배포: `your-app.vercel.app` (도메인만, https 제외)

4. **Application ID**와 **Client Secret** 발급 확인

## 2. 프론트엔드 설정

`frontend/js/strava-config.js` 파일을 열고 `clientId`를 실제 Application ID로 변경:

```javascript
window.STRAVA_CONFIG.clientId = '12345';  // 실제 Application ID 입력
```

## 3. Firebase Functions 설정 (토큰 교환용)

Strava OAuth는 Client Secret이 필요하므로 서버(Firebase Functions)에서 처리합니다.

### 3-1. Functions 설정

```bash
cd functions
firebase functions:config:set strava.client_id="YOUR_APPLICATION_ID"
firebase functions:config:set strava.client_secret="YOUR_CLIENT_SECRET"
```

### 3-2. Functions 배포

```bash
firebase deploy --only functions
```

## 4. OAuth Redirect URI 확인

Strava 앱 설정의 **Authorization Callback Domain**과 실제 콜백 URL이 일치해야 합니다.

- 로컬: `http://localhost:8000/` 또는 `http://127.0.0.1:8000/`
- 배포: `https://your-domain.com/`

Strava 설정의 Callback Domain에는 `localhost` 또는 `your-domain.com` 만 입력합니다.

## 5. 사용 방법

1. 웹앱 실행
2. 사이드바에서 **베타테스트** 클릭
3. **Strava 연결** 버튼 클릭
4. Strava 로그인 및 권한 허용
5. **운동 기록 가져오기** 버튼으로 데이터 로드
6. 가져온 데이터가 모달에 표시됨

## 문제 해결

### "Strava config not found"
- `strava-config.js`에서 `clientId`가 실제 값으로 설정되었는지 확인

### "Strava config not set" (Firebase Function 오류)
- `firebase functions:config:set` 명령 실행 여부 확인
- Functions 재배포: `firebase deploy --only functions`

### "연동이 만료되었습니다"
- Strava 연결 해제 후 다시 연결

### "CORS 오류"
- HTTP 서버를 통해 실행 중인지 확인 (file:// 접근 불가)
