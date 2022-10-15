## puppeteer-extra-plugin-replayer

Replay and modify caught requests by intercepting network activity within puppeteer scripts.

This package is prepared for:

- QA Engineers
- Reverse Engineers
- Scrapers
- Penetration Testers

### Installation

```npm
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

It's possible to modify requests. [See more](#requestreplayrequestinit).

```javascript
const response = await request.replay({
	url: "https://twitter.com/logout", // defining a new URL is possible
	method: "POST", // changing the request method is possible as well
 	body: JSON.stringify({test: true}),
	headers: {test: true},
});

// or define callback functions to read default values

const response = await request.replay({
	url: url => url.replace(/login/, "/logout"),
	method: "POST", // changing the request method is possible as well
 	body: body => body + ";test=true",
	headers: headers => {...headers, test: true}
});
```

You can see original and replayed requests on the network tab in CDP.

<img width="675" alt="Screen Shot 2022-10-11 at 9 40 24 AM" src="https://user-images.githubusercontent.com/9467273/195022533-cc08c0c6-b9e1-45de-8289-8278edc132bf.png">


## API

#### `page.catchRequest(PatternObject, triggerFunction)`

The plugin provides a function as `.catchRequest(PatternObject, triggerFunction)`, which can be used to catch ongoing requests. The function returns an extended version of [`HTTPRequest`](https://learn.microsoft.com/en-us/javascript/api/@aspnet/signalr/httprequest?view=signalr-js-latest) object, which includes `.replay()` method.

#### `request.replay(RequestInit?)`

The `.replay()` method takes an optional argument as an extended version of [`RequestInit`](https://microsoft.github.io/PowerBI-JavaScript/interfaces/_node_modules_typedoc_node_modules_typescript_lib_lib_dom_d_.requestinit.html) object that includes functionated version of strign parameters such `url`, `method` and `headers`, and `body`.
