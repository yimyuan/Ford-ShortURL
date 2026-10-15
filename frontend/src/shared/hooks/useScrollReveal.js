import { useEffect } from 'react';

export default function useScrollReveal(scope) {
  useEffect(() => {
    const root = scope.current;
    if (!root) return;
    const targets = [...root.querySelectorAll('.scroll-reveal')];
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (motion.matches || !('IntersectionObserver' in window)) return;
    const reveal = (element) => {
      element.classList.remove('reveal-pending');
      element.classList.add('is-revealed');
      observer.unobserve(element);
    };
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) if (entry.isIntersecting) reveal(entry.target);
      },
      { threshold: 0.12, rootMargin: '0px 0px -24px 0px' },
    );
    for (const target of targets) {
      if (!target.classList.contains('is-revealed')) {
        target.classList.add('reveal-pending');
        observer.observe(target);
      }
    }
    // Keyboard navigation should never leave a focused control invisible.
    const onFocus = (event) => {
      const target = event.target.closest('.scroll-reveal');
      if (target) reveal(target);
    };
    const onMotionChange = () => {
      if (motion.matches) targets.forEach(reveal);
    };
    root.addEventListener('focusin', onFocus);
    motion.addEventListener('change', onMotionChange);
    return () => {
      observer.disconnect();
      root.removeEventListener('focusin', onFocus);
      motion.removeEventListener('change', onMotionChange);
      targets.forEach((target) => target.classList.remove('reveal-pending'));
    };
  }, [scope]);
}
