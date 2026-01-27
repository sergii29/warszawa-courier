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

// Проверяем, чтобы не было ошибки повторной инициализации
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Делаем базу доступной для game.js
const db = firebase.database();
console.log("Firebase Connected");
