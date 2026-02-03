const patches = [
    'release.js'
];

patches.forEach(file => {
    const script = document.createElement('script');
    script.src = 'patches/' + file;
    script.async = false;
    document.body.appendChild(script);
});
