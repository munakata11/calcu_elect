// ... 既存のコード ...

// メインのスクリーンショット
ipcMain.handle('take-screenshot', async () => {
  const pythonPath = path.join(__dirname, 'src', 'backend', 'python', 'screenshot.py')
  const result = await runPythonScript(pythonPath)
  return JSON.parse(result)
})

// チャット用のスクリーンショット
ipcMain.handle('take-chat-screenshot', async () => {
  const pythonPath = path.join(__dirname, 'src', 'backend', 'python', 'chat_screenshot.py')
  const result = await runPythonScript(pythonPath)
  return JSON.parse(result)
})

// ... 既存のコード ... 