
'use strict';

exports.command = function() {
    let browser = this;

    browser
        .click('.fa-wrench')
        .useXpath()
        .click('//a[text()="Logout"]')
        .useCss()
        .waitForElementVisible('img.logo', 1000);

    return this;
};
