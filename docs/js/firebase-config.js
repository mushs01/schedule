/**
 * Firebase Configuration and Initialization
 * Firebase Web SDK를 사용하여 프론트엔드에서 직접 Firestore에 접근
 */

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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

