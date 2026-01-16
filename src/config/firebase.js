import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
    apiKey: "AIzaSyC3Br7iDX-2irFrN9dLE6vjtsuWFQzfo2U",
    authDomain: "portfolio-chess.firebaseapp.com",
    databaseURL: "https://portfolio-chess-default-rtdb.firebaseio.com",
    projectId: "portfolio-chess",
    storageBucket: "portfolio-chess.firebasestorage.app",
    messagingSenderId: "5157075220",
    appId: "1:5157075220:web:68efc5fed277db42f8ea01",
    measurementId: "G-NJVP8F749N"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Realtime Database
export const db = getDatabase(app);

// Initialize Firebase Auth
export const auth = getAuth(app);

export default app;
