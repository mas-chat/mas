module.exports = {
  "extends": "stylelint-config-standard",
  "plugins": [
    "stylelint-order"
  ],
  "rules": {
    "order/declaration-block-properties-alphabetical-order": true,
    "selector-pseudo-class-no-unknown": [ true, { ignorePseudoClasses: "global" } ]
  }
};
