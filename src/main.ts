import { spawn } from 'child_process';
import { join } from 'path';

ipcMain.handle('take-screenshot', async () => {
  return new Promise((resolve, reject) => {
    const scriptPath = join(__dirname, 'backend', 'python', 'screenshot.py');
    const pythonProcess = spawn('python', [scriptPath]);
    
    let stdoutData = '';
    let stderrData = '';

    pythonProcess.stdout.on('data', (data) => {
      stdoutData += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      stderrData += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code === 0 && stdoutData) {
        try {
          const result = JSON.parse(stdoutData);
          resolve(result);
        } catch (error) {
          reject(new Error('Failed to parse screenshot data'));
        }
      } else {
        reject(new Error(stderrData || 'Screenshot process failed'));
      }
    });
  });
}); 