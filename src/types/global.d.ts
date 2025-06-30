declare global {
  var showToast: ((message: string) => void) | undefined;
  var showBanner: ((message: string, type?: 'success' | 'error' | 'warning') => void) | undefined;
}
 
export {}; 