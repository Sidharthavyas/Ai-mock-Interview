import {  getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyARK-zO01SNvMTPyilqsx3TtuNlvWY4wOg",
  authDomain: "ai-interview-app-28b04.firebaseapp.com",
  projectId: "ai-interview-app-28b04",
  storageBucket: "ai-interview-app-28b04.firebasestorage.app",
  messagingSenderId: "628806695555",
  appId: "1:628806695555:web:350b00a12f4738ac7a79b6",
  measurementId: "G-PFD4ZCNJTC"
};

// Initialize Firebase
const app = !getApps.length  ? initializeApp(firebaseConfig) : getApp()

export const auth = getAuth(app)
export const db = getFirestore(app)