export default function Brand({ href = '#/', label = 'ShortURL หน้าแรก' }) {
  return (
    <a
      className="
      brand inline-flex items-center gap-(--space-16) w-fit whitespace-nowrap font-display text-28
      font-bold tracking-[-1px] leading-[1.3] max-[1200px]:text-25 max-[600px]:text-23
      max-[600px]:gap-(--space-12)
     "
      href={href}
      aria-label={label}
    >
      <span
        className="
      brand-mark grid place-items-center w-12 h-14 [font-family:Arial,sans-serif] text-58 font-black
      italic leading-[1] [transform:skew(-10deg)] tracking-[-4px] pr-(--space-5) max-[600px]:text-47
      max-[600px]:w-9 max-[600px]:h-12
     "
        aria-hidden="true"
      >
        F
      </span>
      <span>
        ShortURL<span className="brand-dot text-accent-muted">.</span>
      </span>
    </a>
  );
}
