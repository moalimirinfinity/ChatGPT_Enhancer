module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true
  },
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  globals: {
    chrome: 'readonly',
    browser: 'readonly'
  },
  ignorePatterns: ['.eslintrc.cjs', 'dist/', 'node_modules/', 'public/assets/libs/'],
  extends: ['eslint:recommended'],
  overrides: [
    {
      files: ['vite.config.js', 'tests/**/*.js'],
      env: {
        node: true,
        browser: true
      }
    }
  ]
};
