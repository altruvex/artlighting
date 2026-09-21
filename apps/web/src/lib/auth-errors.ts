/**
 * Better Auth's error, as a message key.
 *
 * The client returns an English sentence and a code; the sentence was
 * being shown as-is, so an Arabic sign-in answered "Invalid email or
 * password". The code is stable and the sentence is not, so that is what
 * is mapped — anything unrecognised falls back to the form's own line
 * rather than leaking an English string into an Arabic page.
 */
const BY_CODE: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: "errors.invalidCredentials",
  INVALID_PASSWORD: "errors.invalidCredentials",
  USER_NOT_FOUND: "errors.invalidCredentials",
  USER_ALREADY_EXISTS: "errors.userExists",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "errors.userExists",
  PASSWORD_TOO_SHORT: "errors.weakPassword",
};

export function authErrorKey(error: { code?: string } | null | undefined, fallback: string): string {
  const code = error?.code;
  return (code && BY_CODE[code]) || `errors.${fallback}`;
}
