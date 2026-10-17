import { copyFileSync } from 'node:fs';
copyFileSync('play-build/index.html', 'LuxeLife.html');
console.log('Wrote LuxeLife.html — double-click it to play offline.');
