const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  {
    ignores: ['node_modules/', 'coverage/', 'uploads/'],
  },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'no-unused-vars': [
        'error',
        {
          // Express 에러 핸들러는 (err, req, res, next) 4개 인자가 있어야 동작하므로 next는 허용
          argsIgnorePattern: '^next$',
          // catch (error) { ... } 에서 error를 안 쓰는 경우는 허용
          caughtErrors: 'none',
        },
      ],
    },
  },
  {
    files: ['tests/**/*.js', '**/*.test.js'],
    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
  },
];
