/**
 * Firebase Cloud Messaging Service Worker
 * 백그라운드에서 푸시 알림을 받기 위한 서비스 워커
 * Version: 2 (캐시 무효화용)
 */

// Firebase SDK 임포트
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Firebase 설정
const firebaseConfig = {
    apiKey: "AIzaSyDSIglk_bkMSQvsZcs4EacTebq-RB1mM2o",
    authDomain: "family-schedule-app-c5417.firebaseapp.com",
    projectId: "family-schedule-app-c5417",
    storageBucket: "family-schedule-app-c5417.firebasestorage.app",
    messagingSenderId: "718149565027",
    appId: "1:718149565027:web:bf53d762c79610df259656",
    measurementId: "G-MMNN4NXZG6"
};

// Firebase 초기화
firebase.initializeApp(firebaseConfig);

// Messaging 인스턴스
const messaging = firebase.messaging();

// 백그라운드 메시지 핸들러
messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] 백그라운드 메시지 수신:', payload);

    const notificationTitle = payload.notification.title || '가족 일정';
    const notificationOptions = {
        body: payload.notification.body,
        icon: payload.notification.icon || '/icon-192x192.png',
        badge: '/icon-192x192.png',
        tag: payload.data?.scheduleId || 'schedule-notification',
        data: payload.data,
        requireInteraction: true, // 사용자가 직접 닫을 때까지 유지
        vibrate: [200, 100, 200] // 진동 패턴
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
});

// 알림 클릭 핸들러
self.addEventListener('notificationclick', (event) => {
    console.log('[firebase-messaging-sw.js] 알림 클릭:', event);
    
    event.notification.close();

    // 앱 열기 또는 포커스
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // 이미 열린 창이 있으면 포커스
            for (const client of clientList) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    return client.focus();
                }
            }
            // 없으면 새 창 열기
            if (clients.openWindow) {
                return clients.openWindow('/');
            }
        })
    );
});

