/**
 * Kakao Notification Module
 * Handles Kakao login and notification sending
 */

// Kakao App Key
const KAKAO_APP_KEY = '870fe727e74ee5a06ea42e2b0a018006';

// Settings storage keys
const STORAGE_KEYS = {
    KAKAO_LOGGED_IN: 'kakao_logged_in',
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
    loadSettings();
}

/**
 * Kakao Login
 */
function kakaoLogin() {
    console.log('🔐 Attempting Kakao login...');
    Kakao.Auth.login({
        scope: 'talk_message',  // 나에게 보내기 권한 요청
        success: function(authObj) {
            console.log('✅ Kakao login successful');
            console.log('Auth object:', authObj);
            localStorage.setItem(STORAGE_KEYS.KAKAO_LOGGED_IN, 'true');
            updateLoginUI(true);
            showToast('카카오톡 로그인 성공!', 'success');
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
            localStorage.removeItem(STORAGE_KEYS.KAKAO_LOGGED_IN);
            updateLoginUI(false);
            showToast('카카오톡 로그아웃 완료', 'success');
            stopNotificationScheduler();
        });
    } else {
        // 토큰이 없어도 로컬 상태 정리
        localStorage.removeItem(STORAGE_KEYS.KAKAO_LOGGED_IN);
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
                resolve(true);
            },
            fail: function(error) {
                console.log('❌ Token validation failed:', error);
                // 토큰이 유효하지 않으면 재로그인 필요
                resolve(false);
            }
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
        return;
    }

    try {
        // Get all schedules
        const schedules = await api.getSchedules({});
        const now = new Date();
        const notificationLeadTime = notificationTime * 60 * 1000; // Convert minutes to milliseconds
        
        // Filter schedules that need notification
        const schedulesToNotify = [];
        
        schedules.forEach(schedule => {
            const scheduleStart = new Date(schedule.start);
            const scheduleEnd = schedule.end ? new Date(schedule.end) : null;
            
            // 시작 10분 전 알림 체크
            if (schedule.kakao_notification_start) {
                const timeDiffStart = scheduleStart - now;
                const isInStartWindow = 
                    timeDiffStart > (notificationLeadTime - 2 * 60 * 1000) && 
                    timeDiffStart <= (notificationLeadTime + 2 * 60 * 1000);
                
                if (isInStartWindow) {
                    schedulesToNotify.push({
                        ...schedule,
                        notificationType: 'start'
                    });
                }
            }
            
            // 종료 10분 전 알림 체크
            if (schedule.kakao_notification_end && scheduleEnd) {
                const timeDiffEnd = scheduleEnd - now;
                const isInEndWindow = 
                    timeDiffEnd > (notificationLeadTime - 2 * 60 * 1000) && 
                    timeDiffEnd <= (notificationLeadTime + 2 * 60 * 1000);
                
                if (isInEndWindow) {
                    schedulesToNotify.push({
                        ...schedule,
                        notificationType: 'end'
                    });
                }
            }
        });
        
        // Send notifications
        schedulesToNotify.forEach(schedule => {
            // Check if already notified (use localStorage to track)
            const notifiedKey = `notified_${schedule.id}_${schedule.notificationType}_${notificationTime}`;
            if (!localStorage.getItem(notifiedKey)) {
                sendScheduleNotification(schedule, schedule.notificationType);
                localStorage.setItem(notifiedKey, 'true');
                localStorage.setItem(notifiedKey + '_timestamp', Date.now().toString());
                // Remove old notification flags (older than 1 day)
                cleanupOldNotificationFlags();
            }
        });
        
    } catch (error) {
        console.error('Error checking notifications:', error);
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
    }
    
    // Check every minute
    notificationInterval = setInterval(checkAndSendNotifications, 60 * 1000);
    
    // Initial check
    checkAndSendNotifications();
    
    console.log('✅ Notification scheduler started');
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
        if (loggedInSection) loggedInSection.style.display = 'block';
        if (notificationSettings) notificationSettings.style.display = 'block';
    } else {
        if (loginSection) loginSection.style.display = 'block';
        if (loggedInSection) loggedInSection.style.display = 'none';
        if (notificationSettings) notificationSettings.style.display = 'none';
    }
}

/**
 * Load settings from localStorage
 */
async function loadSettings() {
    const isLoggedIn = localStorage.getItem(STORAGE_KEYS.KAKAO_LOGGED_IN) === 'true';
    
    if (isLoggedIn && Kakao.Auth.getAccessToken()) {
        // 토큰 유효성 확인
        const isValid = await checkAndRefreshToken();
        if (isValid) {
            updateLoginUI(true);
            startNotificationScheduler();
        } else {
            // 토큰이 만료되었으면 로그아웃 처리
            console.log('⚠️ Token expired, logging out...');
            updateLoginUI(false);
            localStorage.removeItem(STORAGE_KEYS.KAKAO_LOGGED_IN);
        }
    } else {
        updateLoginUI(false);
        localStorage.removeItem(STORAGE_KEYS.KAKAO_LOGGED_IN);
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
    saveSettings: saveSettings
};

// Helper function for time formatting
function formatTime(date) {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? '오후' : '오전';
    const displayHours = hours % 12 || 12;
    return `${ampm} ${displayHours}:${minutes.toString().padStart(2, '0')}`;
}

