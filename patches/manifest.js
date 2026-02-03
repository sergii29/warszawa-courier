const patches = [
    'game_v1.js'
];

patches.forEach(file => {
    const script = document.createElement('script');
    // Меняем цифру времени в конце, чтобы 100% загрузить свежий файл
    script.src = 'patches/' + file + '?v=' + Date.now();
    script.async = false;
    document.body.appendChild(script);
});
