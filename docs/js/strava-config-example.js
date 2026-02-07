/**
 * Strava Configuration Example
 * 
 * 베타테스트용 Strava 연동 설정
 * 
 * 이 파일을 복사하여 'strava-config.js'로 이름을 변경하고
 * Strava 개발자 설정에서 얻은 값을 입력하세요.
 * 
 * Strava 설정 값 얻는 방법:
 * 1. https://www.strava.com/settings/api 접속
 * 2. Strava 계정으로 로그인
 * 3. "Create & Manage Your App" 섹션에서 앱 생성
 * 4. Application ID → STRAVA_CLIENT_ID
 * 5. Client Secret → (Firebase Functions에 설정 - exchangeStravaToken 함수용)
 * 6. Authorization Callback Domain → 로컬: localhost, 배포: your-domain.com
 */

// Strava 앱 Client ID (필수)
// 이 파일을 strava-config.js로 복사하고 실제 값 입력
window.STRAVA_CONFIG = {
    // Strava 개발자 페이지에서 발급받은 Client ID
    clientId: 'YOUR_STRAVA_CLIENT_ID',
    
    // OAuth 콜백 URL - Strava 앱 설정에 등록한 URL과 정확히 일치해야 함
    // 예: http://localhost:8000/ 또는 https://your-app.vercel.app/
    redirectUri: (typeof window !== 'undefined') ? (window.location.origin + '/') : 'http://localhost:8000/',
    
    // API 요청 시 필요한 권한 범위
    scope: 'read,activity:read_all'
};
