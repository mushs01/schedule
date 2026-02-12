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
        if (!data || !data.access_token) {
            throw new Error(data?.message || '토큰 교환 실패');
        }
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
        return expiresAt - 3600 <= now;
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

    async function ensureValidTokenForAccount(account) {
        if (!isTokenExpired(account.expiresAt)) return;
        try {
            await refreshAccessTokenForAccount(account);
        } catch (e) {
            removeAccount(account.athleteId);
            throw new Error('연동이 만료되었습니다. 다시 연결해주세요.');
        }
    }

    /** 모든 연동 계정에서 활동 가져와 병합 */
    async function fetchActivities(perPage = 30, page = 1) {
        const accounts = getStoredAccounts();
        if (accounts.length === 0) {
            throw new Error('Strava에 연결된 계정이 없습니다.');
        }

        const allActivities = [];
        for (const acc of accounts) {
            try {
                await ensureValidTokenForAccount(acc);
                const accountsLatest = getStoredAccounts();
                const current = accountsLatest.find(a => String(a.athleteId) === String(acc.athleteId));
                const token = current ? current.accessToken : acc.accessToken;
                const url = `https://www.strava.com/api/v3/athlete/activities?per_page=${perPage}&page=${page}`;
                const response = await fetch(url, {
                    headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
                });
                if (!response.ok) {
                    if (response.status === 401) removeAccount(acc.athleteId);
                    continue;
                }
                const list = await response.json();
                const withAthlete = (list || []).map(a => ({ ...a, _athlete: acc.athlete }));
                allActivities.push(...withAthlete);
            } catch (err) {
                console.warn('Strava fetch for account failed:', acc.athleteId, err);
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
            window._stravaLastError = error.message || '알 수 없는 오류';
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
            if (isTokenExpired(acc.expiresAt) && acc.refreshToken) {
                try {
                    await refreshAccessTokenForAccount(acc);
                } catch (e) {
                    console.warn('Strava 토큰 갱신 실패:', acc.athleteId, e);
                }
            }
        }
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
        disconnect: disconnectStrava,
        disconnectAccount,
        fetchActivities,
        handleOAuthCallback,
        isConnected,
        getAthlete,
        getAthletes,
        getStoredTokens,
        getStoredAccounts,
        ensureConnectionAtStartup,
        onDisconnect: null
    };

    } catch (e) {
        console.warn('Strava 모듈 로드 실패:', e);
        window.stravaModule = fallbackModule;
    }
})();
