module.exports = {
    "extends": "airbnb",
    "rules": {
        "keyword-spacing": 2,
        "generator-star-spacing": 0, // TODO: Temporary, remove when generators are gone
        "no-await-in-loop": 0, // TODO: Investigate if this can be actually enabled
        "global-require": 0, // We want to optimize dev startup speed by requiring some modules only if a feature needs it
        "no-restricted-syntax": 0,
        "indent": ["error", 4, { "SwitchCase": 1 }],
        "strict": ["error", "safe"],
        "comma-dangle": ["error", "never"],
        "no-use-before-define": ["error", { "functions": false, "classes": true }],
        "no-param-reassign": ["error", { "props": false }],
        "array-bracket-spacing": ["error", "always"],
        "no-underscore-dangle": ["off"],
        "no-plusplus": ["off"],
        "class-methods-use-this": ["off"],
        "radix": ["error", "as-needed"],
        "import/no-extraneous-dependencies": ["error", {"devDependencies": true, "optionalDependencies": false}],
        "no-console": ["error", { allow: ["warn", "error"] }],
        "no-continue": ["off"],
        "jsx-a11y/no-static-element-interactions": ["off"], // TODO: Consider
        "arrow-parens": ["off"]
    },
    "parserOptions": {
        "ecmaVersion": 2017,
        "sourceType": "script"
    }
}
