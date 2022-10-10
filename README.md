# puppeteer-extra-plugin-replayer

Replay and modify caught requests by intercepting network activity within puppeteer scripts.

### Who is this for

- Scrapers
- QA Engineers
- Reverse Engineers
- Penetration Testers

### Installation

```
npm install puppeteer-extra-plugin-replayer
```

### How to use

There are two scenarios to catch ongoing requests:
- initial requests when the site opens
- requests are triggered by user actions such as mouse click or search

The plugin provides some functions under the `page` object. `.catchRequest(object, fn)` can be used to catch ongoing requests.

The function returns a request parameter object which includes `url`, `headers`, `method`, and `body` value of the requests and `.replay()` method. 

```javascript
(async () => {
    const request = await page.catchRequest({
        pattern: /bing\.com\/bat\.js/
    }, () => page.goto("https://opensea.io"));

    const response = await request.replay({
        url: (url) => url,
        method: "GET",
        headers: (headers) => headers,
        body: (body) => {...body, value: "X"}
    });
})();
```

The values can be taken in a callback function and be mutated, or be overwritten by defining a new value. The other usage is defining the new values directly without using a callback function.

```javascript
(async () => {
    const request = await page.catchRequest({
        pattern: /bing\.com\/bat\.js/
    }, () => page.goto("https://opensea.io"));

    const response = await request.replay({
        url: "https://opensea.io/test,
        method: "GET",
        headers: {
            "Authorization": "TEST",
        },
        body: 
    });
})();
```

But you don't have to set all the parameters if you don't mutate/overwrite them. It can be still replayed in this way.

```javascript
(async () => {
    const request = await page.catchRequest({
        pattern: /bing\.com\/bat\.js/
    }, () => page.goto("https://opensea.io"));

    // replays by sending an XHR
    const response = await request.replay();
})();
```
