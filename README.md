# puppeteer-extra-plugin-replayer

Replay and modify caught requests by intercepting network activity within puppeteer scripts.

This package is prepared for:

- QA Engineers
- Reverse Engineers
- Scrapers
- Penetration Testers

### Installation

```
npm install puppeteer-extra-plugin-replayer
```

### How to use

There are two scenarios to catch ongoing requests:
- initial requests when the site opens
- requests are triggered by user actions such as mouse click or search

In the first scenario, the page initiating must be done in the trigger function.

```javascript
(async () => {
    const request = await page.catchRequest({
        pattern: /hashflags.json/
    }, () => page.goto("https://twitter.com"));

    const response = await request.replay();
})();
```

In the second scenario, the interaction function that triggers the wanted request must be called in the trigger function of the `catchReques` method.

```javascript
(async () => {
    await page.goto("https://twitter.com")

    //...

    const request = await page.catchRequest({
        pattern: /onboarding\/task\.json\?flow_name=login/
    }, async () => {
        await page.waitForSelector("a[href='/login']")
        await page.click("a[href='/login']")
    });

    await request.replay();
})();
```

## API

### `page.catchRequest(PatternObject, triggerFunction)`

The plugin provides a function as `.catchRequest(object, fn)`, which can be used to catch ongoing requests. The function returns an extended version of `HTTPRequest`, which includes `.replay()` method.

### `request.replay(RequestInit?)`

The `.replay()` method takes an optional argument as an extended version of `RequestInit` object that includes functionated version of strign parameters such `url`, `method` and `headers`, and `body`.