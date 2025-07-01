export const AppLog = {
  info: (...args: any[]) => console.log('[QuickSecure]', ...args),
  error: (...args: any[]) => console.error('[QuickSecure]', ...args),
  warn: (...args: any[]) => console.warn('[QuickSecure]', ...args),
}; 