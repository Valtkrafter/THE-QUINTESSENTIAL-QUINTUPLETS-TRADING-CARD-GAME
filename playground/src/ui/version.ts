// The version of the game, written into the build from package.json (see `define` in vite.config.ts).
declare const __APP_VERSION__: string | undefined;

export const APP_VERSION: string = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev';
