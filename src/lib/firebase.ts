// Import the functions you need from the SDKs you need
import { initializeApp, getApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDkW0TU_XkIzdTAaMEVGLQVOGrGpCk4GLo",
  authDomain: "kng-vetstock.firebaseapp.com",
  projectId: "kng-vetstock",
  storageBucket: "kng-vetstock.firebasestorage.app",
  messagingSenderId: "848781049532",
  appId: "1:848781049532:web:e58fa4d6835532fd48dab9",
  measurementId: "G-HPC2QKK1E3"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };
