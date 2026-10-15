export function createDialogMotion(
  node,
  {
    reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    readStyle = () => getComputedStyle(node),
  } = {},
) {
  let closing = null;
  function cancel() {
    const pending = closing;
    closing = null;
    pending?.animation.cancel();
    delete node.dataset.closing;
  }
  function close() {
    if (!node.open) return Promise.resolve();
    if (closing) return closing.promise;
    if (reducedMotion() || typeof node.animate !== 'function') {
      node.close();
      return Promise.resolve();
    }
    node.dataset.closing = 'true';
    const style = readStyle();
    const animation = node.animate(
      [
        { opacity: style.opacity, transform: style.transform },
        { opacity: 0, transform: 'translateY(8px) scale(0.985)' },
      ],
      {
        duration: parseFloat(style.getPropertyValue('--motion-dialog-exit')) || 160,
        easing: 'ease-in',
        fill: 'forwards',
      },
    );
    const pending = { animation, promise: null };
    closing = pending;
    pending.promise = animation.finished
      .catch(() => {})
      .then(() => {
        if (closing !== pending) return;
        closing = null;
        if (node.open) node.close();
        animation.cancel();
        delete node.dataset.closing;
      });
    return pending.promise;
  }
  return { close, cancel };
}
