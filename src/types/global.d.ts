export {};

declare global {
  interface Window {
    __appNotify?: (type: string, payload: any) => void;
  }
}
