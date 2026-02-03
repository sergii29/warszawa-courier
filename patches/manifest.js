const patches = [
    'ultra.js'
];

patches.forEach(file => {
    const script = document.createElement('script');
    // Добавляем случайное число, чтобы кэш обновился 100%
    script.src = 'patches/' + file + '?time=' + Date.now();
    script.async = false;
    document.body.appendChild(script);
});
