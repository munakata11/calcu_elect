/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    forceSwcTransforms: true,
  },
  webpack: (config, { isServer }) => {
    // Windows環境での日本語パスと空白文字対策
    config.watchOptions = {
      poll: 1000,
      aggregateTimeout: 300,
      followSymlinks: false
    }
    
    // シンボリックリンク関連の設定を追加
    config.resolve = {
      ...config.resolve,
      symlinks: false
    }

    // パス解決の設定を追加
    config.node = {
      ...config.node,
      __filename: true,
      __dirname: true
    }
    
    return config
  },
  // ビルドキャッシュの設定
  generateBuildId: async () => {
    return 'build-' + Date.now()
  },
  poweredByHeader: false,
  // 追加の設定
  distDir: '.next',
  cleanDistDir: true,
  i18n: {
    locales: ['ja'],
    defaultLocale: 'ja',
  },
  // カスタムメッセージの設定
  env: {
    CALCULATOR_PLACEHOLDER: '計算式を入力してください... AIで計算します'
  }
}

module.exports = nextConfig 