import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  projectId: "advance-rush-451214-p2",
  appId: "1:753763992999:web:1c9ecb10bb43c0b1a32282",
  storageBucket: "advance-rush-451214-p2.firebasestorage.app",
  apiKey: "AIzaSyDJx8mF6slodBfTq5T2GnSi7SACLllpKXw",
  authDomain: "advance-rush-451214-p2.firebaseapp.com",
  messagingSenderId: "753763992999",
  measurementId: "G-P9WKMD5WXP"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
