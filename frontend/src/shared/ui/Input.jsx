import { cx } from './classNames.js';
import { forwardRef } from 'react';
const Input = forwardRef(function Input(
  { variant = 'default', className = '', placeholder, ...props },
  ref,
) {
  const input = (
    <input
      ref={ref}
      className={cx(
        'ui-input [&.ui-input--plain]:w-full [&.ui-input--plain]:min-w-0 [&.ui-input--plain]:min-h-16 [&.ui-input--plain]:h-16 [&.ui-input--plain]:[border:0] [&.ui-input--plain]:[background:transparent] [&.ui-input--plain]:outline-none [&.ui-input--plain]:text-16 [&.ui-input--plain]:leading-[normal] [&.ui-input--plain]:text-text [&.ui-input--plain]:p-[var(--space-14)_var(--space-2)] [&.ui-input--plain]:appearance-none [&.ui-input--plain]:[border-radius:0] [font:inherit] [color:inherit] [border:1px_solid_var(--color-border)] [background:var(--color-white)] rounded-11 p-[var(--space-13)_var(--space-14)] w-full min-w-0 text-16 leading-[1.8] [&:disabled]:opacity-60 [&:disabled]:cursor-not-allowed [&:disabled]:[background:var(--color-surface-raised)] [&::placeholder]:text-text-muted [&::placeholder]:opacity-[1] [&[aria-invalid=true]]:[border-color:var(--color-danger-border)] [&:focus-visible]:[outline:2px_solid_var(--color-focus)] [&:focus-visible]:[outline-offset:3px]',
        variant === 'plain' && 'ui-input--plain',
        className,
      )}
      placeholder={variant === 'plain' ? ' ' : placeholder}
      {...props}
    />
  );
  return variant === 'plain' ? (
    <div
      className="
      ui-input-wrap relative [flex:1] min-w-0 grid items-center
      [&:has(input:not(:placeholder-shown))_.ui-input-placeholder]:invisible [&_.ui-input]:[grid-area:1/1]
      [&_.ui-input]:relative [&_.ui-input]:z-[1]
     "
    >
      <span
        className="
      ui-input-placeholder [grid-area:1/1] text-16 leading-[2] py-(--space-14) text-text-muted
      pointer-events-none [overflow-wrap:normal] whitespace-normal
     "
        aria-hidden="true"
      >
        {placeholder}
      </span>
      {input}
    </div>
  ) : (
    input
  );
});
export default Input;
