module.exports = {
    "parser": "babel-eslint",
    "extends": "airbnb-base",
    "rules": {
        "keyword-spacing": 2,
        "generator-star-spacing": 0, // Temporary, avoids a bug in eslint babel parser
        "indent": ["error", 4],
        "strict": ["error", "safe"],
        "comma-dangle": ["error", "never"]
    },
    "parserOptions": {
        "ecmaVersion": 6,
        "sourceType": "script"
    }
}
