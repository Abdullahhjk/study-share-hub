import { useEffect, useRef } from "react";
import type { ClipboardEvent, KeyboardEvent, ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface TotpInputProps {
  /** The 6-digit code string ("" or 6 digits). */
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
  disabled?: boolean;
  /** Applied to each individual digit box. */
  className?: string;
  /** Applied to the wrapping grid. Use this to control layout/width. */
  containerClassName?: string;
  ariaLabel?: string;
}

/**
 * Six separate single-digit TOTP inputs.
 *
 * - Digits 0-9 only; letters, punctuation, spaces and symbols are rejected.
 * - Typing a digit moves focus to the next box.
 * - Backspace clears the current box, or (when empty) jumps back and clears
 *   the previous one — standard OTP behavior.
 * - Pasting a code fills all six boxes (non-numeric characters are ignored).
 * - Nothing about the code is stored, logged or persisted by this component.
 */
export function TotpInput({
  value,
  onChange,
  autoFocus,
  disabled,
  className,
  containerClassName,
  ariaLabel = "6-digit authentication code",
}: TotpInputProps) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const digits = Array.from({ length: 6 }, (_, i) => value[i] ?? "");

  const focusIndex = (index: number) => {
    const el = inputsRef.current[Math.max(0, Math.min(5, index))];
    if (el) {
      el.focus();
      el.select();
    }
  };

  useEffect(() => {
    if (autoFocus) focusIndex(0);
  }, [autoFocus]);

  const handleChange = (index: number, raw: string) => {
    const cleaned = raw.replace(/\D/g, "");
    if (cleaned.length === 0) return;

    const next = value.split("");

    if (cleaned.length > 1) {
      // Some IMEs/autofill drop multiple digits into a single box.
      for (let k = 0; k < cleaned.length && index + k < 6; k++) {
        next[index + k] = cleaned[k];
      }
      onChange(next.join(""));
      focusIndex(Math.min(5, index + cleaned.length));
      return;
    }

    next[index] = cleaned;
    onChange(next.join(""));
    focusIndex(index + 1);
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      const next = value.split("");
      if (next[index]) {
        next[index] = "";
        onChange(next.join(""));
        focusIndex(index);
      } else if (index > 0) {
        next[index - 1] = "";
        onChange(next.join(""));
        focusIndex(index - 1);
      }
      return;
    }

    if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      focusIndex(index - 1);
      return;
    }

    if (e.key === "ArrowRight" && index < 5) {
      e.preventDefault();
      focusIndex(index + 1);
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const text = e.clipboardData?.getData("text") ?? "";
    const digits = text.replace(/\D/g, "").slice(0, 6);
    if (digits.length === 0) return;
    onChange(digits);
    focusIndex(Math.min(5, digits.length));
  };

  const inputs: ReactNode[] = [];
  for (let i = 0; i < 6; i++) {
    if (i === 3) {
      inputs.push(
        <div key="separator" className="w-2 shrink-0 text-center text-sm leading-none tabular-nums sm:text-xl">
          -
        </div>
      );
    }
    inputs.push(
      <Input
        key={i}
        ref={(el) => {
          inputsRef.current[i] = el;
        }}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        placeholder="0"
        maxLength={1}
        autoComplete={i === 0 ? "one-time-code" : "off"}
        value={digits[i]}
        disabled={disabled}
        onFocusCapture={(e) => {
          e.currentTarget.placeholder = "";
        }}
        onBlur={(e) => {
          e.currentTarget.placeholder = "0";
        }}
        aria-label={ariaLabel}
        className={cn(
          "h-11 w-full min-w-0 px-0 text-center text-lg font-semibold tabular-nums sm:h-14 sm:text-2xl",
          className,
        )}
        onChange={(e) => handleChange(i, e.target.value)}
        onKeyDown={(e) => handleKeyDown(i, e)}
        onFocus={(e) => e.target.select()}
      />,
    );
  }

  return (
    <div
      className={cn(
        "mx-auto grid w-full max-w-[16rem] grid-cols-[repeat(3,minmax(0,1fr))_auto_repeat(3,minmax(0,1fr))] items-center gap-1.5 sm:max-w-md sm:gap-2.5",
        containerClassName,
      )}
      onPaste={handlePaste}
    >
      {inputs}
    </div>
  );
}
