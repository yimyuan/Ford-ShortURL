import { Card, CardTitle, CardDescription, Icon, cx } from '../../../shared/ui/index.js';
const features = [
  {
    icon: 'bolt',
    title: 'ลิงก์สั้น ในพริบตา',
    text: 'เปลี่ยน URL ยาวให้สั้นกระชับ พร้อมส่งต่อได้ง่ายกว่าเดิม',
  },
  {
    icon: 'qr',
    title: 'แชร์ได้ด้วย QR Code',
    text: 'จากหน้าจอสู่โลกจริง สแกนครั้งเดียวก็ไปถึงปลายทาง',
  },
  {
    icon: 'history',
    title: 'ทุกลิงก์ อยู่ที่เดียว',
    text: 'ย้อนดูลิงก์ที่เคยสร้าง จัดการและหยิบมาแชร์ได้ทุกเมื่อ',
  },
  {
    icon: 'chart',
    title: 'รู้ทุกการเปิดลิงก์',
    text: 'ดูจำนวนครั้งที่เปิดลิงก์ ติดตามผลการแชร์ของคุณ',
  },
];
export default function HomeFeatures() {
  return (
    <section className="features-section min-w-0" aria-label="คุณสมบัติ ShortURL">
      <div
        className={cx(
          'section-caption flex justify-end mb-(--space-18) text-text-secondary font-display text-10 tracking-[2px] leading-[1.8] font-semibold max-[600px]:text-9 max-[600px]:tracking-[1.5px] max-[600px]:mb-(--space-18) max-[600px]:justify-start',
          'scroll-reveal',
        )}
      >
        <span>BUILT FOR EVERY CONNECTION</span>
      </div>
      <div
        className="
      feature-grid grid grid-cols-[repeat(4,minmax(0,1fr))] gap-(--space-22) items-stretch
      max-[1200px]:gap-(--space-16) max-[960px]:grid-cols-[repeat(2,minmax(0,1fr))]
      max-[600px]:gap-(--space-14) max-[380px]:grid-cols-[minmax(0,1fr)]
     "
      >
        {features.map((feature, index) => (
          <Card className="scroll-reveal" style={{ '--reveal-order': index }} key={feature.icon}>
            <div
              className="
      feature-top flex items-center justify-between gap-(--space-16) mb-(--space-22) [&>span]:font-display
      [&>span]:text-11 [&>span]:tracking-[1px] [&>span]:text-text-muted max-[600px]:mb-(--space-18)
     "
            >
              <Icon name={feature.icon} width="30" height="30" />
              <span>0{index + 1}</span>
            </div>
            <CardTitle>{feature.title}</CardTitle>
            <CardDescription>{feature.text}</CardDescription>
          </Card>
        ))}
      </div>
    </section>
  );
}
