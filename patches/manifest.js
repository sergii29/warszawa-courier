// MANIFEST: FORCE RELOAD
const patches = [
    'release.js'
];

patches.forEach(file => {
    const script = document.createElement('script');
    // Добавляем время к ссылке, чтобы браузер не брал старое из памяти
    script.src = 'patches/' + file + '?v=' + Date.now();
    script.async = false;
    document.body.appendChild(script);
    console.log(`[Patch System] Loading NEW version: ${file}`);
});
