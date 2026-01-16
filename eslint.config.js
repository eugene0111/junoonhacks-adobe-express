import js from '@eslint/js';
import noCommentsPlugin from 'eslint-plugin-no-comments';

export default [
  js.configs.recommended,
  {
    plugins: {
      'no-comments': noCommentsPlugin
    },
    rules: {
      'no-comments/disallowComments': 'error'
    }
  },
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
        global: 'readonly'
      }
    }
  },
  {
    files: ['src/services/websiteCrawler.js'],
    languageOptions: {
      globals: {
        document: 'readonly',
        window: 'readonly'
      }
    }
  }
];
