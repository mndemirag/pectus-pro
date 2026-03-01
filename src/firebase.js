import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
 apiKey: "AIzaSyDjAiJ7_q-1X31nh-O-UEd_K0d2oOq3rcc",
 authDomain: "pectus-pro.firebaseapp.com",
 projectId: "pectus-pro",
 storageBucket: "pectus-pro.firebasestorage.app",
 messagingSenderId: "697886143363",
 appId: "1:697886143363:web:49ef716a9e23e28af8fcb6"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);