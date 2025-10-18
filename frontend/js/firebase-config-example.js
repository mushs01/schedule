/**
 * Firebase Configuration Example
 * 
 * 이 파일을 복사하여 'firebase-config.js'로 이름을 변경하고
 * 실제 Firebase 프로젝트의 설정 값을 입력하세요.
 * 
 * Firebase Console에서 설정 값을 얻는 방법:
 * 1. https://console.firebase.google.com/ 접속
 * 2. 프로젝트 선택
 * 3. 설정(⚙️) > 프로젝트 설정
 * 4. "내 앱" 섹션에서 웹 앱(</>)  선택
 * 5. Firebase SDK 스니펫에서 구성 복사
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

const firebaseConfig = {
    apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    authDomain: "your-project-id.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project-id.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:abcdef1234567890"
};

// Firebase 초기화
let app;
let db;

try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    console.log('✅ Firebase initialized successfully');
} catch (error) {
    console.error('❌ Firebase initialization error:', error);
}

// Firestore 데이터베이스 내보내기
export { db };

