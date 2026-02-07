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

// Strava OAuth redirect_uri - GitHub Pages는 소문자 /schedule/ 사용 (대소문자 통일)
function _getStravaRedirectUri() {
    if (typeof window === 'undefined') return 'http://localhost:8000/';
    const origin = window.location.origin;
    // GitHub Pages (mushs01.github.io): 소문자 /schedule/ 로 고정 (핸드폰 404 방지)
    if (origin === 'https://mushs01.github.io') return 'https://mushs01.github.io/schedule/';
    // 로컬
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) return origin + '/';
    // 기타: 현재 경로 사용
    let url = origin + window.location.pathname;
    url = url.split('?')[0].split('#')[0];
    if (url.match(/\.[a-z]+$/i)) url = url.substring(0, url.lastIndexOf('/') + 1);
    else if (!url.endsWith('/')) url = url + '/';
    return url.toLowerCase();
}
// Strava 앱 Client ID (필수) - Strava 개발자 페이지에서 발급받은 Application ID
window.STRAVA_CONFIG = {
    clientId: '200870',
    redirectUri: _getStravaRedirectUri(),
    scope: 'read,activity:read_all'
};
