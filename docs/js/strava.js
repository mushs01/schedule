/**
 * Strava API Integration Module (다중 계정 지원)
 * 베타테스트 - Strava 운동 기록 연동
 */

(function() {
    'use strict';

    const fallbackModule = {
        connect: function() { console.warn('Strava: 모듈 로드 실패'); },
        disconnect: function() {},
        disconnectAccount: function() {},
        fetchActivities: async function() { throw new Error('Strava 모듈을 불러올 수 없습니다.'); },
        getActivityDetail: async function() { throw new Error('Strava 모듈을 불러올 수 없습니다.'); },
        getActivityStreams: async function() { throw new Error('Strava 모듈을 불러올 수 없습니다.'); },
        handleOAuthCallback: async function() { return false; },
        isConnected: function() { return false; },
        getAthlete: function() { return null; },
        getAthletes: function() { return []; },
        getStoredAccounts: function() { return []; },
        ensureConnectionAtStartup: async function() {},
        onDisconnect: null
    };

    try {

    const STORAGE_KEY_ACCOUNTS = 'strava_accounts';
    const LEGACY_KEYS = { accessToken: 'strava_access_token', refreshToken: 'strava_refresh_token', expiresAt: 'strava_expires_at', athlete: 'strava_athlete' };

    function getStravaAuthUrl() {
        const config = window.STRAVA_CONFIG;
        if (!config || !config.clientId || config.clientId === 'YOUR_STRAVA_CLIENT_ID') {
            console.error('Strava config not found.');
            return null;
        }
        const redirectUri = (config.redirectUri || (window.location.origin + '/')).replace(/\/?$/, '/');
        const scope = config.scope || 'read,activity:read_all';
        return `https://www.strava.com/oauth/authorize?client_id=${config.clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&approval_prompt=force`;
    }

    function getCodeFromUrl() {
        return new URLSearchParams(window.location.search).get('code');
    }

    function clearCodeFromUrl() {
        const url = new URL(window.location.href);
        url.searchParams.delete('code');
        url.searchParams.delete('scope');
        url.searchParams.delete('state');
        window.history.replaceState({}, document.title, url.pathname + url.search || '?');
    }

    /** 기존 단일 계정 저장소 → 다중 계정으로 마이그레이션 */
    function migrateLegacyStorage() {
        const token = localStorage.getItem(LEGACY_KEYS.accessToken);
        if (!token) return;
        const athleteJson = localStorage.getItem(LEGACY_KEYS.athlete);
        let athlete = null;
        try { athlete = athleteJson ? JSON.parse(athleteJson) : null; } catch (_) {}
        const refreshToken = localStorage.getItem(LEGACY_KEYS.refreshToken);
        const expiresAt = parseInt(localStorage.getItem(LEGACY_KEYS.expiresAt) || '0', 10);
        const athleteId = (athlete && athlete.id) || 'legacy';
        const accounts = [{ athleteId, athlete, accessToken: token, refreshToken, expiresAt }];
        localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(accounts));
        localStorage.removeItem(LEGACY_KEYS.accessToken);
        localStorage.removeItem(LEGACY_KEYS.refreshToken);
        localStorage.removeItem(LEGACY_KEYS.expiresAt);
        localStorage.removeItem(LEGACY_KEYS.athlete);
    }

    function getStoredAccounts() {
        applyPreloadedAccounts();
        const raw = localStorage.getItem(STORAGE_KEY_ACCOUNTS);
        if (!raw) {
            migrateLegacyStorage();
            const r = localStorage.getItem(STORAGE_KEY_ACCOUNTS);
            if (!r) return [];
            try { return JSON.parse(r); } catch (_) { return []; }
        }
        try { return JSON.parse(raw); } catch (_) { return []; }
    }

    function saveAccounts(accounts) {
        localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(accounts));
    }

    function addOrUpdateAccount(accessToken, refreshToken, expiresAt, athlete) {
        const athleteId = String((athlete && athlete.id) || Date.now());
        const accounts = getStoredAccounts();
        const idx = accounts.findIndex(a => String(a.athleteId) === athleteId);
        const entry = { athleteId, athlete, accessToken, refreshToken, expiresAt };
        if (idx >= 0) accounts[idx] = entry;
        else accounts.push(entry);
        saveAccounts(accounts);
    }

    function removeAccount(athleteId) {
        const accounts = getStoredAccounts().filter(a => String(a.athleteId) !== String(athleteId));
        saveAccounts(accounts);
    }

    /** 갱신 실패 시 계정 삭제 대신 만료로 표시 (재인증 유도) */
    function markAccountExpired(athleteId) {
        const accounts = getStoredAccounts();
        const idx = accounts.findIndex(a => String(a.athleteId) === String(athleteId));
        if (idx >= 0) {
            accounts[idx] = { ...accounts[idx], expired: true };
            saveAccounts(accounts);
        }
    }

    function clearAllTokens() {
        localStorage.removeItem(STORAGE_KEY_ACCOUNTS);
        localStorage.removeItem(LEGACY_KEYS.accessToken);
        localStorage.removeItem(LEGACY_KEYS.refreshToken);
        localStorage.removeItem(LEGACY_KEYS.expiresAt);
        localStorage.removeItem(LEGACY_KEYS.athlete);
    }

    async function exchangeCodeForToken(code) {
        if (typeof firebase === 'undefined' || typeof firebase.functions !== 'function') {
            throw new Error('Firebase Functions를 불러올 수 없습니다.');
        }
        const result = await firebase.functions().httpsCallable('exchangeStravaToken')({ code });
        const data = result.data;
        if (!data) throw new Error('토큰 교환 실패');
        if (data.success === false) throw new Error(data.error || '토큰 교환 실패');
        if (!data.access_token) throw new Error(data.error || '토큰 교환 실패');
        addOrUpdateAccount(
            data.access_token,
            data.refresh_token,
            data.expires_at,
            data.athlete || null
        );
        return data;
    }

    function connectStrava() {
        const url = getStravaAuthUrl();
        if (!url) {
            if (window.showToast) window.showToast('Strava 설정을 확인해주세요.', 'error');
            return;
        }
        window.location.href = url;
    }

    /** 두 번째 계정 추가: Strava 로그아웃 후 OAuth로 이동 (로그인 화면이 나오도록) */
    function connectForAddAccount() {
        const url = getStravaAuthUrl();
        if (!url) {
            if (window.showToast) window.showToast('Strava 설정을 확인해주세요.', 'error');
            return;
        }
        window.open('https://www.strava.com/logout', '_blank', 'noopener');
        if (window.showToast) window.showToast('Strava 로그아웃 페이지가 열렸습니다. 잠시 후 로그인 화면으로 이동합니다.', 'info');
        setTimeout(function() {
            window.location.href = url;
        }, 1500);
    }

    function disconnectStrava() {
        clearAllTokens();
        if (window.showToast) window.showToast('Strava 연동이 모두 해제되었습니다.', 'info');
        if (window.stravaModule && window.stravaModule.onDisconnect) {
            window.stravaModule.onDisconnect();
        }
    }

    function disconnectAccount(athleteId) {
        removeAccount(athleteId);
        if (window.showToast) window.showToast('해당 Strava 계정 연동이 해제되었습니다.', 'info');
        if (window.stravaModule && window.stravaModule.onDisconnect) {
            window.stravaModule.onDisconnect();
        }
    }

    function isTokenExpired(expiresAt) {
        if (!expiresAt) return true;
        const now = Math.floor(Date.now() / 1000);
        /* 토큰 만료 2시간 전부터 갱신 (Strava access_token 6시간 유효) */
        return expiresAt - 7200 <= now;
    }

    async function refreshAccessTokenForAccount(account) {
        if (!account.refreshToken) throw new Error('Refresh token이 없습니다.');
        const functions = firebase.functions();
        const result = await functions.httpsCallable('refreshStravaToken')({ refresh_token: account.refreshToken });
        const data = result.data;
        if (!data || !data.access_token) throw new Error(data?.message || '토큰 갱신 실패');
        addOrUpdateAccount(data.access_token, data.refresh_token, data.expires_at, account.athlete || null);
        return data;
    }

    /** 재시도 횟수 및 지연(ms) */
    const REFRESH_RETRY_COUNT = 4;
    const REFRESH_RETRY_DELAYS = [1500, 3000, 6000];

    async function ensureValidTokenForAccount(account) {
        if (account.expired) throw new Error('연동이 만료되었습니다. 연동 해제 후 다시 연결해주세요.');
        if (!isTokenExpired(account.expiresAt)) return;
        let lastErr;
        for (let i = 0; i < REFRESH_RETRY_COUNT; i++) {
            try {
                await refreshAccessTokenForAccount(account);
                return;
            } catch (e) {
                lastErr = e;
                if (i < REFRESH_RETRY_COUNT - 1) {
                    const delay = REFRESH_RETRY_DELAYS[i] || 6000;
                    await new Promise(r => setTimeout(r, delay));
                }
            }
        }
        markAccountExpired(account.athleteId);
        throw new Error('연동이 만료되었습니다. 연동 해제 후 다시 연결해주세요.');
    }

    /** Strava API 직접 호출 (CORS에선 실패할 수 있음) → 실패 시 Firebase 프록시 사용 */
    async function fetchActivitiesFromStrava(accessToken, perPage, page) {
        if (typeof firebase === 'undefined' || typeof firebase.functions !== 'function') {
            throw new Error('Firebase Functions를 불러올 수 없습니다.');
        }
        try {
            const result = await firebase.functions().httpsCallable('fetchStravaActivities')({
                access_token: accessToken,
                per_page: perPage,
                page: page
            });
            return (result.data && result.data.activities) || [];
        } catch (e) {
            window._stravaLastFetchError = e.message || String(e);
            throw e;
        }
    }

    /** 모든 연동 계정에서 활동 가져와 병합 (Firebase 프록시 경유로 CORS 우회) */
    async function fetchActivities(perPage = 30, page = 1) {
        const accounts = getStoredAccounts();
        if (accounts.length === 0) {
            throw new Error('Strava에 연결된 계정이 없습니다.');
        }

        const allActivities = [];
        let lastFetchErr = null;
        for (const acc of accounts) {
            if (acc.expired) continue;
            try {
                await ensureValidTokenForAccount(acc);
                const accountsLatest = getStoredAccounts();
                const current = accountsLatest.find(a => String(a.athleteId) === String(acc.athleteId));
                const token = current ? current.accessToken : acc.accessToken;
                const list = await fetchActivitiesFromStrava(token, perPage, page);
                const withAthlete = (list || []).map(a => ({ ...a, _athlete: acc.athlete }));
                allActivities.push(...withAthlete);
                window._stravaLastFetchError = null;
            } catch (err) {
                lastFetchErr = err;
                const msg = err.message || String(err);
                if (msg.includes('401') || msg.includes('Unauthorized') || msg.includes('invalid') || msg.includes('Token')) {
                    markAccountExpired(acc.athleteId);
                }
                console.warn('Strava fetch for account failed:', acc.athleteId, err);
                window._stravaLastFetchError = msg;
            }
        }

        allActivities.sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
        return allActivities;
    }

    async function handleOAuthCallback() {
        const code = getCodeFromUrl();
        if (!code) return false;
        clearCodeFromUrl();
        try {
            await exchangeCodeForToken(code);
            window._stravaLastError = null;
            if (window.showToast) window.showToast('Strava 연동이 완료되었습니다!', 'success');
            return true;
        } catch (error) {
            console.error('Strava token exchange error:', error);
            var msg = (error && error.message) || '알 수 없는 오류';
            if (error && error.details) {
                var d = error.details;
                msg = (typeof d === 'string' ? d : (d.message || (d.error && d.error.message) || JSON.stringify(d)));
            }
            if ((msg === 'INTERNAL' || msg === 'internal') && error && error.code) msg = '연결 거부 (code: ' + error.code + ') - 네트워크 또는 Firebase 설정 확인';
            else if (msg === 'INTERNAL' || msg === 'internal') msg = '서버 오류 - Strava 앱 설정·콜백 도메인·코드 만료 확인';
            window._stravaLastError = msg;
            if (window.showToast) window.showToast('Strava 연동에 실패했습니다: ' + window._stravaLastError, 'error');
            return false;
        }
    }

    function isConnected() {
        return getStoredAccounts().length > 0;
    }

    function getAthlete() {
        const accounts = getStoredAccounts();
        return accounts.length ? accounts[0].athlete : null;
    }

    function getAthletes() {
        return getStoredAccounts().map(a => a.athlete).filter(Boolean);
    }

    /** 하위 호환: 단일 계정 시 토큰 객체 반환 */
    function getStoredTokens() {
        const accounts = getStoredAccounts();
        const first = accounts[0];
        if (!first) return { accessToken: null, refreshToken: null, expiresAt: 0, athlete: null };
        return {
            accessToken: first.accessToken,
            refreshToken: first.refreshToken,
            expiresAt: first.expiresAt,
            athlete: first.athlete
        };
    }

    async function ensureConnectionAtStartup() {
        applyPreloadedAccounts();
        const accounts = getStoredAccounts();
        for (const acc of accounts) {
            if (acc.expired || !acc.refreshToken) continue;
            if (!isTokenExpired(acc.expiresAt)) continue;
            let refreshed = false;
            for (let i = 0; i < REFRESH_RETRY_COUNT; i++) {
                try {
                    await refreshAccessTokenForAccount(acc);
                    refreshed = true;
                    break;
                } catch (e) {
                    if (i < REFRESH_RETRY_COUNT - 1) {
                        const delay = REFRESH_RETRY_DELAYS[i] || 6000;
                        await new Promise(r => setTimeout(r, delay));
                    } else {
                        markAccountExpired(acc.athleteId);
                        console.warn('Strava 토큰 갱신 실패 (연동 만료 표시):', acc.athleteId, e);
                    }
                }
            }
        }
    }

    /** 앱 포커스/탭 복귀 시 토큰 사전 갱신 - 연결 유지 */
    function setupBackgroundRefresh() {
        if (typeof document.hidden === 'undefined') return;
        var lastRun = 0;
        var MIN_INTERVAL_MS = 10 * 60 * 1000; /* 10분 이상 간격 */
        function run() {
            var now = Date.now();
            if (now - lastRun < MIN_INTERVAL_MS) return;
            lastRun = now;
            if (window.stravaModule && window.stravaModule.ensureConnectionAtStartup) {
                window.stravaModule.ensureConnectionAtStartup().catch(function() {});
            }
        }
        document.addEventListener('visibilitychange', function() {
            if (document.visibilityState === 'visible') run();
        });
        setInterval(run, 30 * 60 * 1000); /* 30분마다 실행 */
    }

    /** 활동 상세 조회 (splits_metric 등) */
    async function getActivityDetail(activityId, athleteId) {
        const accounts = getStoredAccounts();
        let acc = accounts.find(a => athleteId && String(a.athleteId || (a.athlete && a.athlete.id) || '') === String(athleteId));
        if (!acc && accounts.length > 0) acc = accounts[0];
        if (!acc) throw new Error('해당 운동의 계정을 찾을 수 없습니다.');
        await ensureValidTokenForAccount(acc);
        const current = getStoredAccounts().find(a => String(a.athleteId) === String(acc.athleteId));
        const token = (current || acc).accessToken;
        const url = `https://www.strava.com/api/v3/activities/${activityId}`;
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
        });
        if (!response.ok) throw new Error('활동 상세 조회 실패');
        return response.json();
    }

    /** 활동 스트림 (거리/고도/속도 시계열) */
    async function getActivityStreams(activityId, athleteId, keys = ['distance', 'altitude', 'velocity_smooth']) {
        const accounts = getStoredAccounts();
        let acc = accounts.find(a => athleteId && String(a.athleteId || (a.athlete && a.athlete.id) || '') === String(athleteId));
        if (!acc && accounts.length > 0) acc = accounts[0];
        if (!acc) throw new Error('해당 운동의 계정을 찾을 수 없습니다.');
        await ensureValidTokenForAccount(acc);
        const current = getStoredAccounts().find(a => String(a.athleteId) === String(acc.athleteId));
        const token = (current || acc).accessToken;
        const url = `https://www.strava.com/api/v3/activities/${activityId}/streams?keys=${keys.join(',')}&key_by_type=true`;
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
        });
        if (!response.ok) throw new Error('스트림 조회 실패');
        return response.json();
    }

    /** 소스에 하드코딩된 연동 정보(STRAVA_CONFIG.preloadedAccounts)를 저장소에 반영해 앱 실행 시 자동 연동 */
    function applyPreloadedAccounts() {
        if (window._stravaPreloadedApplied) return;
        const config = window.STRAVA_CONFIG;
        if (!config || !config.preloadedAccounts || !Array.isArray(config.preloadedAccounts)) return;
        for (const acc of config.preloadedAccounts) {
            if (!acc.accessToken || !acc.athlete || acc.athlete.id == null) continue;
            addOrUpdateAccount(
                acc.accessToken,
                acc.refreshToken || '',
                acc.expiresAt != null ? acc.expiresAt : 0,
                acc.athlete
            );
        }
        window._stravaPreloadedApplied = true;
    }

    window.stravaModule = {
        connect: connectStrava,
        connectForAddAccount,
        disconnect: disconnectStrava,
        disconnectAccount,
        fetchActivities,
        getActivityDetail,
        getActivityStreams,
        handleOAuthCallback,
        isConnected,
        getAthlete,
        getAthletes,
        getStoredTokens,
        getStoredAccounts,
        ensureConnectionAtStartup,
        onDisconnect: null
    };

    setupBackgroundRefresh();

    } catch (e) {
        console.warn('Strava 모듈 로드 실패:', e);
        window.stravaModule = fallbackModule;
    }
})();
