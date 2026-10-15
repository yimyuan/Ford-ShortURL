import { cx } from './classNames.js';
export default function Button({
  href,
  variant = 'primary',
  className = '',
  type = 'button',
  children,
  ...props
}) {
  const variants = {
    primary:
      'button-primary text-white [background:linear-gradient(125deg,var(--color-button-start),var(--color-button-end))] [box-shadow:inset_0_1px_1px_var(--color-button-inset),0_5px_12px_var(--color-button-shadow)] [&:hover]:[background:linear-gradient(125deg,var(--color-button-hover-start),var(--color-button-hover-end))] [&:hover]:[box-shadow:0_6px_20px_var(--color-button-hover-shadow)]',
    outline:
      'button-outline [border-color:var(--color-border-strong)] [background:var(--color-surface-outline)] [&:hover]:[background:var(--color-surface-outline-hover)]',
    info: 'text-info bg-info-surface [&&]:border-info/25 hover:bg-info/15 focus-visible:outline-info',
    role: 'text-role bg-role-surface [&&]:border-role/25 hover:bg-role/15 focus-visible:outline-role',
    success:
      'text-success bg-success-surface [&&]:border-success/25 hover:bg-success/15 focus-visible:outline-success',
    warning:
      'text-warning bg-warning-surface [&&]:border-warning/25 hover:bg-warning/15 focus-visible:outline-warning',
    danger:
      'text-danger bg-danger-surface [&&]:border-danger/25 hover:bg-danger/15 focus-visible:outline-danger',
  };
  const classes = cx(
    'button inline-flex justify-center items-center gap-(--space-12) shrink-0 rounded-100 min-h-12 p-[var(--space-11)_var(--space-25)] text-15 font-medium leading-[1.7] [border:1px_solid_transparent] whitespace-nowrap [transition:transform_var(--motion-fast),background_var(--motion-fast),box-shadow_var(--motion-fast)] [&:hover]:[transform:translateY(-2px)] [&:disabled]:opacity-50 [&:disabled]:cursor-not-allowed [&:disabled]:transform-none [&:disabled]:shadow-none',
    variants[variant],
    className,
  );
  return href ? (
    <a href={href} className={classes} {...props}>
      {children}
    </a>
  ) : (
    <button type={type} className={classes} {...props}>
      {children}
    </button>
  );
}
