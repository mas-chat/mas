module.exports = {
    "parser": "babel-eslint",
    "extends": "airbnb-base",
    "rules": {
        "keyword-spacing": 2,
        "generator-star-spacing": 0, // Temporary, avoids a bug in eslint babel parser
        "indent": ["error", 4],
        "strict": ["error", "safe"],
        "comma-dangle": ["error", "never"],
        "no-use-before-define": ["error", { "functions": false, "classes": true }],
        "no-param-reassign": ["error", { "props": false }],
        "array-bracket-spacing": ["error", "always"]
    },
    "parserOptions": {
        "ecmaVersion": 6,
        "sourceType": "script"
    }
}
