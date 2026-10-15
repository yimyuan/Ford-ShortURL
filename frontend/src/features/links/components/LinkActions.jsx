import { useState } from 'react';
import { Button, Icon } from '../../../shared/ui/index.js';
import QrDesigner from './QrDesigner.jsx';

export default function LinkActions({ link }) {
  const [notice, setNotice] = useState('');
  const [showDesigner, setShowDesigner] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(link.shortUrl);
      setNotice('คัดลอกลิงก์แล้ว');
    } catch {
      setNotice('คัดลอกอัตโนมัติไม่ได้ กรุณาคัดลอกจากลิงก์สั้นด้านบน');
    }
  }
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          className="[&&]:min-h-10 [&&]:rounded-xl [&&]:px-4 [&&]:py-2 [&&]:text-12"
          onClick={copy}
        >
          <Icon name="copy" width="16" />
          คัดลอก
        </Button>
        <Button
          variant="outline"
          className="[&&]:min-h-10 [&&]:rounded-xl [&&]:px-4 [&&]:py-2 [&&]:text-12"
          onClick={() => setShowDesigner(true)}
        >
          <Icon name="qr" width="17" />
          QR Code
        </Button>
      </div>
      {notice && (
        <p className="mt-2 text-12 leading-7 text-text-secondary" role="status">
          {notice}
        </p>
      )}
      {showDesigner && <QrDesigner link={link} onClose={() => setShowDesigner(false)} />}
    </>
  );
}
