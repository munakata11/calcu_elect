#!/bin/bash

# Next.jsの開発サーバーを起動
cross-env NODE_ENV=development npm run dev &

# 少し待ってからElectronを起動
sleep 5
cross-env NODE_ENV=development npm run dev:electron 