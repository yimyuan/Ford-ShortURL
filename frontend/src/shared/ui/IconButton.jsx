import { cx } from './classNames.js';
import Icon from './Icon.jsx';
export default function IconButton({ label, icon, className = '', type = 'button', ...props }) {
  return (
    <button
      type={type}
      className={cx(
        'icon-button grid place-items-center shrink-0 w-(--space-36) h-(--space-36) p-0 [border:0] rounded-full [background:var(--color-surface-raised)] [&:disabled]:opacity-50 [&:disabled]:cursor-not-allowed [&:disabled]:transform-none [&:disabled]:shadow-none',
        className,
      )}
      aria-label={label}
      {...props}
    >
      <Icon name={icon} />
    </button>
  );
}
