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

// Инициализация
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// Функция сохранения в облако (ТЕПЕРЬ С ИМЕНЕМ!)
function saveToCloud() {
    const tg = window.Telegram.WebApp.initDataUnsafe;
    
    // Получаем ID
    let userId = (tg && tg.user) ? tg.user.id : "test_user_from_browser";
    
    // Получаем Имя и Никнейм
    let firstName = (tg && tg.user) ? tg.user.first_name : "Browser Player";
    let userName = (tg && tg.user && tg.user.username) ? "@" + tg.user.username : "No Username";

    // Собираем всё вместе: Данные игры + Имя
    let dataToSave = {
        ...G,           // Деньги, уровень и т.д.
        name: firstName, // Имя (Sergii)
        user: userName   // Ник (@sergii)
    };

    // Отправляем в базу
    db.ref('users/' + userId).set(dataToSave);
    console.log("Сохранено: " + firstName);
}

// Слушаем изменения
function listenToCloud() {
    let userId = (window.Telegram.WebApp.initDataUnsafe && window.Telegram.WebApp.initDataUnsafe.user) 
                 ? window.Telegram.WebApp.initDataUnsafe.user.id 
                 : "test_user_from_browser";

    db.ref('users/' + userId).on('value', (snapshot) => {
        const cloudData = snapshot.val();
        if (cloudData) {
            if (cloudData.money !== G.money || cloudData.lvl !== G.lvl) {
                G.money = cloudData.money;
                G.lvl = cloudData.lvl;
                updateUI();
            }
        }
    });
}
