import { cx } from '../../../shared/ui/index.js';
export default function HomeFooter() {
  return (
    <footer
      className={cx(
        'landing-footer mt-auto flex justify-between items-center gap-(--space-16) flex-wrap p-[0_0_var(--space-28)] text-text-secondary font-display text-12 leading-[1.8] [&>span:last-child]:flex [&>span:last-child]:items-center [&>span:last-child]:gap-(--space-12) max-[960px]:pb-(--space-28) max-[600px]:text-11 max-[600px]:gap-(--space-8) max-[380px]:items-start max-[380px]:flex-col',
        'scroll-reveal',
      )}
    >
      <span>© {new Date().getFullYear()} ShortURL</span>
      <span>
        Less length. More possibility. <span className="footer-spark text-23 leading-[1]">✳</span>
      </span>
    </footer>
  );
}
