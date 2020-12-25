exports.command = function command() {
  const browser = this;

  browser
    .click('.fa-wrench')
    .useXpath()
    .click('//a[text()="Logout"]')
    .useCss()
    .waitForElementVisible('.fa-map-signs', 3000);

  return this;
};
