module.exports = {
    "extends": "airbnb",
    "rules": {
        "keyword-spacing": 2,
        "generator-star-spacing": 0, // Temporary, avoids a bug in eslint babel parser
        "indent": ["error", 4, { "SwitchCase": 1 }],
        "strict": ["error", "safe"],
        "comma-dangle": ["error", "never"],
        "no-use-before-define": ["error", { "functions": false, "classes": true }],
        "no-param-reassign": ["error", { "props": false }],
        "array-bracket-spacing": ["error", "always"],
        "no-underscore-dangle": ["off"],
        "no-plusplus": ["off"],
        "radix": ["error", "as-needed"],
        "import/no-extraneous-dependencies": ["error", {"devDependencies": true, "optionalDependencies": false}],
        "no-continue": ["off"],
        "jsx-a11y/no-static-element-interactions": ["off"], // Consider
        "arrow-parens": ["off"]
    },
    "parserOptions": {
        "ecmaVersion": 2017,
        "sourceType": "script"
    }
}
