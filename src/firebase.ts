import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

/**
 * CREATIONAL PATTERN - Singleton Pattern
 * Đảm bảo chỉ có một instance của Firebase app được tạo và chia sẻ trong toàn bộ ứng dụng
 * Cung cấp global access point cho các services Firebase
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// CREATIONAL PATTERN - Factory Pattern
// Firebase initializeApp() và getAuth() hoạt động như factory methods
// Tạo và tái sử dụng instances của Firebase services
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

