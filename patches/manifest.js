const patches = [
    'game_v1.js'
];

patches.forEach(file => {
    const script = document.createElement('script');
    // Добавляем случайное число "rand", чтобы кэш обновился
    script.src = 'patches/' + file + '?rand=' + Math.random(); 
    script.async = false;
    document.body.appendChild(script);
});
