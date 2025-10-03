module.exports = {
  root: true,
  env: {
    node: true,
    es2021: true,
    jest: true
  },
  extends: ['eslint:recommended'],
  parserOptions: {
    ecmaVersion: 2021
  },
  rules: {
    'no-console': 'off',
    semi: ['error', 'always'],
    'no-trailing-spaces': 'off',
    'space-before-function-paren': 'off'
  },
  overrides: [
    {
      files: ['**/*.test.js', '**/test-*.js', 'tests/**/*.js'],
      env: {
        jest: true,
        node: true
      }
    }
  ]
};
