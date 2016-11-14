module.exports = {
  "parserOptions": {
    "sourceType": "module",
    "ecmaFeatures": {
      "jsx": true
    }
  },
  "globals": {
    "document": false,
    "window": false
  },
  "rules": {
    "max-len": ["error", 200],
    "react/jsx-filename-extension": ["off"],
    "indent": ["error", 2, { "SwitchCase": 1 }],
  }
}
