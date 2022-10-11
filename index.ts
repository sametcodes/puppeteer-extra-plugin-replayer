import { HTTPRequest, HTTPResponse, Page } from "puppeteer";
const { PuppeteerExtraPlugin } = require('puppeteer-extra-plugin')
var any = require('promise.any');

interface RequestParameter extends RequestInit {
    url?: string | ((arg0: string) => string);
    method?: string;
    headers?: any | ((arg0: any) => any);
    body?: any | ((arg0: any) => any);
}

interface Replayer {
    pattern: RegExp | string;
}

declare module 'puppeteer' {
    interface Page {
        catchRequest: (replayer: Replayer, trigger: () => void) => Promise<HTTPRequest>;
    }
}
declare module 'puppeteer' {
    interface HTTPRequest {
        replay: (params?: RequestParameter) => Promise<HTTPResponse>;
    }
}

class RequestReplayer extends PuppeteerExtraPlugin {
    get _isPuppeteerExtraPlugin() {
        return true
    }

    get name() {
        return 'request-replayer'
    }
    isFunction = (value: any) => (Object.prototype.toString.call(value) === "[object Function]" || "function" === typeof value || value instanceof Function);
    prepareParams(defaultParams: RequestParameter, overrideParams: RequestParameter = {}) {
        let { url: _url, headers: _headers, method: _method, body: _body } = defaultParams;

        // setting url through imitiate_request by default
        // or as a parameter in .replay() function object
        if (overrideParams.url && overrideParams.url instanceof Function) {
            _url = overrideParams.url(_url as string);
        } else if (overrideParams.url && typeof overrideParams.url === "string") {
            _url = overrideParams.url;
        }

        if (overrideParams.headers && overrideParams.headers instanceof Function) {
            _headers = overrideParams.headers(_headers);
        } else if (overrideParams.headers && Object.keys(overrideParams.headers || {}).length > 0) {
            _headers = overrideParams?.headers;
        }

        if (overrideParams.method && typeof overrideParams.method === "string") {
            _method = overrideParams.method;
        }

        if (overrideParams.body && overrideParams?.body instanceof Function) {
            _body = overrideParams.body(_body);
        } else if (overrideParams?.body) {
            _body = overrideParams.body;
        }

        return { _url, _headers, _method, _body }
    }
    async catchRequest(replayer: Replayer, trigger: (() => void), page: Page = this.page) {
        await this.page.setRequestInterception(true);
        if (this.isFunction(trigger)) trigger();

        const cdpRequestCatcher = new Promise(async (resolve, reject) => {
            const cdpSession = await page.target().createCDPSession();
            await cdpSession.send('Network.enable');

            const addCDPRequestDataListener = (eventName: string) => cdpSession.on(eventName, request => {
                if (!request?.request?.url) { return };
                const reqURL = request.request.url;
                if (!reqURL.match(replayer.pattern)) return;

                const { url, headers, method, body } = request.request;
                return resolve({
                    url,
                    headers,
                    method,
                    body,
                    replay: (params: any) => {
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
            this.page.on('request', (request: HTTPRequest) => {
                const [url, headers, method, body] = [request.url(), request.headers(), request.method(), request.postData()];

                if (url.match(replayer.pattern)) {
                    resolve({
                        url, headers, method, body,
                        replay: (params: any) => {
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

        return any([cdpRequestCatcher, xhrRequestCatcher]);
    }
    replayRequest({ url, headers, method, body, ...options }: RequestParameter, page = this.page): HTTPResponse {
        return page.evaluate((url: any, headers: any, method: any, body: any, options: any) => {
            // this might be changed with XMLHTTPRequest
            return fetch(url, {
                "headers": headers,
                "body": body || null,
                "method": method,
                ...options
            }).then(res => {
                if (res?.headers?.get('Content-Type')?.includes("application/json")) {
                    return res.json()
                }
                return res.text()
            })
        }, url, headers, method, body, options || {});
    }
    onPageCreated(page: Page) {
        page.catchRequest = this.catchRequest.bind(this);
        this.page = page;
    }
}

const defaultExport = () => new RequestReplayer();
module.exports = defaultExport;