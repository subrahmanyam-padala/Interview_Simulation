import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { loadGoogleIdentityScript } from '../utils/googleIdentity';
import { useToast } from '../context/ToastContext';

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#EA4335" d="M9 3.58c1.69 0 2.85.73 3.5 1.34l2.33-2.25C13.41 1.34 11.42.4 9 .4 5.36.4 2.22 2.49.7 5.52l2.69 2.09C4.1 5.45 6.32 3.58 9 3.58Z" />
      <path fill="#4285F4" d="M17.64 9.2c0-.63-.05-1.1-.15-1.58H9v2.97h4.85c-.1.74-.62 1.87-1.78 2.62l2.72 2.11c1.63-1.5 2.85-3.72 2.85-6.12Z" />
      <path fill="#FBBC05" d="M3.39 10.13a5.1 5.1 0 0 1 0-2.27L.7 5.77A9.06 9.06 0 0 0 .7 12.2l2.69-2.08Z" />
      <path fill="#34A853" d="M9 17.6c2.42 0 4.45-.8 5.93-2.17l-2.72-2.11c-.73.5-1.71.85-3.2.85-2.68 0-4.9-1.87-5.61-4.33L.71 12.2C2.22 15.22 5.36 17.6 9 17.6Z" />
    </svg>
  );
}

function GoogleSignInButton({ onSuccess, disabled = false }) {
  const buttonRef = useRef(null);
  const onSuccessRef = useRef(onSuccess);
  const { pushToast } = useToast();
  const [loading, setLoading] = useState(false);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    onSuccessRef.current = onSuccess;
  }, [onSuccess]);

  useEffect(() => {
    let cancelled = false;

    const initializeGoogleButton = async () => {
      if (!clientId || !buttonRef.current) {
        return;
      }

      try {
        await loadGoogleIdentityScript();
        if (cancelled || !buttonRef.current || !window.google?.accounts?.id) {
          return;
        }

        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response) => {
            if (!response?.credential) {
              pushToast({ title: 'Google sign-in failed', variant: 'error' });
              return;
            }

            setLoading(true);
            try {
              await onSuccessRef.current?.(response.credential);
            } catch (_error) {
              // handled by the caller
            } finally {
              setLoading(false);
            }
          },
        });

        buttonRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: 'outline',
          size: 'large',
          width: buttonRef.current.clientWidth || 360,
          text: 'continue_with',
          shape: 'rectangular',
          logo_alignment: 'left',
        });
      } catch (_error) {
        pushToast({ title: 'Google sign-in is unavailable', description: 'Please try again later.', variant: 'error' });
      }
    };

    initializeGoogleButton();

    return () => {
      cancelled = true;
    };
  }, [clientId, pushToast]);

  if (!clientId) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => pushToast({ title: 'Google sign-in is not configured.', description: 'Set VITE_GOOGLE_CLIENT_ID to enable OAuth.', variant: 'error' })}
        className="flex h-[52px] w-full items-center justify-center gap-3 rounded-xl border border-[#E5E7EB] bg-[#FFFFFF] px-4 text-sm font-semibold text-[#111827] shadow-sm transition duration-300 hover:border-[#BFDBFE] hover:bg-[#F9FAFB] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-70"
      >
        <GoogleMark />
        Continue with Google
      </button>
    );
  }

  return (
    <div className="relative">
      <div ref={buttonRef} className={`h-[52px] w-full overflow-hidden rounded-xl ${disabled || loading ? 'pointer-events-none opacity-70' : ''}`} />
      {loading ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-xl bg-[rgba(255,255,255,0.82)]">
          <Loader2 className="h-5 w-5 animate-spin text-[#2563EB]" />
        </div>
      ) : null}
    </div>
  );
}

export default GoogleSignInButton;
