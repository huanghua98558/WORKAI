declare module 'puppeteer' {
  export interface ElementHandle<T> {
    asElement(): ElementHandle<T> | null;
    boxModel(): Promise<any>;
    click(options?: any): Promise<void>;
    dispose(): Promise<void>;
    evaluate(pageFunction: Function, ...args: any[]): Promise<any>;
    focus(): Promise<void>;
    hover(): Promise<void>;
    isIntersectingViewport(): Promise<boolean>;
    isVisible(): Promise<boolean>;
    screenshot(options?: any): Promise<Buffer | string>;
    tap(): Promise<void>;
    toJSON(): any;
    uploadFile(...filePaths: string[]): Promise<void>;
  }

  export interface Browser {
    close(): Promise<void>;
    newPage(): Promise<Page>;
    pages(): Promise<Page[]>;
    version(): Promise<string>;
    userAgent(): Promise<string>;
  }

  export interface Page {
    url(): Promise<string>;
    close(): Promise<void>;
    goto(url: string, options?: any): Promise<any>;
    setViewport(options: any): Promise<void>;
    viewport(): { width: number; height: number } | null;
    setUserAgent(userAgent: string): Promise<void>;
    screenshot(options?: any): Promise<Buffer | string>;
    pdf(options?: any): Promise<Buffer>;
    content(): Promise<string>;
    cookies(): Promise<any[]>;
    setCookie(...cookies: any[]): Promise<void>;
    deleteCookie(...cookies: any[]): Promise<void>;
    evaluate(pageFunction: Function, ...args: any[]): Promise<any>;
    evaluateHandle(pageFunction: Function, ...args: any[]): Promise<any>;
    click(selector: string): Promise<void>;
    type(selector: string, text: string, options?: any): Promise<void>;
    waitForSelector(selector: string, options?: any): Promise<any>;
    waitForFunction(pageFunction: Function, options?: any, ...args: any[]): Promise<any>;
    $(selector: string): Promise<any>;
    $$(selector: string): Promise<any[]>;
    select(selector: string, ...values: string[]): Promise<void>;
    hover(selector: string): Promise<void>;
    focus(selector: string): Promise<void>;
    on(event: string, handler: Function): void;
    removeListener(event: string, handler: Function): void;
    removeAllListeners(event?: string): void;
    isClosed(): boolean;
    setRequestInterception(enabled: boolean): Promise<void>;
  }

  export interface LaunchOptions {
    headless?: boolean | 'new';
    args?: string[];
    defaultViewport?: any;
    ignoreDefaultArgs?: string[] | boolean;
    timeout?: number;
  }

  export interface BrowserLaunchArgumentOptions {
    product?: string;
    extraPrefsFirefox?: Record<string, unknown>;
  }

  export function launch(options?: LaunchOptions & BrowserLaunchArgumentOptions): Promise<Browser>;
  export function connect(options: any): Promise<Browser>;
}
