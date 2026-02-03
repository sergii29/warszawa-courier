// Папка для патчей
const patches = [
    'game-update-v1.js', // <-- Наш новый патч
];

patches.forEach(file => {
    const script = document.createElement('script');
    script.src = 'patches/' + file;
    script.async = false;
    document.body.appendChild(script);
    console.log(`[Patch System] Loading: ${file}`);
});
