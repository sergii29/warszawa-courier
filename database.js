const firebaseConfig = {
  apiKey: "AIzaSyChrQMyO2soPgoEHq_f3aYs5Cs19q3sWEk",
  authDomain: "warszawa-courier.firebaseapp.com",
  databaseURL: "https://warszawa-courier-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "warszawa-courier",
  storageBucket: "warszawa-courier.firebasestorage.app",
  messagingSenderId: "295860613508",
  appId: "1:295860613508:web:86fe8364377d6875612dd1",
  measurementId: "G-TGSCHBVLX2"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();
window.db = db;
console.log("Firebase initialized for Warsaw Courier");
