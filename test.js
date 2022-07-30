const puppeteer = require('puppeteer-extra')
const Replayer = require('./index.js');

puppeteer.use(Replayer());

;(async () => {
    const browser = await puppeteer.launch({ headless: false, devtools: true });
    const page = await browser.newPage();

    const request = await page.catchRequest({
        pattern: /bing\.com\/bat\.js/
    }, () => page.goto("https://opensea.io"));

})();