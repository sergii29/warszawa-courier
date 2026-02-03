// Папка для патчей.
// Мы грузим ТОЛЬКО ВТОРОЙ файл, потому что я собрал в него всё сразу (и банк, и магазин).

const patches = [
    'game-update-v2.js' 
];

// Логика загрузчика
patches.forEach(file => {
    const script = document.createElement('script');
    script.src = 'patches/' + file;
    script.async = false;
    document.body.appendChild(script);
    console.log(`[Patch System] Loading: ${file}`);
});
