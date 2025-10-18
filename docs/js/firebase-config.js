/**
 * Firebase Configuration (Compat Mode)
 * 모바일 브라우저 호환성을 위해 compat 버전 사용
 */

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
try {
    firebase.initializeApp(firebaseConfig);
    window.db = firebase.firestore();
    console.log('✅ Firebase initialized successfully');
} catch (error) {
    console.error('❌ Firebase initialization error:', error);
}
