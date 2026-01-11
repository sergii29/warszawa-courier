// --- database.js ---

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

// Инициализация Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// Функция сохранения в облако
function saveToCloud() {
    // Пытаемся взять ID из Телеграма, если нет — используем test_user
    let userId = (window.Telegram.WebApp.initDataUnsafe && window.Telegram.WebApp.initDataUnsafe.user) 
                 ? window.Telegram.WebApp.initDataUnsafe.user.id 
                 : "test_user_from_browser";

    // Сохраняем весь объект G (деньги, уровень и т.д.)
    db.ref('users/' + userId).set(G);
    console.log("Сохранено в облако для: " + userId);
}

// Слушаем изменения из админки
function listenToCloud() {
    let userId = (window.Telegram.WebApp.initDataUnsafe && window.Telegram.WebApp.initDataUnsafe.user) 
                 ? window.Telegram.WebApp.initDataUnsafe.user.id 
                 : "test_user_from_browser";

    db.ref('users/' + userId).on('value', (snapshot) => {
        const cloudData = snapshot.val();
        if (cloudData) {
            // Если админ поменял деньги или уровень — обновляем в игре
            if (cloudData.money !== G.money || cloudData.lvl !== G.lvl) {
                G.money = cloudData.money;
                G.lvl = cloudData.lvl;
                updateUI();
                console.log("Данные обновлены из облака!");
            }
        }
    });
}
