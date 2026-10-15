import { useState } from 'react';
import { Icon } from '../../../shared/ui/index.js';
export default function AdminLinkAddress({ link, expanded = false }) {
  const [notice, setNotice] = useState('');
  async function copy() {
    try {
      await navigator.clipboard.writeText(link.shortUrl);
      setNotice('คัดลอกแล้ว');
    } catch {
      setNotice('คัดลอกไม่ได้ กรุณาเลือกข้อความลิงก์');
    }
  }
  return (
    <div className="min-w-0 space-y-2">
      <div className="flex items-start gap-2">
        <a
          href={link.shortUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="min-w-0 break-all font-display text-15 font-semibold text-admin-heading-text hover:underline"
        >
          {link.shortUrl}
        </a>
        <button
          onClick={copy}
          title="คัดลอกลิงก์สั้น"
          aria-label={`คัดลอก ${link.shortCode}`}
          className="shrink-0 rounded-lg border border-admin-line bg-admin-soft p-1.5 text-info hover:bg-admin-heading"
        >
          <Icon name="copy" width="15" height="15" />
        </button>
      </div>
      <a
        href={link.originalUrl}
        target="_blank"
        rel="noopener noreferrer"
        title={link.originalUrl}
        aria-label={`เปิดลิงก์ต้นฉบับ ${link.originalUrl}`}
        className="inline-flex max-w-full items-start gap-1.5 font-display text-13 text-info underline decoration-info/30 underline-offset-4 hover:decoration-info"
      >
        <Icon name="external" width="14" height="14" className="mt-1 shrink-0" />
        <span
          className={expanded ? 'break-all' : 'block max-w-[240px] truncate sm:max-w-[280px]'}
        >
          {link.originalUrl}
        </span>
      </a>
      {notice && (
        <p className="text-12 text-text-muted" role="status">
          {notice}
        </p>
      )}
    </div>
  );
}
