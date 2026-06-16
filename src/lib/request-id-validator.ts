export const FULL_PATTERN = "REQ_XXXXXXXX_XXXX";
export const PATTERN_REGEX = /^REQ_[A-Z0-9]{8}_[A-Z0-9]{4}$/i;

export interface ValidationResult {
  hint: string | null;
  error: string | null;
}

export function validateRequestId(input: string): ValidationResult {
  if (!input) return { hint: null, error: null };
  if (input.length > FULL_PATTERN.length) {
    return { hint: null, error: `Expected format: ${FULL_PATTERN}` };
  }

  for (let i = 0; i < input.length; i++) {
    const expected = FULL_PATTERN[i];
    const actual = input[i];

    if (expected === "X") {
      if (!/^[A-Z0-9]$/i.test(actual)) {
        return {
          hint: null,
          error: `Invalid character at position ${i + 1}. Expected a letter or number.`,
        };
      }
    } else {
      if (actual.toUpperCase() !== expected) {
        if (expected === "_") {
          return {
            hint: null,
            error: `Position ${i + 1} must be an underscore (_).`,
          };
        }
        return {
          hint: null,
          error: `Position ${i + 1} must be "${expected}".`,
        };
      }
    }
  }

  if (input.length < FULL_PATTERN.length) {
    return { hint: input + FULL_PATTERN.slice(input.length), error: null };
  }

  return { hint: null, error: null };
}
