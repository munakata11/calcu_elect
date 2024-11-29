/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    forceSwcTransforms: true,
  },
  webpack: (config, { isServer }) => {
    // Windows���ł̓��{��p�X�Ƌ󔒕����΍�
    config.watchOptions = {
      poll: 1000,
      aggregateTimeout: 300,
      followSymlinks: false
    }
    
    // �V���{���b�N�����N�֘A�̐ݒ��ǉ�
    config.resolve = {
      ...config.resolve,
      symlinks: false
    }

    // �p�X�����̐ݒ��ǉ�
    config.node = {
      ...config.node,
      __filename: true,
      __dirname: true
    }
    
    return config
  },
  // �r���h�L���b�V���̐ݒ�
  generateBuildId: async () => {
    return 'build-' + Date.now()
  },
  poweredByHeader: false,
  // �ǉ��̐ݒ�
  distDir: '.next',
  cleanDistDir: true,
  i18n: {
    locales: ['ja'],
    defaultLocale: 'ja',
  },
  // �J�X�^�����b�Z�[�W�̐ݒ�
  env: {
    CALCULATOR_PLACEHOLDER: '�v�Z������͂��Ă�������... AI�Ōv�Z���܂�'
  }
}

module.exports = nextConfig 