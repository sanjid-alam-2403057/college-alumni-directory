
self.addEventListener('install', (e) => {
    console.log('Service Worker: Installed successfully!');
});

self.addEventListener('fetch', (e) => {
    // This allows the app to work offline in the future if we want to upgrade it!
});
