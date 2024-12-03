#!/bin/bash

# Next.jsビルド
cd src/frontend
npm run build

# Electronアプリケーションのパッケージング
cd ../electron
npm run package

# Pythonスクリプトの配布用パッケージング
cd ../backend/python
pyinstaller --onefile calculator.py 