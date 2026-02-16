export interface Api {
  onQuickAdd: (callback: () => void) => () => void;
}

declare global {
  interface Window {
    api: Api;
  }
}

export {};
