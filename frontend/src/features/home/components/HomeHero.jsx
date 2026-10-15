import { Button, Icon, Input, cx } from '../../../shared/ui/index.js';
export default function HomeHero({ model }) {
  const {
    url,
    setUrl,
    namingOpen,
    error,
    setError,
    setResult,
    creating,
    shorten,
    urlInput,
    accountNotice,
  } = model;
  return (
    <section
      className="
      hero pt-[clamp(var(--space-24),3.2vw,var(--space-52))] pb-(--space-8) [flex:0_0_auto] min-w-0
      [&_h1]:font-display [&_h1]:[font-size:clamp(56px,6.3vw,96px)] [&_h1]:tracking-[-3.5px]
      [&_h1]:leading-[1.17] [&_h1]:font-semibold [&_h1]:m-[var(--space-24)_0] [&_h1>span]:block
      [&_h1>span]:w-fit [&_h1>span]:pr-[.08em] [&_h1>span]:text-text-display-muted
      max-[960px]:p-[var(--space-50)_0_var(--space-42)]
      max-[960px]:[&_h1]:[font-size:clamp(52px,8.6vw,78px)] max-[960px]:[&_h1]:tracking-[-2.5px]
      max-[600px]:p-[var(--space-44)_0_var(--space-24)]
      max-[600px]:[&_h1]:[font-size:clamp(38px,9.9vw,58px)] max-[600px]:[&_h1]:tracking-[-1.6px]
      max-[600px]:[&_h1]:leading-[1.22] max-[600px]:[&_h1]:my-(--space-24) max-[380px]:[&_h1]:text-36
     "
      aria-labelledby="hero-title"
    >
      <div
        className={cx(
          'eyebrow flex items-center gap-(--space-12) font-display text-11 font-semibold tracking-[2.5px] leading-[1.8] text-text-muted flex-wrap [&>span]:w-[6px] [&>span]:h-[6px] [&>span]:[background:var(--color-accent-muted)] [&>span]:rounded-full [&>span]:[box-shadow:0_0_0_4px_var(--color-accent-halo)] [&>span]:shrink-0 max-[600px]:text-10 max-[600px]:tracking-[1.4px] max-[600px]:gap-(--space-9) max-[380px]:text-9 max-[380px]:tracking-[1px]',
          'scroll-reveal',
        )}
      >
        <span /> SIMPLE LINKS. BIG POSSIBILITIES.
      </div>
      <h1 id="hero-title" className="scroll-reveal" style={{ '--reveal-order': 1 }}>
        Shorten Links.<span>Go Further.</span>
      </h1>
      <p
        className={cx(
          'hero-description text-text-secondary text-19 leading-[1.95] mb-(--space-32) max-w-[650px] max-[600px]:text-16 max-[600px]:leading-[2] max-[600px]:mb-(--space-28)',
          'scroll-reveal',
        )}
        style={{ '--reveal-order': 2 }}
      >
        ทุกลิงก์ยาว มีทางลัดที่ดีกว่า
        <br />
        ย่อ แชร์ และติดตามทุกการคลิก ในที่เดียว
      </p>
      <form
        id="shorten-form"
        style={{ '--reveal-order': 3 }}
        className={cx(
          'shorten-form flex items-center gap-(--space-18) w-[min(800px,78%)] min-w-0 min-h-21 p-[var(--space-10)_var(--space-10)_var(--space-10)_var(--space-26)] [border:1px_solid_var(--color-border-glass)] [outline:3px_solid_var(--color-outline-glass)] rounded-48 [background:linear-gradient(120deg,var(--color-surface-glass-start),var(--color-surface-glass-end))] [backdrop-filter:blur(var(--blur-glass))] [box-shadow:0_8px_35px_var(--color-glass-shadow),inset_0_1px_1px_var(--color-white)] [&:focus-within]:[outline-color:var(--color-focus-glass)] [&:focus-within]:[box-shadow:0_0_0_6px_var(--color-focus-halo)] [&.has-error]:[outline-color:var(--color-danger-border)] max-[1200px]:w-[min(780px,88%)] max-[960px]:w-full max-[600px]:grid max-[600px]:grid-cols-[24px_minmax(0,1fr)] max-[600px]:gap-[var(--space-10)_var(--space-12)] max-[600px]:p-(--space-16) max-[600px]:rounded-24 max-[600px]:min-h-0 [&_.ui-input:focus-visible]:outline-none',
          'scroll-reveal',
          error && 'has-error',
        )}
        onSubmit={shorten}
        autoComplete="off"
        noValidate
      >
        <label className="sr-only" htmlFor="long-url">
          URL ที่ต้องการย่อ
        </label>
        <Icon name="link" className="input-link-icon text-text-secondary overflow-visible" />
        <Input
          variant="plain"
          ref={urlInput}
          id="long-url"
          type="url"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          className="border-0! outline-none! shadow-none!"
          placeholder="วางลิงก์ยาวของคุณที่นี่…"
          value={url}
          disabled={creating}
          onChange={(e) => {
            setUrl(e.target.value);
            setError('');
            setResult(null);
          }}
          aria-invalid={!!error}
          aria-describedby={error ? 'url-error' : undefined}
          required
        />
        <Button
          type="submit"
          disabled={creating}
          className="
      shorten-button [&&]:min-h-15 [&&]:min-w-[166px] [&&]:text-16 max-[600px]:[&&]:col-span-full
      max-[600px]:[&&]:min-w-0 max-[600px]:[&&]:w-full max-[600px]:[&&]:min-h-13 max-[600px]:[&&]:text-16
     "
        >
          {creating ? 'กำลังสร้าง…' : 'สร้างลิงก์'} <Icon name="arrow" width="21" />
        </Button>
      </form>
      {error && !namingOpen && (
        <p
          className="url-error text-13 leading-[1.9] mt-(--space-16) text-danger max-w-[800px]"
          id="url-error"
          role="alert"
        >
          {error}
        </p>
      )}
      {accountNotice && (
        <p className="mt-4 max-w-[800px] text-13 leading-8 text-text-secondary" role="status">
          {accountNotice}
        </p>
      )}
    </section>
  );
}
