const patches = [
    'fix_v3.js'
];

patches.forEach(file => {
    const script = document.createElement('script');
    script.src = 'patches/' + file;
    script.async = false;
    document.body.appendChild(script);
});
