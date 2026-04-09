const isDev = process.env.NODE_ENV === 'development';

export const logger = {
  warn: (...args: unknown[]) => { if (isDev) console.warn(...args); },
  error: (...args: unknown[]) => { console.error(...args); }, // errors always log
  info: (...args: unknown[]) => { if (isDev) console.info(...args); },
};
