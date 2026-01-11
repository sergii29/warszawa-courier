import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, onValue, update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyChrqMyD2soPgoEHq_f3ayS5Cs19q3sWEk",
  authDomain: "warszawa-courier.firebaseapp.com",
  projectId: "warszawa-courier",
  storageBucket: "warszawa-courier.firebasestorage.app",
  messagingSenderId: "295808613500",
  appId: "1:295808613500:web:86fe8364377d6875612dd1",
  measurementId: "G-TG5CHBVLX2"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export { db, ref, set, onValue, update };
