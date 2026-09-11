export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;

export function validatePasswordInput(value: string): string | undefined {
  if (value.length < PASSWORD_MIN_LENGTH || value.length > PASSWORD_MAX_LENGTH) {
    return `Password must be between ${PASSWORD_MIN_LENGTH} and ${PASSWORD_MAX_LENGTH} characters`;
  }
  if (/\s|\p{Cc}/u.test(value)) {
    return 'Password must not contain whitespace or control characters';
  }
  if ([/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((pattern) => pattern.test(value)).length < 3) {
    return 'Password must contain at least three character classes';
  }
  return undefined;
}
