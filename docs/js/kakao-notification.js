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
    Kakao.Auth.login({
        success: function(authObj) {
            console.log('✅ Kakao login successful');
            localStorage.setItem(STORAGE_KEYS.KAKAO_LOGGED_IN, 'true');
            updateLoginUI(true);
            showToast('카카오톡 로그인 성공!', 'success');
            startNotificationScheduler();
        },
        fail: function(err) {
            console.error('❌ Kakao login failed:', err);
            showToast('카카오톡 로그인 실패', 'error');
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
    }
}

/**
 * Send test message to Kakao
 */
function sendTestKakaoMessage() {
    if (!Kakao.Auth.getAccessToken()) {
        showToast('카카오톡 로그인이 필요합니다', 'error');
        return;
    }

    Kakao.API.request({
        url: '/v2/api/talk/memo/default/send',
        data: {
            template_object: {
                object_type: 'text',
                text: '📅 가족 일정 관리 앱 테스트 메시지입니다!\n\n알림 설정이 정상적으로 작동하고 있습니다.',
                link: {
                    web_url: window.location.href,
                    mobile_web_url: window.location.href
                }
            }
        },
        success: function(response) {
            console.log('✅ Test message sent:', response);
            showToast('테스트 메시지를 전송했습니다!', 'success');
        },
        fail: function(error) {
            console.error('❌ Failed to send test message:', error);
            showToast('메시지 전송 실패', 'error');
        }
    });
}

/**
 * Send schedule notification to Kakao
 */
function sendScheduleNotification(schedule) {
    if (!Kakao.Auth.getAccessToken()) {
        return;
    }

    const personName = window.PERSON_NAMES[schedule.person] || schedule.person;
    const startDate = new Date(schedule.start);
    const timeStr = formatTime(startDate);
    
    let text = `📅 일정 알림\n\n`;
    text += `[${personName}] ${schedule.title}\n`;
    text += `시간: ${timeStr}`;
    
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
        }
    });
}

/**
 * Check and send notifications
 */
async function checkAndSendNotifications() {
    const enableNotifications = localStorage.getItem(STORAGE_KEYS.ENABLE_NOTIFICATIONS) === 'true';
    const notificationTime = 10; // 고정: 10분 전
    
    if (!enableNotifications || !Kakao.Auth.getAccessToken()) {
        return;
    }

    try {
        // Get all schedules
        const schedules = await api.getSchedules({});
        const now = new Date();
        const notificationLeadTime = notificationTime * 60 * 1000; // Convert minutes to milliseconds
        
        // Filter schedules that need notification
        const schedulesToNotify = schedules.filter(schedule => {
            const scheduleStart = new Date(schedule.start);
            const timeDiff = scheduleStart - now;
            
            // Check if notification time range (within ±2 minutes of lead time)
            const isInNotificationWindow = 
                timeDiff > (notificationLeadTime - 2 * 60 * 1000) && 
                timeDiff <= (notificationLeadTime + 2 * 60 * 1000);
            
            return isInNotificationWindow;
        });
        
        // Send notifications
        schedulesToNotify.forEach(schedule => {
            // Check if already notified (use localStorage to track)
            const notifiedKey = `notified_${schedule.id}_${notificationTime}`;
            if (!localStorage.getItem(notifiedKey)) {
                sendScheduleNotification(schedule);
                localStorage.setItem(notifiedKey, 'true');
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
        loginSection.style.display = 'none';
        loggedInSection.style.display = 'block';
        notificationSettings.style.display = 'block';
    } else {
        loginSection.style.display = 'block';
        loggedInSection.style.display = 'none';
        notificationSettings.style.display = 'none';
    }
}

/**
 * Load settings from localStorage
 */
function loadSettings() {
    const isLoggedIn = localStorage.getItem(STORAGE_KEYS.KAKAO_LOGGED_IN) === 'true';
    
    if (isLoggedIn && Kakao.Auth.getAccessToken()) {
        updateLoginUI(true);
        startNotificationScheduler();
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

