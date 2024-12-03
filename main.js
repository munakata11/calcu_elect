const { app } = require('electron');
const path = require('path');

// Electronのメインプロセスファイルをロード
require('./src/electron/main.js');

// アプリケーションのルートパスを設定
global.appRoot = path.join(__dirname); 