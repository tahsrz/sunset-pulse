declare module '@strudel/web' {
  export function initStrudel(): Promise<void>;
  export function evaluate(pattern: string): unknown;
  export function hush(): void;
}
