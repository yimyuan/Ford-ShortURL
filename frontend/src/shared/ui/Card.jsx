import { cx } from './classNames.js';
export default function Card({ as: Component = 'article', className = '', children, ...props }) {
  return (
    <Component
      className={cx(
        'ui-card min-w-0 [background:linear-gradient(135deg,var(--color-card-start),var(--color-card-end))] [backdrop-filter:blur(var(--blur-glass))] [border:1px_solid_var(--color-border-glass-soft)] rounded-24 p-[var(--space-26)_var(--space-24)] [box-shadow:inset_0_1px_0_var(--color-card-inset),0_8px_30px_var(--color-card-shadow)] [transition:transform_var(--motion-normal),background_var(--motion-normal)] [&:hover]:[transform:translateY(-4px)] [&:hover]:[background:var(--color-card-hover)] max-[1200px]:p-[var(--space-24)_var(--space-20)] max-[960px]:p-(--space-26) max-[600px]:p-[var(--space-22)_var(--space-18)] max-[600px]:rounded-20 max-[600px]:[background:var(--color-card-mobile)] max-[380px]:p-(--space-24)',
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  );
}

export function CardTitle({ children }) {
  return (
    <h3
      className="
      ui-card__title text-18 leading-[1.8] font-semibold mb-(--space-8) tracking-[normal]
      max-[1200px]:text-17 max-[960px]:text-18 max-[600px]:text-16 max-[600px]:leading-[1.9]
      max-[600px]:min-h-[3.8em] max-[600px]:mb-(--space-9) max-[380px]:text-18 max-[380px]:min-h-0
     "
    >
      {children}
    </h3>
  );
}

export function CardDescription({ children }) {
  return (
    <p className="ui-card__description text-14 leading-[1.95] text-text-secondary max-[600px]:text-14 max-[600px]:leading-[2]">
      {children}
    </p>
  );
}
