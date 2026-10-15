import { Card, cx } from '../../../shared/ui/index.js';
export default function Panel({ children, className = '', ...props }) {
  return (
    <Card
      className={cx(
        'ui-panel [&&]:rounded-2xl [&&]:p-0 [&&]:[background:var(--panel-surface,var(--color-admin-panel))] [&&]:[border-color:var(--panel-border,var(--color-admin-line))] [&&]:[box-shadow:var(--panel-shadow,var(--shadow-admin))] [&&:hover]:[transform:none] [&&:hover]:[background:var(--panel-surface,var(--color-admin-panel))]',
        className,
      )}
      {...props}
    >
      {children}
    </Card>
  );
}
