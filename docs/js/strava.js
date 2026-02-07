/**
 * Strava API Integration Module
 * 베타테스트 - Strava 운동 기록 연동
 * 오류 시에도 앱 동작에 영향 없도록 최소 모듈 제공
 */

(function() {
    'use strict';

    // 오류 시 사용할 최소 모듈 (앱 정상 동작 보장)
    const fallbackModule = {
        connect: function() { console.warn('Strava: 모듈 로드 실패'); },
        disconnect: function() {},
        fetchActivities: async function() { throw new Error('Strava 모듈을 불러올 수 없습니다.'); },
        handleOAuthCallback: async function() { return false; },
        isConnected: function() { return false; },
        getAthlete: function() { return null; },
        getStoredTokens: function() { return {}; },
        onDisconnect: null
    };

    try {

    const STORAGE_KEYS = {
        accessToken: 'strava_access_token',
        refreshToken: 'strava_refresh_token',
        expiresAt: 'strava_expires_at',
        athlete: 'strava_athlete'
    };

    /**
     * Strava OAuth 인증 URL 생성
     */
    function getStravaAuthUrl() {
        const config = window.STRAVA_CONFIG;
        if (!config || !config.clientId || config.clientId === 'YOUR_STRAVA_CLIENT_ID') {
            console.error('Strava config not found. Copy strava-config-example.js to strava-config.js and set clientId.');
            return null;
        }
        const redirectUri = (config.redirectUri || (window.location.origin + '/')).replace(/\/?$/, '/');
        const scope = config.scope || 'read,activity:read_all';
        return `https://www.strava.com/oauth/authorize?client_id=${config.clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&approval_prompt=force`;
    }

    /**
     * URL에서 OAuth code 추출
     */
    function getCodeFromUrl() {
        const params = new URLSearchParams(window.location.search);
        return params.get('code');
    }

    /**
     * URL에서 code 파라미터 제거 (히스토리 정리)
     */
    function clearCodeFromUrl() {
        const url = new URL(window.location.href);
        url.searchParams.delete('code');
        url.searchParams.delete('scope');
        url.searchParams.delete('state');
        window.history.replaceState({}, document.title, url.pathname + url.search || '?');
    }

    /**
     * 저장된 토큰 가져오기
     */
    function getStoredTokens() {
        return {
            accessToken: localStorage.getItem(STORAGE_KEYS.accessToken),
            refreshToken: localStorage.getItem(STORAGE_KEYS.refreshToken),
            expiresAt: parseInt(localStorage.getItem(STORAGE_KEYS.expiresAt) || '0', 10),
            athlete: (() => {
                try {
                    const a = localStorage.getItem(STORAGE_KEYS.athlete);
                    return a ? JSON.parse(a) : null;
                } catch (_) { return null; }
            })()
        };
    }

    /**
     * 토큰 저장
     */
    function storeTokens(accessToken, refreshToken, expiresAt, athlete) {
        localStorage.setItem(STORAGE_KEYS.accessToken, accessToken);
        if (refreshToken) localStorage.setItem(STORAGE_KEYS.refreshToken, refreshToken);
        if (expiresAt) localStorage.setItem(STORAGE_KEYS.expiresAt, String(expiresAt));
        if (athlete) localStorage.setItem(STORAGE_KEYS.athlete, JSON.stringify(athlete));
    }

    /**
     * 토큰 삭제 (연동 해제)
     */
    function clearTokens() {
        localStorage.removeItem(STORAGE_KEYS.accessToken);
        localStorage.removeItem(STORAGE_KEYS.refreshToken);
        localStorage.removeItem(STORAGE_KEYS.expiresAt);
        localStorage.removeItem(STORAGE_KEYS.athlete);
    }

    /**
     * Strava OAuth code를 access_token으로 교환
     * Firebase Callable Function 사용
     */
    async function exchangeCodeForToken(code) {
        if (typeof firebase === 'undefined' || typeof firebase.functions !== 'function') {
            throw new Error('Firebase Functions를 불러올 수 없습니다.');
        }
        const functions = firebase.functions();
        const exchangeStravaToken = functions.httpsCallable('exchangeStravaToken');
        const result = await exchangeStravaToken({ code });
        const data = result.data;
        if (!data || !data.access_token) {
            throw new Error(data?.message || '토큰 교환 실패');
        }
        storeTokens(
            data.access_token,
            data.refresh_token,
            data.expires_at,
            data.athlete || null
        );
        return data;
    }

    /**
     * Strava 연결 (OAuth 리다이렉트)
     */
    function connectStrava() {
        const url = getStravaAuthUrl();
        if (!url) {
            if (window.showToast) window.showToast('Strava 설정을 확인해주세요. strava-config.js를 설정했는지 확인하세요.', 'error');
            return;
        }
        window.location.href = url;
    }

    /**
     * Strava 연동 해제
     */
    function disconnectStrava() {
        clearTokens();
        if (window.showToast) window.showToast('Strava 연동이 해제되었습니다.', 'info');
        if (window.stravaModule && window.stravaModule.onDisconnect) {
            window.stravaModule.onDisconnect();
        }
    }

    /**
     * Strava API - 운동 기록 목록 가져오기
     */
    async function fetchActivities(perPage = 30, page = 1) {
        const { accessToken } = getStoredTokens();
        if (!accessToken) {
            throw new Error('Strava에 연결되어 있지 않습니다.');
        }
        const url = `https://www.strava.com/api/v3/athlete/activities?per_page=${perPage}&page=${page}`;
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/json'
            }
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            if (response.status === 401) {
                clearTokens();
                throw new Error('연동이 만료되었습니다. 다시 연결해주세요.');
            }
            throw new Error(err.message || `API 오류: ${response.status}`);
        }
        return response.json();
    }

    /**
     * OAuth 콜백 처리 (페이지 로드 시 code가 있으면 토큰 교환)
     */
    async function handleOAuthCallback() {
        const code = getCodeFromUrl();
        if (!code) return false;
        clearCodeFromUrl();
        try {
            await exchangeCodeForToken(code);
            if (window.showToast) window.showToast('Strava 연동이 완료되었습니다!', 'success');
            return true;
        } catch (error) {
            console.error('Strava token exchange error:', error);
            if (window.showToast) window.showToast('Strava 연동에 실패했습니다: ' + (error.message || '알 수 없는 오류'), 'error');
            return false;
        }
    }

    /**
     * 연동 여부 확인
     */
    function isConnected() {
        const { accessToken } = getStoredTokens();
        return !!accessToken;
    }

    /**
     * 운동원 정보 가져오기
     */
    function getAthlete() {
        return getStoredTokens().athlete;
    }

    // Export
    window.stravaModule = {
        connect: connectStrava,
        disconnect: disconnectStrava,
        fetchActivities,
        handleOAuthCallback,
        isConnected,
        getAthlete,
        getStoredTokens,
        onDisconnect: null
    };

    } catch (e) {
        console.warn('Strava 모듈 로드 실패 (베타 기능 비활성화):', e);
        window.stravaModule = fallbackModule;
    }
})();
