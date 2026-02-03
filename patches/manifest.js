const patches = [
    'game_v1.js'
];

patches.forEach(file => {
    const script = document.createElement('script');
    // Добавляем время, чтобы сбить кэш наверняка
    script.src = 'patches/' + file + '?v=' + Date.now();
    script.async = false;
    document.body.appendChild(script);
});
