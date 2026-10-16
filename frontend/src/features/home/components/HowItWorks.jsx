import { Button, Icon, cx } from '../../../shared/ui/index.js';
export default function HowItWorks({ urlInput }) {
  return (
    <section
      className="
      how-section p-[var(--space-88)_0] [background:var(--color-section)]
      [border-top:1px_solid_var(--color-white)] max-[600px]:p-[var(--space-58)_0]
     "
      id="how-it-works"
      aria-labelledby="how-title"
    >
      <div
        className="
      how-inner w-[min(1360px,calc(100%_-_96px))] mx-[auto] [&_h2]:text-32 [&_h2]:font-semibold
      [&_h2]:leading-[1.7] [&_h2]:m-[var(--space-20)_0_var(--space-40)] max-[1200px]:w-[calc(100%_-_64px)]
      max-[960px]:[&_h2]:text-29 max-[600px]:w-[calc(100%_-_40px)] max-[600px]:[&_h2]:text-26
      max-[600px]:[&_h2]:leading-[1.8] max-[600px]:[&_h2]:mb-(--space-28)
     "
      >
        <span
          className={cx(
            'eyebrow flex items-center gap-(--space-12) font-display text-11 font-semibold tracking-[2.5px] leading-[1.8] text-text-muted flex-wrap [&>span]:w-[6px] [&>span]:h-[6px] [&>span]:[background:var(--color-accent-muted)] [&>span]:rounded-full [&>span]:[box-shadow:0_0_0_4px_var(--color-accent-halo)] [&>span]:shrink-0 max-[600px]:text-10 max-[600px]:tracking-[1.4px] max-[600px]:gap-(--space-9) max-[380px]:text-9 max-[380px]:tracking-[1px]',
            'scroll-reveal',
          )}
        >
          THREE STEPS. ONE SHORT LINK.
        </span>
        <h2 id="how-title" className="scroll-reveal">
          จากลิงก์ยาว สู่การแชร์ที่ง่ายขึ้น
        </h2>
        <div
          className="
      how-grid grid grid-cols-[repeat(3,minmax(0,1fr))] gap-(--space-40) mb-(--space-38)
      [&_article]:min-w-0 [&_article]:[border-top:1px_solid_var(--color-border)]
      [&_article]:pt-(--space-22) [&_article>span]:font-display [&_article>span]:text-12
      [&_article>span]:text-text-muted [&_article>span]:tracking-[2px] [&_h3]:text-19 [&_h3]:leading-[1.8]
      [&_h3]:font-semibold [&_h3]:m-[var(--space-12)_0_var(--space-8)] [&_p]:text-15 [&_p]:leading-[1.95]
      [&_p]:text-text-secondary max-[960px]:gap-(--space-24) max-[600px]:grid-cols-[1fr]
      max-[600px]:gap-(--space-24) max-[600px]:[&_article]:grid
      max-[600px]:[&_article]:grid-cols-[32px_minmax(0,1fr)] max-[600px]:[&_article]:gap-x-(--space-12)
      max-[600px]:[&_article]:pt-(--space-20) max-[600px]:[&_article>span]:row-span-2
      max-[600px]:[&_article>span]:pt-(--space-5) max-[600px]:[&_h3]:m-[0_0_var(--space-8)]
      max-[600px]:[&_h3]:text-18 max-[600px]:[&_p]:col-start-2 max-[600px]:[&_p]:text-15
     "
        >
          {[
            ['01', 'วางลิงก์ของคุณ', 'คัดลอก URL ปลายทาง แล้ววางลงในช่องสร้างลิงก์'],
            [
              '02',
              'เลือกชื่อแล้วยืนยัน',
              'เข้าสู่ระบบ เลือกตั้งชื่อลิงก์เองหรือใช้ชื่อสุ่ม แล้วยืนยันสร้างลิงก์',
            ],
            ['03', 'พร้อมส่งต่อ', 'คัดลอกลิงก์สั้น แชร์ QR Code และดูสถิติได้จากลิงก์ของฉัน'],
          ].map(([number, title, text]) => (
            <article
              className="scroll-reveal"
              style={{ '--reveal-order': Number(number) - 1 }}
              key={number}
            >
              <span>{number}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
        <Button
          className="scroll-reveal"
          href="#/#shorten"
          onClick={() => urlInput.current.focus()}
        >
          เริ่มสร้างลิงก์ <Icon name="arrow" width="18" />
        </Button>
      </div>
    </section>
  );
}
