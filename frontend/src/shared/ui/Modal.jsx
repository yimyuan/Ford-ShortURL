import { cx } from './classNames.js';
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { lockScroll } from './scroll-lock.js';
import { createDialogMotion } from './dialog-motion.js';
const Modal = forwardRef(function Modal(
  { labelledBy, className = '', children, onClose, dismissible = true },
  ref,
) {
  const element = useRef(null);
  const releaseScroll = useRef(null);
  const motion = useRef(null);
  function cancelClosing() {
    motion.current?.cancel();
  }
  function close() {
    if (!element.current) return Promise.resolve();
    if (!motion.current) motion.current = createDialogMotion(element.current);
    return motion.current.close();
  }
  const unlock = () => {
    releaseScroll.current?.();
    releaseScroll.current = null;
  };
  useImperativeHandle(
    ref,
    () => ({
      showModal() {
        cancelClosing();
        if (!element.current.open) element.current.showModal();
        if (!releaseScroll.current) releaseScroll.current = lockScroll(document.body);
      },
      close,
    }),
    [],
  );
  useEffect(
    () => () => {
      cancelClosing();
      unlock();
    },
    [],
  );
  return (
    <dialog
      ref={element}
      className={cx(
        'ui-modal w-[min(480px,calc(100%_-_32px))] max-h-[calc(100svh_-_32px)] p-0 m-auto overflow-auto [border:1px_solid_var(--color-surface-glass-start)] rounded-28 [background:var(--color-dialog)] [box-shadow:0_25px_100px_var(--color-dialog-shadow)] text-text [&::backdrop]:[background:var(--color-backdrop)] [&::backdrop]:[backdrop-filter:blur(10px)]',
        className,
      )}
      aria-labelledby={labelledBy}
      onCancel={(event) => {
        event.stopPropagation();
        event.preventDefault();
        if (dismissible) close();
      }}
      onClose={(event) => {
        event.stopPropagation();
        unlock();
        onClose?.(event);
      }}
      onClick={(event) => {
        if (dismissible && event.target === element.current) close();
      }}
    >
      <div
        className="
      ui-modal__body p-(--space-36) relative min-w-0 max-[600px]:p-[var(--space-32)_var(--space-24)]
      max-[380px]:p-[var(--space-30)_var(--space-20)]
     "
      >
        {children}
      </div>
    </dialog>
  );
});
export default Modal;
