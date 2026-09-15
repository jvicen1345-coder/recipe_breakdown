// Maps the `?error=` code the Google OAuth callback redirects with back to a
// friendly message for the login/signup pages to show.
const MESSAGES: Record<string, string> = {
  "google-not-configured": "Google sign-in isn't set up on this deployment yet.",
  "google-denied": "Google sign-in was canceled.",
  "google-state-mismatch": "That sign-in link expired — please try again.",
  "google-failed": "Something went wrong signing in with Google. Please try again.",
};

export function oauthErrorMessage(code: string | null): string | null {
  if (!code) return null;
  return MESSAGES[code] ?? null;
}
