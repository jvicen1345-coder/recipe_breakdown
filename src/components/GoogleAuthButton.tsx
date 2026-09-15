// Plain anchor, not a button+fetch — this needs a full-page navigation so the
// browser follows the redirect chain to Google's consent screen and back.
export function GoogleAuthButton({ label = "Continue with Google" }: { label?: string }) {
  return (
    <a
      href="/api/auth/google"
      className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-blush-dark/60 bg-white px-6 py-2.5 text-sm font-semibold text-foreground shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
        <path
          fill="#4285F4"
          d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.91c1.7-1.57 2.69-3.88 2.69-6.62z"
        />
        <path
          fill="#34A853"
          d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.81.54-1.84.86-3.05.86-2.34 0-4.33-1.58-5.04-3.71H.9v2.33A9 9 0 0 0 9 18z"
        />
        <path
          fill="#FBBC05"
          d="M3.96 10.71A5.4 5.4 0 0 1 3.68 9c0-.59.1-1.17.28-1.71V4.96H.9A9 9 0 0 0 0 9c0 1.45.35 2.83.9 4.04l3.06-2.33z"
        />
        <path
          fill="#EA4335"
          d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .9 4.96l3.06 2.33C4.67 5.16 6.66 3.58 9 3.58z"
        />
      </svg>
      {label}
    </a>
  );
}
