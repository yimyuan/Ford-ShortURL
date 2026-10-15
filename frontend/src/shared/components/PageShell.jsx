import { Brand, Card } from '../ui/index.js';
export default function PageShell({ title, children }) {
  return (
    <main className="page-shell w-[min(760px,calc(100%_-_40px))] m-[12vh_auto]">
      <Brand />
      <Card
        as="section"
        className="
      page-shell__content mt-(--space-32) [&_h1]:text-32 [&_h1]:leading-[1.7] [&_h1]:mb-(--space-16)
      [&_p]:text-text-secondary [&_p]:leading-[1.95]
     "
      >
        <h1>{title}</h1>
        {children}
      </Card>
    </main>
  );
}
