module.exports = {
  env: {
    node: true,
    browser: false
  },
  parserOptions: {
    sourceType: 'module'
  },
  rules: {
    strict: [2, 'global'],
    'import/no-unresolved': 'off',
    'import/extensions': 'off'
  }
};
