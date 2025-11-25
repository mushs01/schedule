/**
 * Kakao Notification Module
 * Handles Kakao login and notification sending
 */

// Kakao App Key
const KAKAO_APP_KEY = '870fe727e74ee5a06ea42e2b0a018006';

// Settings storage keys
const STORAGE_KEYS = {
    KAKAO_LOGGED_IN: 'kakao_logged_in',
    KAKAO_ACCESS_TOKEN: 'kakao_access_token',
    KAKAO_REFRESH_TOKEN: 'kakao_refresh_token',
    KAKAO_TOKEN_EXPIRES_AT: 'kakao_token_expires_at',
    KAKAO_USER_ID: 'kakao_user_id',
    KAKAO_USER_NAME: 'kakao_user_name',
    ENABLE_NOTIFICATIONS: 'enable_notifications',
    NOTIFICATION_TIME: 'notification_time',
    NOTIFY_ONLY_TODAY: 'notify_only_today'
};

// Notification check interval (1 minute)
let notificationInterval = null;

/**
 * Initialize Kakao SDK
 */
function initKakao() {
    if (!Kakao.isInitialized()) {
        Kakao.init(KAKAO_APP_KEY);
        console.log('✅ Kakao SDK initialized');
    }
    
    // 페이지 로드 시 토큰 복원 시도
    restoreKakaoSession();
    
    loadSettings();
}

/**
 * Store Kakao tokens to localStorage for persistent login
 */
function storeKakaoTokens(authObj) {
    if (authObj.access_token) {
        localStorage.setItem(STORAGE_KEYS.KAKAO_ACCESS_TOKEN, authObj.access_token);
        console.log('✅ Access token 저장됨');
    }
    if (authObj.refresh_token) {
        localStorage.setItem(STORAGE_KEYS.KAKAO_REFRESH_TOKEN, authObj.refresh_token);
        console.log('✅ Refresh token 저장됨');
    }
    if (authObj.expires_in) {
        const expiresAt = Date.now() + (authObj.expires_in * 1000);
        localStorage.setItem(STORAGE_KEYS.KAKAO_TOKEN_EXPIRES_AT, expiresAt.toString());
        console.log(`✅ Token 만료 시간 저장됨: ${new Date(expiresAt).toLocaleString('ko-KR')}`);
    }
}

/**
 * Restore Kakao session from stored token
 */
function restoreKakaoSession() {
    // 먼저 SDK에서 토큰 가져오기 시도
    let accessToken = Kakao.Auth.getAccessToken();
    
    if (!accessToken) {
        // SDK에 없으면 localStorage에서 복원 시도
        accessToken = localStorage.getItem(STORAGE_KEYS.KAKAO_ACCESS_TOKEN);
        if (accessToken) {
            console.log('🔄 localStorage에서 토큰 복원 시도...');
            try {
                // SDK에 토큰 설정
                Kakao.Auth.setAccessToken(accessToken);
                console.log('✅ Kakao 액세스 토큰 복원됨 (localStorage)');
            } catch (error) {
                console.error('❌ 토큰 복원 실패:', error);
                // 실패하면 저장된 토큰 삭제
                clearStoredTokens();
            }
        } else {
            console.log('ℹ️ 저장된 Kakao 액세스 토큰 없음');
        }
    } else {
        console.log('✅ Kakao 액세스 토큰 복원됨 (SDK)');
        // SDK에 있는 토큰을 localStorage에도 백업
        const storedToken = localStorage.getItem(STORAGE_KEYS.KAKAO_ACCESS_TOKEN);
        if (storedToken !== accessToken) {
            localStorage.setItem(STORAGE_KEYS.KAKAO_ACCESS_TOKEN, accessToken);
            console.log('✅ 토큰을 localStorage에 백업');
        }
    }
}

/**
 * Clear stored tokens from localStorage
 */
function clearStoredTokens() {
    localStorage.removeItem(STORAGE_KEYS.KAKAO_ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.KAKAO_REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.KAKAO_TOKEN_EXPIRES_AT);
    localStorage.removeItem(STORAGE_KEYS.KAKAO_LOGGED_IN);
    localStorage.removeItem(STORAGE_KEYS.KAKAO_USER_ID);
    localStorage.removeItem(STORAGE_KEYS.KAKAO_USER_NAME);
    console.log('🗑️ 저장된 토큰 삭제됨');
}

/**
 * Get current Kakao user ID
 */
function getCurrentKakaoUserId() {
    return localStorage.getItem(STORAGE_KEYS.KAKAO_USER_ID);
}

/**
 * Get current Kakao user name
 */
function getCurrentKakaoUserName() {
    return localStorage.getItem(STORAGE_KEYS.KAKAO_USER_NAME) || '사용자';
}

/**
 * Get Kakao user info and store
 */
function getUserInfoAndStore() {
    return new Promise((resolve, reject) => {
        Kakao.API.request({
            url: '/v2/user/me',
            success: function(response) {
                console.log('✅ Kakao user info:', response);
                const userId = response.id.toString();
                
                // 사용자 ID 저장
                localStorage.setItem(STORAGE_KEYS.KAKAO_USER_ID, userId);
                console.log('✅ Kakao user ID 저장:', userId);
                
                // 사용자 이름 물어보기 (엄마 또는 아빠)
                const userName = prompt('사용자 이름을 입력하세요 (예: 엄마, 아빠):', '');
                if (userName && userName.trim()) {
                    localStorage.setItem(STORAGE_KEYS.KAKAO_USER_NAME, userName.trim());
                    console.log('✅ 사용자 이름 저장:', userName.trim());
                    showToast(`${userName.trim()} 님으로 로그인되었습니다!`, 'success');
                } else {
                    localStorage.setItem(STORAGE_KEYS.KAKAO_USER_NAME, '사용자');
                    showToast('로그인되었습니다!', 'success');
                }
                
                resolve(userId);
            },
            fail: function(error) {
                console.error('❌ Failed to get user info:', error);
                reject(error);
            }
        });
    });
}

/**
 * Kakao Login
 */
function kakaoLogin() {
    console.log('🔐 Attempting Kakao login...');
    Kakao.Auth.login({
        scope: 'talk_message',  // 나에게 보내기 권한 요청
        success: async function(authObj) {
            console.log('✅ Kakao login successful');
            console.log('Auth object:', authObj);
            
            // 토큰을 localStorage에 영구 저장
            storeKakaoTokens(authObj);
            localStorage.setItem(STORAGE_KEYS.KAKAO_LOGGED_IN, 'true');
            
            // 사용자 정보 가져오기
            try {
                await getUserInfoAndStore();
            } catch (error) {
                console.error('⚠️ Failed to get user info, but login succeeded');
            }
            
            updateLoginUI(true);
            startNotificationScheduler();
        },
        fail: function(err) {
            console.error('❌ Kakao login failed:', err);
            console.error('Error details:', JSON.stringify(err, null, 2));
            
            let errorMsg = '카카오톡 로그인 실패';
            if (err.error) {
                errorMsg += ` (${err.error})`;
            }
            if (err.error_description) {
                errorMsg += `: ${err.error_description}`;
            }
            
            showToast(errorMsg, 'error');
        }
    });
}

/**
 * Kakao Logout
 */
function kakaoLogout() {
    if (Kakao.Auth.getAccessToken()) {
        Kakao.Auth.logout(function() {
            console.log('✅ Kakao logout successful');
            clearStoredTokens();
            updateLoginUI(false);
            showToast('카카오톡 로그아웃 완료', 'success');
            stopNotificationScheduler();
        });
    } else {
        // 토큰이 없어도 로컬 상태 정리
        clearStoredTokens();
        updateLoginUI(false);
        stopNotificationScheduler();
    }
}

/**
 * Check and refresh Kakao access token
 */
function checkAndRefreshToken() {
    return new Promise((resolve) => {
        const accessToken = Kakao.Auth.getAccessToken();
        
        if (!accessToken) {
            console.log('❌ No access token');
            resolve(false);
            return;
        }

        // 토큰 정보 조회
        Kakao.API.request({
            url: '/v1/user/access_token_info',
            success: function(response) {
                console.log('✅ Token is valid:', response);
                
                // 토큰 만료 시간 확인 (초 단위)
                const expiresIn = response.expires_in;
                console.log(`⏰ 토큰 남은 시간: ${Math.floor(expiresIn / 60)}분`);
                
                // 만료 1시간 전이면 자동 갱신
                if (expiresIn < 3600) {
                    console.log('🔄 토큰 갱신 필요, 자동 갱신 시도...');
                    refreshAccessToken().then(refreshed => {
                        resolve(refreshed);
                    });
                } else {
                    resolve(true);
                }
            },
            fail: function(error) {
                console.log('❌ Token validation failed:', error);
                // 토큰이 만료되었을 수 있으니 갱신 시도
                console.log('🔄 토큰 갱신 시도...');
                refreshAccessToken().then(refreshed => {
                    resolve(refreshed);
                });
            }
        });
    });
}

/**
 * Refresh Kakao access token using refresh token
 */
function refreshAccessToken() {
    return new Promise((resolve) => {
        Kakao.Auth.refreshAccessToken()
            .then(function(res) {
                console.log('✅ 토큰 갱신 성공');
                const newAccessToken = Kakao.Auth.getAccessToken();
                console.log('새로운 액세스 토큰 발급됨');
                
                // 갱신된 토큰을 localStorage에 저장
                if (newAccessToken) {
                    localStorage.setItem(STORAGE_KEYS.KAKAO_ACCESS_TOKEN, newAccessToken);
                    console.log('✅ 갱신된 토큰 저장 완료');
                }
                
                // 새로운 만료 시간 계산 (대략 2시간)
                const newExpiresAt = Date.now() + (2 * 60 * 60 * 1000);
                localStorage.setItem(STORAGE_KEYS.KAKAO_TOKEN_EXPIRES_AT, newExpiresAt.toString());
                
                resolve(true);
            })
            .catch(function(err) {
                console.error('❌ 토큰 갱신 실패:', err);
                console.log('ℹ️ 다시 로그인이 필요합니다');
                
                // 토큰 갱신 실패 시 저장된 토큰 삭제
                clearStoredTokens();
                resolve(false);
            });
    });
}

/**
 * Send test message to Kakao
 */
async function sendTestKakaoMessage() {
    console.log('📤 Attempting to send test message...');
    console.log('🔑 Access Token:', Kakao.Auth.getAccessToken());
    
    if (!Kakao.Auth.getAccessToken()) {
        console.error('❌ No access token found');
        showToast('카카오톡 로그인이 필요합니다', 'error');
        return;
    }

    // 토큰 유효성 검사 및 갱신
    const isValid = await checkAndRefreshToken();
    if (!isValid) {
        showToast('카카오톡 로그인이 만료되었습니다. 다시 로그인해주세요.', 'error');
        kakaoLogout();
        return;
    }

    console.log('📨 Sending Kakao message...');
    Kakao.API.request({
        url: '/v2/api/talk/memo/default/send',
        data: {
            template_object: {
                object_type: 'text',
                text: '📅 가족 일정 관리 앱 테스트 메시지입니다!\n\n알림 설정이 정상적으로 작동하고 있습니다.',
                link: {
                    web_url: window.location.href,
                    mobile_web_url: window.location.href
                },
                button_title: '일정 보기'
            }
        },
        success: function(response) {
            console.log('✅ Test message sent successfully:', response);
            showToast('테스트 메시지를 전송했습니다!', 'success');
        },
        fail: function(error) {
            console.error('❌ Failed to send test message:', error);
            console.error('Error details:', JSON.stringify(error, null, 2));
            
            let errorMsg = '메시지 전송 실패';
            if (error.code) {
                errorMsg += ` (코드: ${error.code})`;
            }
            if (error.msg) {
                errorMsg += `: ${error.msg}`;
            }
            
            // 401 에러면 로그아웃 처리
            if (error.code === -401) {
                errorMsg = '카카오톡 로그인이 만료되었습니다. 다시 로그인해주세요.';
                kakaoLogout();
            }
            
            showToast(errorMsg, 'error');
        }
    });
}

/**
 * Send schedule notification to Kakao
 */
async function sendScheduleNotification(schedule, notificationType = 'start') {
    if (!Kakao.Auth.getAccessToken()) {
        return;
    }

    // 토큰 유효성 검사
    const isValid = await checkAndRefreshToken();
    if (!isValid) {
        console.log('⚠️ Token invalid, cannot send notification');
        return;
    }

    const personName = window.PERSON_NAMES[schedule.person] || schedule.person;
    const startDate = new Date(schedule.start);
    const endDate = schedule.end ? new Date(schedule.end) : null;
    
    let text = '';
    
    if (notificationType === 'start') {
        text = `📅 일정 시작 알림 (10분 전)\n\n`;
        text += `[${personName}] ${schedule.title}\n`;
        text += `시작: ${formatTime(startDate)}`;
        if (endDate) {
            text += `\n종료: ${formatTime(endDate)}`;
        }
    } else {
        text = `🔔 일정 종료 알림 (10분 전)\n\n`;
        text += `[${personName}] ${schedule.title}\n`;
        text += `종료: ${formatTime(endDate)}`;
    }
    
    if (schedule.description) {
        text += `\n내용: ${schedule.description}`;
    }

    Kakao.API.request({
        url: '/v2/api/talk/memo/default/send',
        data: {
            template_object: {
                object_type: 'text',
                text: text,
                link: {
                    web_url: window.location.href,
                    mobile_web_url: window.location.href
                },
                button_title: '일정 보기'
            }
        },
        success: function(response) {
            console.log('✅ Notification sent for:', schedule.title);
        },
        fail: function(error) {
            console.error('❌ Failed to send notification:', error);
            // 401 에러면 로그아웃
            if (error.code === -401) {
                kakaoLogout();
            }
        }
    });
}

/**
 * Check and send notifications
 */
async function checkAndSendNotifications() {
    const notificationTime = 10; // 고정: 10분 전
    
    if (!Kakao.Auth.getAccessToken()) {
        console.log('⚠️ No Kakao access token - skipping notification check');
        return;
    }

    console.log(`🔔 Checking notifications... Current time: ${new Date().toLocaleString('ko-KR')}`);
    
    try {
        // Get all schedules
        const schedules = await api.getSchedules({});
        const now = new Date();
        const notificationLeadTime = notificationTime * 60 * 1000; // Convert minutes to milliseconds
        
        console.log(`📋 Total schedules: ${schedules.length}`);
        
        // 현재 로그인한 사용자 ID 가져오기
        const currentUserId = getCurrentKakaoUserId();
        if (!currentUserId) {
            console.log('⚠️ No user ID found - cannot check notifications');
            return;
        }
        console.log(`👤 Checking notifications for user ID: ${currentUserId}`);
        
        // Filter schedules that need notification (사용자별)
        const schedulesToNotify = [];
        
        schedules.forEach(schedule => {
            const scheduleStart = new Date(schedule.start);
            const scheduleEnd = schedule.end ? new Date(schedule.end) : null;
            
            // 사용자별 알림 설정 확인
            const kakaoNotifications = schedule.kakao_notifications || {};
            const userNotification = kakaoNotifications[currentUserId];
            
            if (!userNotification) {
                // 이 사용자에 대한 알림 설정이 없음
                return;
            }
            
            // 시작 10분 전 알림 체크
            if (userNotification.start === true) {
                const timeDiffStart = scheduleStart - now;
                const minutesUntilStart = Math.floor(timeDiffStart / 60000);
                
                console.log(`  📅 ${schedule.title} - 시작까지 ${minutesUntilStart}분 (사용자 알림: ON)`);
                
                const isInStartWindow = 
                    timeDiffStart > (notificationLeadTime - 2 * 60 * 1000) && 
                    timeDiffStart <= (notificationLeadTime + 2 * 60 * 1000);
                
                if (isInStartWindow) {
                    console.log(`  ✅ 시작 알림 전송 대상: ${schedule.title}`);
                    schedulesToNotify.push({
                        ...schedule,
                        notificationType: 'start'
                    });
                }
            }
            
            // 종료 10분 전 알림 체크
            if (userNotification.end === true && scheduleEnd) {
                const timeDiffEnd = scheduleEnd - now;
                const minutesUntilEnd = Math.floor(timeDiffEnd / 60000);
                
                console.log(`  📅 ${schedule.title} - 종료까지 ${minutesUntilEnd}분 (사용자 알림: ON)`);
                
                const isInEndWindow = 
                    timeDiffEnd > (notificationLeadTime - 2 * 60 * 1000) && 
                    timeDiffEnd <= (notificationLeadTime + 2 * 60 * 1000);
                
                if (isInEndWindow) {
                    console.log(`  ✅ 종료 알림 전송 대상: ${schedule.title}`);
                    schedulesToNotify.push({
                        ...schedule,
                        notificationType: 'end'
                    });
                }
            }
        });
        
        console.log(`📬 Total notifications to send: ${schedulesToNotify.length}`);
        
        // Send notifications
        for (const schedule of schedulesToNotify) {
            // Check if already notified (use localStorage to track - 사용자별로 구분)
            const notifiedKey = `notified_${currentUserId}_${schedule.id}_${schedule.notificationType}_${notificationTime}`;
            
            if (!localStorage.getItem(notifiedKey)) {
                console.log(`📤 Sending ${schedule.notificationType} notification for: ${schedule.title} (user: ${currentUserId})`);
                await sendScheduleNotification(schedule, schedule.notificationType);
                localStorage.setItem(notifiedKey, 'true');
                localStorage.setItem(notifiedKey + '_timestamp', Date.now().toString());
                // Remove old notification flags (older than 1 day)
                cleanupOldNotificationFlags();
            } else {
                console.log(`⏭️ Already notified: ${schedule.title} (${schedule.notificationType})`);
            }
        }
        
    } catch (error) {
        console.error('❌ Error checking notifications:', error);
    }
}

/**
 * Cleanup old notification flags
 */
function cleanupOldNotificationFlags() {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    Object.keys(localStorage).forEach(key => {
        if (key.startsWith('notified_')) {
            const timestamp = parseInt(localStorage.getItem(key + '_timestamp'));
            if (timestamp && timestamp < oneDayAgo) {
                localStorage.removeItem(key);
                localStorage.removeItem(key + '_timestamp');
            }
        }
    });
}

/**
 * Start notification scheduler
 */
function startNotificationScheduler() {
    if (notificationInterval) {
        clearInterval(notificationInterval);
        console.log('⏹️ Stopped previous notification scheduler');
    }
    
    // Check every minute with error handling
    notificationInterval = setInterval(async () => {
        try {
            // 토큰 자동 갱신 체크 (10분마다)
            const now = Date.now();
            const lastCheck = parseInt(localStorage.getItem('last_token_check') || '0');
            if (now - lastCheck > 10 * 60 * 1000) { // 10분
                console.log('🔄 정기 토큰 체크...');
                const isValid = await checkAndRefreshToken();
                if (!isValid) {
                    console.log('⚠️ 토큰 갱신 실패, 알림 중지');
                    stopNotificationScheduler();
                    updateLoginUI(false);
                    localStorage.removeItem(STORAGE_KEYS.KAKAO_LOGGED_IN);
                    showToast('카카오톡 로그인이 만료되었습니다. 다시 로그인해주세요.', 'warning');
                    return;
                }
                localStorage.setItem('last_token_check', now.toString());
            }
            
            await checkAndSendNotifications();
        } catch (error) {
            console.error('❌ Error in notification scheduler:', error);
        }
    }, 60 * 1000);
    
    // Initial check
    console.log('🚀 Starting notification scheduler...');
    checkAndSendNotifications().catch(error => {
        console.error('❌ Error in initial notification check:', error);
    });
    
    console.log('✅ Notification scheduler started (토큰 자동 갱신 활성화)');
    console.log('⏰ Next check in 60 seconds');
}

/**
 * Stop notification scheduler
 */
function stopNotificationScheduler() {
    if (notificationInterval) {
        clearInterval(notificationInterval);
        notificationInterval = null;
        console.log('⏹️ Notification scheduler stopped');
    }
}

/**
 * Update login UI
 */
function updateLoginUI(isLoggedIn) {
    const loginSection = document.getElementById('kakaoLoginSection');
    const loggedInSection = document.getElementById('kakaoLoggedInSection');
    const notificationSettings = document.getElementById('notificationSettings');
    
    if (isLoggedIn) {
        if (loginSection) loginSection.style.display = 'none';
        if (loggedInSection) {
            loggedInSection.style.display = 'block';
            // 사용자 이름 표시 업데이트
            const userName = getCurrentKakaoUserName();
            const userNameDisplay = loggedInSection.querySelector('.user-name-display');
            if (userNameDisplay) {
                userNameDisplay.textContent = `${userName} 님으로 로그인됨`;
            } else {
                // 사용자 이름 표시 요소가 없으면 추가
                const description = loggedInSection.querySelector('.settings-description');
                if (description) {
                    const nameSpan = document.createElement('span');
                    nameSpan.className = 'user-name-display';
                    nameSpan.style.marginLeft = '8px';
                    nameSpan.style.fontWeight = 'bold';
                    nameSpan.textContent = `(${userName} 님)`;
                    description.appendChild(nameSpan);
                }
            }
        }
        if (notificationSettings) notificationSettings.style.display = 'block';
    } else {
        if (loginSection) loginSection.style.display = 'block';
        if (loggedInSection) loggedInSection.style.display = 'none';
        if (notificationSettings) notificationSettings.style.display = 'none';
    }
    
    // 일정 모달의 카카오 알림 UI도 업데이트
    if (window.updateKakaoNotificationUI) {
        window.updateKakaoNotificationUI();
    }
}

/**
 * Load settings from localStorage
 */
async function loadSettings() {
    const accessToken = Kakao.Auth.getAccessToken();
    
    // 액세스 토큰이 있으면 자동 로그인 상태 유지
    if (accessToken) {
        console.log('🔄 저장된 토큰으로 로그인 상태 확인 중...');
        
        // 토큰 만료 시간 체크
        const expiresAt = parseInt(localStorage.getItem(STORAGE_KEYS.KAKAO_TOKEN_EXPIRES_AT) || '0');
        const now = Date.now();
        const timeUntilExpiry = expiresAt - now;
        
        if (timeUntilExpiry > 0) {
            console.log(`⏰ 토큰 유효 시간: ${Math.floor(timeUntilExpiry / 60000)}분 남음`);
        }
        
        // 토큰 만료 30분 전이면 자동 갱신
        if (timeUntilExpiry > 0 && timeUntilExpiry < 30 * 60 * 1000) {
            console.log('🔄 토큰 만료 임박, 자동 갱신 시도...');
            await checkAndRefreshToken();
        }
        
        // 토큰 유효성 확인
        const isValid = await checkAndRefreshToken();
        if (isValid) {
            console.log('✅ 로그인 상태 유지됨 (자동 로그인)');
            localStorage.setItem(STORAGE_KEYS.KAKAO_LOGGED_IN, 'true');
            updateLoginUI(true);
            startNotificationScheduler();
            // 팝업 메시지 제거 (콘솔 로그만 유지)
        } else {
            // 토큰이 만료되었으면 로그아웃 처리
            console.log('⚠️ 토큰 만료됨, 로그아웃 처리');
            clearStoredTokens();
            updateLoginUI(false);
        }
    } else {
        console.log('ℹ️ 로그인되지 않음');
        clearStoredTokens();
        updateLoginUI(false);
    }
    
    // Load notification settings (기본값: false)
    const enableNotifications = localStorage.getItem(STORAGE_KEYS.ENABLE_NOTIFICATIONS) === 'true';
    
    const enableCheckbox = document.getElementById('enableNotifications');
    if (enableCheckbox) enableCheckbox.checked = enableNotifications;
}

/**
 * Save settings to localStorage
 */
function saveSettings() {
    const enableCheckbox = document.getElementById('enableNotifications');
    
    if (enableCheckbox) {
        localStorage.setItem(STORAGE_KEYS.ENABLE_NOTIFICATIONS, enableCheckbox.checked);
    }
    
    showToast('설정이 저장되었습니다', 'success');
}

// Export functions
window.kakaoNotification = {
    init: initKakao,
    login: kakaoLogin,
    logout: kakaoLogout,
    sendTest: sendTestKakaoMessage,
    saveSettings: saveSettings,
    getCurrentUserId: getCurrentKakaoUserId,
    getCurrentUserName: getCurrentKakaoUserName
};

// Helper function for time formatting
function formatTime(date) {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? '오후' : '오전';
    const displayHours = hours % 12 || 12;
    return `${ampm} ${displayHours}:${minutes.toString().padStart(2, '0')}`;
}

