module.exports = {
  extends: [
    'airbnb',
    'prettier'
  ],
  parser: 'babel-eslint',
  rules: {
    'prettier/prettier': [
      'error', {
        singleQuote: true
      }
    ],
    'no-await-in-loop': 0, // TODO: Investigate if this can be actually enabled
    'global-require': 0, // We want to optimize dev startup speed by requiring some modules only if a feature needs it
    'no-restricted-syntax': 0,
    'no-use-before-define': ['error', { 'functions': false, 'classes': true }],
    'no-param-reassign': ['error', { 'props': false }],
    'no-plusplus': ['off'],
    'no-underscore-dangle': ['off'],
    'class-methods-use-this': ['off'],
    'radix': ['error', 'as-needed'],
    'prefer-destructuring': ['off'],
    'import/no-extraneous-dependencies': ['error', { 'devDependencies': true, 'optionalDependencies': false }],
    'no-console': ['error', { allow: ['warn', 'error'] }],
    'no-continue': ['off'],
    'jsx-a11y/no-static-element-interactions': ['off'], // TODO: Consider
    'arrow-parens': ['off'],
    'react/jsx-filename-extension': [1, { "extensions": [".js", ".jsx"] }],
  },
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'module'
  },
  plugins: [
    'prettier'
  ]
};
