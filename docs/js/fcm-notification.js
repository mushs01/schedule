/**
 * Firebase Cloud Messaging 알림 관리
 * 카카오톡 알림을 대체하는 FCM 푸시 알림
 */

const STORAGE_KEYS = {
    FCM_TOKEN: 'fcm_token',
    NOTIFICATION_ENABLED: 'fcm_notification_enabled',
    CURRENT_USER: 'current_user' // 'mom' or 'dad'
};

// VAPID 공개키 (Firebase Console에서 생성한 웹 푸시 인증서)
const VAPID_KEY = 'BFHk1qz9PJ6XbOWWenn-I6NsK_B-nwpQhNFiKjlQXEUv2yfgZgARXs4rSnWJB323xKT9P11D6sqDQnZ-EHn2fBk';

let messaging = null;
let currentFCMToken = null;

/**
 * FCM 초기화
 */
async function initFCM() {
    try {
        console.log('🔔 FCM 초기화 시작...');

        // Service Worker 지원 확인
        if (!('serviceWorker' in navigator)) {
            console.warn('⚠️ 이 브라우저는 Service Worker를 지원하지 않습니다.');
            return false;
        }

        // Notification API 지원 확인
        if (!('Notification' in window)) {
            console.warn('⚠️ 이 브라우저는 알림을 지원하지 않습니다.');
            return false;
        }

        // Firebase Messaging 인스턴스 생성
        messaging = firebase.messaging();

        // Service Worker 등록
        // GitHub Pages 서브디렉토리를 고려한 경로
        const basePath = location.pathname.split('/').slice(0, 2).join('/');
        const swPath = `${basePath}/firebase-messaging-sw.js`;
        console.log('📝 Service Worker 경로:', swPath);
        const registration = await navigator.serviceWorker.register(swPath);
        console.log('✅ Service Worker 등록 완료:', registration);

        // 저장된 토큰 복구
        const savedToken = localStorage.getItem(STORAGE_KEYS.FCM_TOKEN);
        if (savedToken) {
            currentFCMToken = savedToken;
            console.log('✅ 저장된 FCM 토큰 복구:', currentFCMToken);
        }

        // 포그라운드 메시지 핸들러
        messaging.onMessage((payload) => {
            console.log('📬 포그라운드 메시지 수신:', payload);
            
            // 브라우저 알림 표시
            showBrowserNotification(
                payload.notification.title,
                payload.notification.body,
                payload.data
            );
        });

        // 토큰 갱신 핸들러
        messaging.onTokenRefresh(async () => {
            console.log('🔄 FCM 토큰 갱신...');
            try {
                const newToken = await messaging.getToken({ vapidKey: VAPID_KEY });
                await saveFCMToken(newToken);
            } catch (error) {
                console.error('❌ 토큰 갱신 실패:', error);
            }
        });

        // UI 업데이트
        updateNotificationUI();

        console.log('✅ FCM 초기화 완료');
        return true;

    } catch (error) {
        console.error('❌ FCM 초기화 실패:', error);
        return false;
    }
}

/**
 * 알림 권한 요청 및 토큰 발급
 */
async function requestNotificationPermission() {
    try {
        console.log('🔔 알림 권한 요청...');

        // 사용자 설정 확인
        if (!isUserSet()) {
            showToast('먼저 사용자(엄마/아빠)를 선택해주세요!', 'warning');
            // 사용자 설정 섹션으로 스크롤
            const userSection = document.getElementById('userSection');
            if (userSection) {
                userSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
            return false;
        }

        // 이미 권한이 있는 경우
        if (Notification.permission === 'granted') {
            await registerFCMToken();
            return true;
        }

        // 권한 거부된 경우
        if (Notification.permission === 'denied') {
            showToast('알림 권한이 차단되어 있습니다. 브라우저 설정에서 허용해주세요.', 'error');
            return false;
        }

        // 권한 요청
        const permission = await Notification.requestPermission();
        
        if (permission === 'granted') {
            console.log('✅ 알림 권한 허용됨');
            await registerFCMToken();
            showToast('알림이 활성화되었습니다! 🔔', 'success');
            return true;
        } else {
            console.log('⚠️ 알림 권한 거부됨');
            showToast('알림 권한이 필요합니다.', 'warning');
            return false;
        }

    } catch (error) {
        console.error('❌ 알림 권한 요청 실패:', error);
        showToast('알림 설정 중 오류가 발생했습니다.', 'error');
        return false;
    }
}

/**
 * FCM 토큰 등록
 */
async function registerFCMToken() {
    try {
        console.log('📝 FCM 토큰 등록 중...');

        if (!messaging) {
            console.error('❌ Messaging 인스턴스가 없습니다.');
            return null;
        }

        // 토큰 발급
        const token = await messaging.getToken({ vapidKey: VAPID_KEY });
        
        if (token) {
            console.log('✅ FCM 토큰 발급:', token);
            await saveFCMToken(token);
            return token;
        } else {
            console.warn('⚠️ FCM 토큰을 가져올 수 없습니다.');
            return null;
        }

    } catch (error) {
        console.error('❌ FCM 토큰 등록 실패:', error);
        throw error;
    }
}

/**
 * FCM 토큰 저장 (로컬 + Firestore)
 */
async function saveFCMToken(token) {
    try {
        // 로컬 스토리지 저장
        localStorage.setItem(STORAGE_KEYS.FCM_TOKEN, token);
        localStorage.setItem(STORAGE_KEYS.NOTIFICATION_ENABLED, 'true');
        currentFCMToken = token;

        // Firestore에 토큰 저장
        const db = window.db;
        const tokensRef = db.collection('fcm_tokens');
        
        const currentUser = getCurrentUser();
        const userName = getCurrentUserName();
        
        await tokensRef.doc(token).set({
            token: token,
            user: currentUser || null, // 'mom' or 'dad'
            user_name: userName || null, // '엄마' or '아빠'
            created_at: firebase.firestore.FieldValue.serverTimestamp(),
            updated_at: firebase.firestore.FieldValue.serverTimestamp(),
            user_agent: navigator.userAgent,
            enabled: true
        }, { merge: true });

        console.log('✅ FCM 토큰 저장 완료 (로컬 + Firestore)');
        
        // UI 업데이트
        updateNotificationUI();

    } catch (error) {
        console.error('❌ FCM 토큰 저장 실패:', error);
        throw error;
    }
}

/**
 * 알림 비활성화
 */
async function disableNotifications() {
    try {
        console.log('🔕 알림 비활성화...');

        if (currentFCMToken) {
            // Firestore에서 비활성화 표시
            const db = window.db;
            await db.collection('fcm_tokens').doc(currentFCMToken).update({
                enabled: false,
                updated_at: firebase.firestore.FieldValue.serverTimestamp()
            });
        }

        // 로컬 설정 업데이트
        localStorage.setItem(STORAGE_KEYS.NOTIFICATION_ENABLED, 'false');
        
        // UI 업데이트
        updateNotificationUI();

        showToast('알림이 비활성화되었습니다.', 'info');

    } catch (error) {
        console.error('❌ 알림 비활성화 실패:', error);
    }
}

/**
 * 브라우저 알림 표시
 */
function showBrowserNotification(title, body, data = {}) {
    if (Notification.permission !== 'granted') return;

    const options = {
        body: body,
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
        tag: data.scheduleId || 'schedule-notification',
        requireInteraction: true,
        vibrate: [200, 100, 200],
        data: data
    };

    const notification = new Notification(title, options);

    notification.onclick = () => {
        window.focus();
        notification.close();
    };
}

/**
 * 알림 설정 UI 업데이트
 */
function updateNotificationUI() {
    const isEnabled = localStorage.getItem(STORAGE_KEYS.NOTIFICATION_ENABLED) === 'true';
    const hasToken = !!currentFCMToken;
    const hasPermission = Notification.permission === 'granted';

    // 설정 화면 상태 업데이트
    const statusElement = document.getElementById('notificationStatus');
    const enableButton = document.getElementById('enableNotificationBtn');
    const disableButton = document.getElementById('disableNotificationBtn');

    if (statusElement) {
        if (hasPermission && hasToken && isEnabled) {
            statusElement.textContent = '✅ 알림 활성화됨';
            statusElement.className = 'status-enabled';
        } else if (hasPermission && hasToken && !isEnabled) {
            statusElement.textContent = '🔕 알림 비활성화됨';
            statusElement.className = 'status-disabled';
        } else {
            statusElement.textContent = '❌ 알림 권한 없음';
            statusElement.className = 'status-none';
        }
    }

    if (enableButton) {
        enableButton.style.display = (!hasPermission || !isEnabled) ? 'inline-block' : 'none';
    }

    if (disableButton) {
        disableButton.style.display = (hasPermission && isEnabled) ? 'inline-block' : 'none';
    }

    // 일정 모달의 알림 설정 섹션 업데이트
    if (window.app && window.app.updateNotificationUI) {
        window.app.updateNotificationUI(hasPermission && hasToken && isEnabled);
    }
}

/**
 * 알림 활성 상태 확인
 */
function isNotificationEnabled() {
    return Notification.permission === 'granted' && 
           localStorage.getItem(STORAGE_KEYS.NOTIFICATION_ENABLED) === 'true' &&
           !!currentFCMToken;
}

/**
 * 현재 FCM 토큰 가져오기
 */
function getFCMToken() {
    return currentFCMToken;
}

/**
 * 사용자 선택 (엄마/아빠)
 */
function selectUser(user) {
    if (user !== 'mom' && user !== 'dad') {
        console.error('❌ 잘못된 사용자:', user);
        return false;
    }
    
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, user);
    console.log('✅ 사용자 선택:', user === 'mom' ? '엄마' : '아빠');
    
    // FCM 토큰이 이미 있으면 업데이트
    if (currentFCMToken) {
        updateFCMTokenUser(currentFCMToken, user);
    }
    
    // UI 업데이트
    updateUserUI();
    updateNotificationUI();
    
    showToast(user === 'mom' ? '엄마로 설정되었습니다 👩' : '아빠로 설정되었습니다 👨', 'success');
    
    return true;
}

/**
 * 현재 사용자 가져오기
 */
function getCurrentUser() {
    return localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
}

/**
 * 현재 사용자 이름 가져오기
 */
function getCurrentUserName() {
    const user = getCurrentUser();
    if (user === 'mom') return '엄마';
    if (user === 'dad') return '아빠';
    return null;
}

/**
 * 사용자 설정 여부 확인
 */
function isUserSet() {
    const user = getCurrentUser();
    return user === 'mom' || user === 'dad';
}

/**
 * FCM 토큰의 사용자 정보 업데이트
 */
async function updateFCMTokenUser(token, user) {
    try {
        const db = window.db;
        await db.collection('fcm_tokens').doc(token).update({
            user: user,
            user_name: user === 'mom' ? '엄마' : '아빠',
            updated_at: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log('✅ FCM 토큰 사용자 정보 업데이트:', user);
    } catch (error) {
        console.error('❌ FCM 토큰 사용자 정보 업데이트 실패:', error);
    }
}

/**
 * 사용자 UI 업데이트
 */
function updateUserUI() {
    const currentUserDisplay = document.getElementById('currentUserDisplay');
    const currentUserName = document.getElementById('currentUserName');
    const userNotSetWarning = document.getElementById('userNotSetWarning');
    
    const user = getCurrentUser();
    const userName = getCurrentUserName();
    
    if (currentUserDisplay && currentUserName) {
        if (userName) {
            currentUserDisplay.style.display = 'block';
            currentUserName.textContent = userName;
        } else {
            currentUserDisplay.style.display = 'none';
        }
    }
    
    // 사용자 미설정 경고 표시
    if (userNotSetWarning) {
        if (!userName && Notification.permission !== 'granted') {
            userNotSetWarning.style.display = 'block';
        } else {
            userNotSetWarning.style.display = 'none';
        }
    }
}

// 페이지 로드 시 자동 초기화
document.addEventListener('DOMContentLoaded', () => {
    initFCM();
    updateUserUI();
});

// 전역 함수 노출
window.fcmNotification = {
    init: initFCM,
    requestPermission: requestNotificationPermission,
    disable: disableNotifications,
    isEnabled: isNotificationEnabled,
    getToken: getFCMToken,
    updateUI: updateNotificationUI,
    selectUser: selectUser,
    getCurrentUser: getCurrentUser,
    getCurrentUserName: getCurrentUserName,
    isUserSet: isUserSet
};

