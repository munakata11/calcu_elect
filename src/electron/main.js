const { app, BrowserWindow, ipcMain, protocol } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

let pythonProcess = null;
let voiceRecognitionProcess = null;
let screenshotProcess = null;
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
    width: 805,
    height: 682,
    minWidth: 400,
    minHeight: 500,
    icon: path.join(process.env.NODE_ENV === 'development' 
      ? path.join(__dirname, '../../assets/cal.ico')
      : path.join(process.resourcesPath, 'cal.ico')),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
      devTools: true
    },
    autoHideMenuBar: true,
    frame: true,
    backgroundColor: '#ffffff',
    useContentSize: true,
    title: 'Calculator'
  });

  // メニューバーを完全に無効化
  win.setMenu(null);

  // ウィンドウサイズ変更を可能にする
  win.setResizable(true);

  // アクティブ状態の変更を監視
  win.on('focus', () => {
    win.setTitle('Calculator (Active)');
  });

  win.on('blur', () => {
    win.setTitle('Calculator');
  });

  // IPCハンドラーの設定
  ipcMain.handle('resize-window', async (event, width, height) => {
    try {
      // ウィンドウの最小サイズを設定
      const minWidth = 400;
      const minHeight = 500;

      // ウィンドウフレームや余白を考慮したサイズ整（必要に応じて調整）
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

  // 開発モードではローカルサーバーを使用、本番環境ではoutディレクトリから読み込む
  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:3000');
  } else {
    const indexPath = path.join(__dirname, '../../out/index.html');
    
    // index.htmlの内容を読み込んで修正
    let indexContent = fs.readFileSync(indexPath, 'utf8');
    
    // base hrefを相対パスに設定
    indexContent = indexContent.replace(
      '<head>',
      `<head><base href="file://${path.dirname(indexPath).replace(/\\/g, '/')}/">`
    );

    // 一時ファイルに書き出して読み込む
    const tempDir = path.join(app.getPath('temp'), 'calculator-app');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    const tempIndexPath = path.join(tempDir, 'index.html');
    fs.writeFileSync(tempIndexPath, indexContent);
    
    win.loadFile(tempIndexPath);
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

// アプリケーションの準備が整ったら
app.whenReady().then(() => {
  // プロトコルの登録
  protocol.registerFileProtocol('file', (request, callback) => {
    const pathname = decodeURIComponent(request.url.replace('file:///', ''));
    callback(pathname);
  });

  createWindow();
});

app.on('window-all-closed', () => {
  if (pythonProcess) {
    pythonProcess.kill();
  }
  if (voiceRecognitionProcess) {
    voiceRecognitionProcess.kill();
  }
  if (screenshotProcess) {
    screenshotProcess.kill();
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
    if (!pythonProcess || pythonProcess.killed) {
      reject(new Error('Pythonプロセスが利用できません'));
      return;
    }

    let responseData = '';
    const responseHandler = (data) => {
      responseData += data.toString();
      try {
        // 改行で分割して最後の有効なJSONを探す
        const lines = responseData.split('\n');
        for (const line of lines) {
          if (line.trim()) {
            try {
              const result = JSON.parse(line);
              pythonProcess.stdout.removeListener('data', responseHandler);
              pythonProcess.removeListener('error', errorHandler);
              clearTimeout(timeout);
              resolve(result);
              return;
            } catch (e) {
              // このラインは有効なJSONではない、次のラインを試す
              continue;
            }
          }
        }
      } catch (error) {
        // JSONのパースに敗した場合は、データが完全に受信されていない可能性があるため継続
      }
    };

    pythonProcess.stdout.on('data', responseHandler);

    // エラーハンドリング
    const errorHandler = (error) => {
      pythonProcess.stdout.removeListener('data', responseHandler);
      clearTimeout(timeout);
      reject(error);
    };
    pythonProcess.once('error', errorHandler);

    // タイムアウト設定（30秒に延長）
    const timeout = setTimeout(() => {
      pythonProcess.stdout.removeListener('data', responseHandler);
      pythonProcess.removeListener('error', errorHandler);
      reject(new Error('計算がタイムアウトしました'));
    }, 30000);

    try {
      // 式を直接送信（改行を含めて一度に送信）
      pythonProcess.stdin.write(expression + '\n');
    } catch (error) {
      clearTimeout(timeout);
      pythonProcess.stdout.removeListener('data', responseHandler);
      pythonProcess.removeListener('error', errorHandler);
      reject(error);
    }
  });
});

// 開発時のホットロード設定
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
    
    // パネルの状態応じてウィンドウサイズを変更
    const newWidth = isOpen ? currentWidth + panelWidth : currentWidth - panelWidth;
    win.setSize(newWidth, currentHeight);
    
    console.log('Window size updated:', { width: newWidth, height: currentHeight, panelState: isOpen ? 'open' : 'closed' });
  } catch (error) {
    console.error('パネルサイズ変更エラー:', error);
  }
}); 

// 常に最前面表示を切り替えるハンドラーを追加
ipcMain.on('toggle-always-on-top', (event, shouldPin) => {
  if (win) {
    win.setAlwaysOnTop(shouldPin, 'floating');
    // Windowsでより確実に最前面に表示するための設定
    if (process.platform === 'win32') {
      win.setSkipTaskbar(shouldPin);
    }
  }
}); 

// 音声認識プロセスの開始
ipcMain.handle('start-voice-recognition', async () => {
  return new Promise((resolve, reject) => {
    if (voiceRecognitionProcess) {
      resolve({ status: 'already_running' });
      return;
    }

    const voiceScript = path.join(__dirname, '../backend/python/voice_recognition.py');
    
    try {
      voiceRecognitionProcess = spawn('python', [voiceScript], {
        env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
      });

      voiceRecognitionProcess.stdout.setEncoding('utf-8');
      
      voiceRecognitionProcess.stdout.on('data', (data) => {
        try {
          // 改行で分割して各行を個別に処理
          const lines = data.toString().trim().split('\n');
          for (const line of lines) {
            if (line.trim()) {
              const result = JSON.parse(line);
              if (win) {
                win.webContents.send('voice-recognition-result', result);
              }
            }
          }
        } catch (error) {
          console.error('音声認識データのパースエラー:', error);
          console.error('問題のデータ:', data.toString());
        }
      });

      voiceRecognitionProcess.stderr.on('data', (data) => {
        console.error(`音声認識エラー: ${data}`);
      });

      voiceRecognitionProcess.on('close', (code) => {
        console.log(`音声認識プロセスが終了しました。コード: ${code}`);
        voiceRecognitionProcess = null;
      });

      resolve({ status: 'started' });
    } catch (error) {
      reject(error);
    }
  });
});

// 音声認識プロセスの停止
ipcMain.handle('stop-voice-recognition', async () => {
  return new Promise((resolve) => {
    if (voiceRecognitionProcess) {
      voiceRecognitionProcess.kill();
      voiceRecognitionProcess = null;
      resolve({ status: 'stopped' });
    } else {
      resolve({ status: 'not_running' });
    }
  });
}); 

// IPCハンドラーを追加
ipcMain.handle('take-screenshot', async () => {
  return new Promise((resolve, reject) => {
    const screenshotScript = path.join(process.env.NODE_ENV === 'development' 
      ? path.join(__dirname, '../backend/python/screenshot.py')
      : path.join(process.resourcesPath, 'screenshot'));
    
    try {
      screenshotProcess = spawn('python', [screenshotScript]);
      
      let responseData = '';
      
      screenshotProcess.stdout.on('data', (data) => {
        responseData += data.toString();
        try {
          const result = JSON.parse(responseData);
          resolve(result);
        } catch (e) {
          // JSONのパースに失敗した場合、データが完全ではない可能性があるので続行
        }
      });

      screenshotProcess.stderr.on('data', (data) => {
        console.error(`Screenshot stderr: ${data}`);
      });

      screenshotProcess.on('error', (error) => {
        reject(error);
      });

      screenshotProcess.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Screenshot process exited with code ${code}`));
        }
        screenshotProcess = null;
      });
    } catch (error) {
      reject(error);
    }
  });
}); 