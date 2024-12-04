const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const electronReload = require('electron-reload');

let pythonProcess = null;
let win = null;

function handlePythonProcessError(error) {
  console.error('Pythonプロセスエラー:', error);
  if (pythonProcess) {
    pythonProcess.kill();
    pythonProcess = null;
  }
}

function createWindow() {
  win = new BrowserWindow({
    width: 820,
    height: 719,
    minWidth: 400,
    minHeight: 500,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      devTools: process.env.NODE_ENV === 'development'
    },
    autoHideMenuBar: true,
    frame: true,
    backgroundColor: '#ffffff',
    useContentSize: true,
    title: 'AI電卓'
  });

  // メニューバーを完全に無効化
  win.setMenu(null);

  // ウィンドウのサイズ変更を可能にする
  win.setResizable(true);

  // アクティブ状態の変更を監視
  win.on('focus', () => {
    win.setTitle('AI電卓 (アクティブ)');
  });

  win.on('blur', () => {
    win.setTitle('AI電卓');
  });

  // IPCハンドラーの設定
  ipcMain.handle('resize-window', async (event, width, height) => {
    try {
      // ウィンドウの最小サイズを設定
      const minWidth = 400;
      const minHeight = 500;

      // ウィンドウフレームや余白を考慮したサイズ調整（必要に応じて調整）
      const newWidth = Math.max(Math.ceil(width) + 16, minWidth);
      const newHeight = Math.max(Math.ceil(height) + 40, minHeight);

      // ウィンドウサイズを変更
      win.setSize(newWidth, newHeight);
      win.setMinimumSize(minWidth, minHeight);

      // デバッグ用ログ
      console.log('Window resized to:', { width: newWidth, height: newHeight });
    } catch (error) {
      console.error('ウィンドウリサイズエラー:', error);
    }
  });

  // 開発モードではローカルサーバーを使用
  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:3000');
  } else {
    win.loadFile(path.join(__dirname, '../frontend/next.js/out/index.html'));
  }

  // Pythonプロセスの起動と監視
  const pythonScript = path.join(process.env.NODE_ENV === 'development' 
    ? path.join(__dirname, '../backend/python/calculator.py')
    : path.join(process.resourcesPath, 'calculator'));
  
  console.log('Pythonスクリプトのパス:', pythonScript);
  
  try {
    pythonProcess = spawn('python', [pythonScript]);

    pythonProcess.on('error', (error) => {
      console.error('Pythonプロセスの起動エラー:', error);
      handlePythonProcessError(error);
    });

    pythonProcess.stderr.on('data', (data) => {
      console.error(`Python stderr: ${data.toString()}`);
    });

    pythonProcess.stdout.on('data', (data) => {
      console.log(`Python stdout: ${data.toString()}`);
    });

    pythonProcess.on('close', (code) => {
      console.log(`Pythonプロセスが終了しました。終了コード: ${code}`);
      pythonProcess = null;
    });
  } catch (error) {
    console.error('Pythonプロセスの起動に失敗:', error);
  }
}

// アプリケーションのライフサイクル管理
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (pythonProcess) {
    pythonProcess.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPCハンドラーの設定
ipcMain.handle('calculate', async (event, expression) => {
  return new Promise((resolve, reject) => {
    pythonProcess.stdin.write(JSON.stringify({ expression }) + '\n');
    
    pythonProcess.stdout.once('data', (data) => {
      try {
        const result = JSON.parse(data.toString());
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  });
});

// 開発時のホットリロード設定
if (process.env.NODE_ENV === 'development') {
  require('electron-reload')(__dirname, {
    electron: path.join(__dirname, '..', '..', 'node_modules', '.bin', 'electron')
  });
}

// パネル開閉時のウィンドウサイズ変更ハンドラー
ipcMain.handle('toggle-panel-size', async (event, isOpen) => {
  try {
    const [currentWidth, currentHeight] = win.getSize();
    const panelWidth = 384; // 右パネルの幅（w-96 = 384px）
    
    // パネルの状態に応じてウィンドウサイズを変更
    const newWidth = isOpen ? currentWidth + panelWidth : currentWidth - panelWidth;
    win.setSize(newWidth, currentHeight);
    
    console.log('Window size updated:', { width: newWidth, height: currentHeight, panelState: isOpen ? 'open' : 'closed' });
  } catch (error) {
    console.error('パネルサイズ変更エラー:', error);
  }1
}); 