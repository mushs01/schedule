/**
 * Strava Configuration (베타)
 * 
 * strava-config-example.js의 값을 이 파일에서 덮어씁니다.
 * 실제 Strava 설정 값을 입력하세요.
 * 
 * 설정 방법:
 * 1. https://www.strava.com/settings/api 접속
 * 2. Create & Manage Your App에서 앱 생성
 * 3. Application ID → clientId에 입력
 * 4. Client Secret → Firebase Functions 설정 (firebase functions:config:set strava.client_secret="XXX")
 * 5. Authorization Callback Domain에 redirectUri의 도메인 등록 (예: localhost)
 */

// 실제 Strava Client ID - 예시 값을 덮어씀 (|| 사용 시 예시 값이 유지되므로 명시적 할당)
window.STRAVA_CONFIG = window.STRAVA_CONFIG || {};
window.STRAVA_CONFIG.clientId = '200870';
window.STRAVA_CONFIG.redirectUri = window.location.origin + '/';
window.STRAVA_CONFIG.scope = 'read,activity:read_all';

/**
 * 앱 실행 시 자동 연동할 계정 (하드코딩). 1번 = 아빠, 2번 = 엄마.
 * 토큰: 앱에서 한 번 연동 후 콘솔에서 localStorage.getItem('strava_accounts') 로 확인 가능.
 * preloadedAccounts: [ { accessToken, refreshToken, expiresAt, athlete: { id, firstname, lastname } }, ... ]
 */
window.STRAVA_CONFIG.preloadedAccounts = window.STRAVA_CONFIG.preloadedAccounts || [];
