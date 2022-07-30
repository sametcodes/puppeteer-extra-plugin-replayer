const { PuppeteerExtraPlugin } = require('puppeteer-extra-plugin')

class RequestReplayer extends PuppeteerExtraPlugin {
    constructor(opts = {}) {
        super(opts)
    }
    get name() {
        return 'request-replayer'
    }
    isFunction = value => value && (Object.prototype.toString.call(value) === "[object Function]" || "function" === typeof value || value instanceof Function);
    prepareParams(defaultParams, overrideParams = {}) {
        let { url: _url, headers: _headers, method: _method, body: _body } = defaultParams;

        // setting url through imitiate_request by default
        // or as a parameter in .replay() function object
        if (this.isFunction(overrideParams?.url)) {
            _url = overrideParams.url(_url);
        } else if (typeof overrideParams?.url === "string") {
            _url = overrideParams?.url;
        }

        if (this.isFunction(overrideParams?.headers)) {
            _headers = overrideParams.headers(_headers);
        } else if (Object.keys(overrideParams?.headers || {}).length > 0) {
            _headers = overrideParams?.headers;
        }

        if (overrideParams?.method && typeof overrideParams.method === "string") {
            _method = overrideParams?.method;
        }

        if (this.isFunction(overrideParams?.body)) {
            _body = overrideParams.body(_body);
        } else if (overrideParams?.body) {
            _body = overrideParams.body;
        }

        return { _url, _headers, _method, _body }
    }
    async catchRequest(replayer, trigger, page = this.page) {
        // call trigger function if it's been defined
        await this.page.setRequestInterception(true);
        if (this.isFunction(trigger)) trigger();

        const cdpRequestCatcher = new Promise(async (resolve, reject) => {
            const cdpSession = await page.target().createCDPSession();
            await cdpSession.send('Network.enable');

            const addCDPRequestDataListener = (eventName) => cdpSession.on(eventName, request => {
                if (!request?.request?.url) { return };
                const reqURL = request.request.url;
                if (!reqURL.match(replayer.pattern)) return;

                const { url, headers, method, body } = request.request;
                return resolve({
                    url,
                    headers,
                    method,
                    body,
                    replay: (params) => {
                        const { _url, _headers, _method, _body } = this.prepareParams({ url, headers, method, body }, params)
                        return this.replayRequest({
                            ...params,
                            url: _url,
                            headers: _headers,
                            method: _method,
                            body: _body
                        }, page)
                    }
                });

            })

            addCDPRequestDataListener('Network.requestWillBeSent')
            addCDPRequestDataListener('Network.requestWillBeSentExtraInfo')
        })

        const xhrRequestCatcher = new Promise(async (resolve, reject) => {
            this.page.on('request', request => {
                const [url, headers, method, body] = [request.url(), request.headers(), request.method(), request.postData()];

                if (url.match(replayer.pattern)) {
                    resolve({
                        url, headers, method, body,
                        replay: (params) => {
                            const { _url, _headers, _method, _body } = this.prepareParams({ url, headers, method, body }, params);
                            return this.replayRequest({
                                ...params,
                                url: _url,
                                headers: _headers,
                                method: _method,
                                body: _body,
                            }, page)
                        }
                    });
                }

                return request.continue();
            })
        })

        return Promise.any([
            cdpRequestCatcher,
            xhrRequestCatcher
        ]);
    }
    replayRequest({ url, headers, method, body, ...options }, page = this.page) {
        return page.evaluate((url, headers, method, body, options) => {
            // this might be changed with XMLHTTPRequest
            return fetch(url, {
                "headers": headers,
                "body": body || null,
                "method": method,
                ...options
            }).then(res => {
                if(res?.headers?.get('Content-Type')?.includes("application/json")){
                    return res.json()
                }
                return res.text()
            })
        }, url, headers, method, body, options || {});
    }
    onPageCreated(page) {
        page.catchRequest = this.catchRequest.bind(this);
        this.page = page;
    }
}

module.exports = function (pluginConfig) {
    return new RequestReplayer(pluginConfig)
}