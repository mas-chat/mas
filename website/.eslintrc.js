module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module'
  },
  extends: [
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended'
  ],
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { varsIgnorePattern: '^_' }],
    'react/boolean-prop-naming': 'error',
    'react/destructuring-assignment': 'error',
    'react/no-array-index-key': 'error',
    'jsx-a11y/no-autofocus': 'off'
  },
  settings: {
    react: {
      version: 'detect'
    }
  }
};
