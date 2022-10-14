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
export {};
//# sourceMappingURL=index.d.ts.map