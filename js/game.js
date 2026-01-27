const tg = window.Telegram.WebApp; tg.expand();
const SAVE_KEY = "FACE_MAGIC_V1"; 
const userId = tg.initDataUnsafe?.user?.id || "test_user";
const dbRef = db.ref(`${SAVE_KEY}/${userId}`);

let state = {
    stars: 0,
    isFreeUsed: false, // Использовал ли бесплатную
    credits: 0 // Купленные генерации
};

let currentStyle = null;

// === СТАРТ ===
dbRef.once('value').then(snap => {
    if (snap.exists()) state = { ...state, ...snap.val() };
    updateUI();
});
function saveState() { dbRef.set(state); }

// === ЗАГРУЗКА ФОТО ===
window.handleFile = function(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('preview').src = e.target.result;
            document.getElementById('preview').style.display = 'block';
            document.getElementById('placeholder').style.display = 'none';
        }
        reader.readAsDataURL(input.files[0]);
    }
};

// === ВЫБОР СТИЛЯ ===
window.selectStyle = function(style) {
    currentStyle = style;
    const names = { bum: "Образ: БОМЖ", rich: "Образ: ОЛИГАРХ", gym: "Образ: КАЧОК", clown: "Образ: КЛОУН" };
    document.getElementById('selectedStyleName').textContent = names[style];
    
    // Подсветка карточек
    document.querySelectorAll('.style-card').forEach(el => el.classList.remove('active'));
    event.currentTarget.classList.add('active');
    
    tg.HapticFeedback.selectionChanged();
};

// === ГЕНЕРАЦИЯ (СЕРДЦЕ БОТА) ===
window.startGeneration = function() {
    const img = document.getElementById('preview').src;
    if (!img || window.getComputedStyle(document.getElementById('preview')).display === 'none') {
        return tg.showAlert("Сначала загрузи фото!");
    }
    if (!currentStyle) return tg.showAlert("Выбери стиль!");

    // ПРОВЕРКА ОПЛАТЫ
    if (state.isFreeUsed && state.credits <= 0) {
        document.getElementById('shopModal').style.display = 'flex';
        return;
    }

    // СПИСАНИЕ
    if (!state.isFreeUsed) {
        state.isFreeUsed = true;
    } else {
        state.credits--;
    }
    saveState();
    updateUI();

    // ЗАПУСК "МАГИИ" (Визуализация)
    const loader = document.getElementById('loader');
    const txt = document.getElementById('loaderText');
    loader.style.display = 'flex';
    
    setTimeout(() => { txt.textContent = "Поиск лица..."; }, 1000);
    setTimeout(() => { txt.textContent = "Наложение образа: " + currentStyle; }, 2500);
    setTimeout(() => { txt.textContent = "Рендеринг нейросети..."; }, 4000);

    setTimeout(() => {
        loader.style.display = 'none';
        
        // ! СИМУЛЯЦИЯ РЕЗУЛЬТАТА !
        // Здесь мы пока просто меняем фильтры фото, чтобы показать "работу"
        // Когда подключим реальный API, тут будет ссылка на новое фото
        const resImg = document.getElementById('resultImage');
        resImg.src = img;
        
        if(currentStyle === 'bum') resImg.style.filter = 'grayscale(100%) contrast(150%) sepia(50%)';
        if(currentStyle === 'rich') resImg.style.filter = 'saturate(200%) brightness(110%)';
        if(currentStyle === 'gym') resImg.style.filter = 'contrast(120%)';
        if(currentStyle === 'clown') resImg.style.filter = 'hue-rotate(90deg)';

        document.getElementById('resultModal').style.display = 'flex';
        tg.HapticFeedback.notificationOccurred('success');
    }, 5500);
};

// === МАГАЗИН ===
window.buyPack = function() {
    tg.showConfirm("Купить 5 генераций за 25 Stars?", (ok) => {
        if (ok) {
            state.credits += 5;
            state.stars += 25; // Статистика для нас
            saveState();
            updateUI();
            document.getElementById('shopModal').style.display = 'none';
            tg.showAlert("Оплата прошла! +5 попыток.");
        }
    });
};

function updateUI() {
    document.getElementById('starsVal').textContent = state.stars;
    const lbl = document.getElementById('priceLabel');
    
    if (!state.isFreeUsed) {
        lbl.textContent = "Бесплатно (1/1)";
        lbl.style.color = "#2ecc71";
    } else if (state.credits > 0) {
        lbl.textContent = `Доступно: ${state.credits}`;
        lbl.style.color = "#f1c40f";
    } else {
        lbl.textContent = "25 Stars";
        lbl.style.color = "#e74c3c";
    }
}

window.closeResult = () => document.getElementById('resultModal').style.display = 'none';
window.openShop = () => document.getElementById('shopModal').style.display = 'flex';
