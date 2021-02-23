// TODO: Investigate why official @types/favico.js package doesn't work

declare module 'favico.js' {
  interface FavicoJsOptions {
    bgColor?: string;
    textColor?: string;
    fontFamily?: string;
    fontStyle?: string;
    type?: string;
    position?: string;
    animation?: string;
    elementId?: string;
    element?: HTMLElement;
  }

  class FavIco {
    constructor(options: FavicoJsOptions);
    badge(number: number): void;
    badge(number: number, opts: FavicoJsOptions): void;
    reset(): void;
  }

  export = FavIco;
}
