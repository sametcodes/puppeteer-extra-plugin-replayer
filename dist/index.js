"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
const { PuppeteerExtraPlugin } = require('puppeteer-extra-plugin');
var any = require('promise.any');
class RequestReplayer extends PuppeteerExtraPlugin {
    constructor() {
        super(...arguments);
        this.isFunction = (value) => (Object.prototype.toString.call(value) === "[object Function]" || "function" === typeof value || value instanceof Function);
    }
    get _isPuppeteerExtraPlugin() {
        return true;
    }
    get name() {
        return 'request-replayer';
    }
    prepareParams(defaultParams, overrideParams = {}) {
        let { url: _url, headers: _headers, method: _method, body: _body } = defaultParams;
        // setting url through imitiate_request by default
        // or as a parameter in .replay() function object
        if (overrideParams.url && overrideParams.url instanceof Function) {
            _url = overrideParams.url(_url);
        }
        else if (overrideParams.url && typeof overrideParams.url === "string") {
            _url = overrideParams.url;
        }
        if (overrideParams.headers && overrideParams.headers instanceof Function) {
            _headers = overrideParams.headers(_headers);
        }
        else if (overrideParams.headers && Object.keys(overrideParams.headers || {}).length > 0) {
            _headers = overrideParams === null || overrideParams === void 0 ? void 0 : overrideParams.headers;
        }
        if (overrideParams.method && typeof overrideParams.method === "string") {
            _method = overrideParams.method;
        }
        if (overrideParams.body && (overrideParams === null || overrideParams === void 0 ? void 0 : overrideParams.body) instanceof Function) {
            _body = overrideParams.body(_body);
        }
        else if (overrideParams === null || overrideParams === void 0 ? void 0 : overrideParams.body) {
            _body = overrideParams.body;
        }
        return { _url, _headers, _method, _body };
    }
    catchRequest(replayer, trigger, page = this.page) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.page.setRequestInterception(true);
            if (this.isFunction(trigger))
                trigger();
            const cdpRequestCatcher = new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                const cdpSession = yield page.target().createCDPSession();
                yield cdpSession.send('Network.enable');
                const addCDPRequestDataListener = (eventName) => cdpSession.on(eventName, request => {
                    var _a;
                    if (!((_a = request === null || request === void 0 ? void 0 : request.request) === null || _a === void 0 ? void 0 : _a.url)) {
                        return;
                    }
                    ;
                    const reqURL = request.request.url;
                    if (!reqURL.match(replayer.pattern))
                        return;
                    const { url, headers, method, body } = request.request;
                    return resolve({
                        url,
                        headers,
                        method,
                        body,
                        replay: (params) => {
                            const { _url, _headers, _method, _body } = this.prepareParams({ url, headers, method, body }, params);
                            return this.replayRequest(Object.assign(Object.assign({}, params), { url: _url, headers: _headers, method: _method, body: _body }), page);
                        }
                    });
                });
                addCDPRequestDataListener('Network.requestWillBeSent');
                addCDPRequestDataListener('Network.requestWillBeSentExtraInfo');
            }));
            const xhrRequestCatcher = new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                this.page.on('request', (request) => {
                    const [url, headers, method, body] = [request.url(), request.headers(), request.method(), request.postData()];
                    if (url.match(replayer.pattern)) {
                        resolve({
                            url, headers, method, body,
                            replay: (params) => {
                                const { _url, _headers, _method, _body } = this.prepareParams({ url, headers, method, body }, params);
                                return this.replayRequest(Object.assign(Object.assign({}, params), { url: _url, headers: _headers, method: _method, body: _body }), page);
                            }
                        });
                    }
                    return request.continue();
                });
            }));
            return any([cdpRequestCatcher, xhrRequestCatcher]);
        });
    }
    replayRequest(_a, page) {
        var { url, headers, method, body } = _a, options = __rest(_a, ["url", "headers", "method", "body"]);
        if (page === void 0) { page = this.page; }
        return page.evaluate((url, headers, method, body, options) => {
            // this might be changed with XMLHTTPRequest
            return fetch(url, Object.assign({ "headers": headers, "body": body || null, "method": method }, options)).then(res => {
                var _a, _b;
                if ((_b = (_a = res === null || res === void 0 ? void 0 : res.headers) === null || _a === void 0 ? void 0 : _a.get('Content-Type')) === null || _b === void 0 ? void 0 : _b.includes("application/json")) {
                    return res.json();
                }
                return res.text();
            });
        }, url, headers, method, body, options || {});
    }
    onPageCreated(page) {
        page.catchRequest = this.catchRequest.bind(this);
        this.page = page;
    }
}
const defaultExport = () => new RequestReplayer();
module.exports = defaultExport;
//# sourceMappingURL=index.js.map