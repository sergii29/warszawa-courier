// Папка для патчей. Просто раскомментируйте или добавьте строку, чтобы включить патч.
// Порядок важен! Патчи загружаются ПОСЛЕ основного ядра.

const patches = [
    // 'test-patch.js',       <-- пример
    // 'new-cars.js',         <-- пример
];

// Логика загрузчика (не меняйте это)
patches.forEach(file => {
    const script = document.createElement('script');
    script.src = 'patches/' + file;
    script.async = false; // Гарантирует выполнение по порядку
    document.body.appendChild(script);
    console.log(`[Patch System] Loading: ${file}`);
});
