let googleScriptPromise;

export const loadGoogleIdentityScript = () => {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Google Identity is not available in this environment.'));
  }

  if (window.google?.accounts?.id) {
    return Promise.resolve(window.google);
  }

  if (!googleScriptPromise) {
    googleScriptPromise = new Promise((resolve, reject) => {
      const existingScript = document.querySelector('script[data-google-identity="true"]');
      if (existingScript) {
        existingScript.addEventListener('load', () => resolve(window.google));
        existingScript.addEventListener('error', () => reject(new Error('Failed to load Google Identity Services.')));
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.dataset.googleIdentity = 'true';
      script.onload = () => resolve(window.google);
      script.onerror = () => reject(new Error('Failed to load Google Identity Services.'));
      document.head.appendChild(script);
    });
  }

  return googleScriptPromise;
};