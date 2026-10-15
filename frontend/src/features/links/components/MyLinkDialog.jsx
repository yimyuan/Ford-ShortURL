import { useEffect, useId, useRef, useState } from 'react';
import { Button, Icon, IconButton, Modal } from '../../../shared/ui/index.js';
import { getLink } from '../api.js';
import { linkErrorMessage } from '../link-errors.js';
import LinkActions from './LinkActions.jsx';
export default function MyLinkDialog({ id, onClose }) {
  const dialog = useRef(null);
  const title = useId();
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState({ loading: true, link: null, error: '' });
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setState({ loading: true, link: null, error: '' });
    getLink(id, { signal: controller.signal })
      .then((link) => {
        if (!controller.signal.aborted) setState({ loading: false, link, error: '' });
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setState({ loading: false, link: null, error: linkErrorMessage(error) });
      });
    return () => controller.abort();
  }, [id, revision]);
  const link = state.link;
  const date = (value) =>
    value
      ? new Date(value).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })
      : 'ยังไม่มีการเปิด';
  return (
    <Modal
      ref={dialog}
      labelledBy={title}
      onClose={onClose}
      className="[&&]:w-[min(600px,calc(100%_-_32px))] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 id={title} className="text-25 font-semibold">
            จัดการลิงก์
          </h2>
          <p className="mt-1 text-13 text-text-muted">รายละเอียดและเครื่องมือสำหรับลิงก์นี้</p>
        </div>
        <IconButton
          icon="close"
          label="ปิดรายละเอียดลิงก์"
          onClick={() => dialog.current?.close()}
        />
      </div>
      {state.loading ? (
        <p role="status" className="py-10 text-center text-14 text-text-muted">
          กำลังโหลดข้อมูลลิงก์…
        </p>
      ) : state.error ? (
        <div role="alert" className="rounded-xl bg-warning-surface p-5 text-14 text-warning">
          {state.error}
          <Button
            variant="outline"
            onClick={() => setRevision((value) => value + 1)}
            className="mt-4 [&&]:text-13"
          >
            ลองอีกครั้ง
          </Button>
        </div>
      ) : (
        link && (
          <>
            <div className="mb-6 flex items-center justify-between gap-4 rounded-2xl border border-admin-line bg-admin-soft p-5">
              <div>
                <p className="text-13 text-text-secondary">ยอดเปิดลิงก์</p>
                <p className="mt-2 break-all text-36 font-semibold tabular-nums">
                  {BigInt(link.clickCount).toLocaleString('th-TH')}{' '}
                  <span className="text-14 font-normal text-text-muted">ครั้ง</span>
                </p>
              </div>
              <Icon name="chart" width="28" className="shrink-0 text-text-secondary" />
            </div>
            <p className="mb-2 text-14 font-semibold">ลิงก์สั้น</p>
            <a
              href={link.shortUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-admin-line bg-white p-4 text-15 font-medium text-text-secondary hover:bg-admin-soft"
            >
              <span className="min-w-0 break-all">{link.shortUrl}</span>
              <Icon name="external" width="17" />
            </a>
            <p className="mb-2 text-14 font-semibold">ลิงก์ต้นฉบับ</p>
            <a
              href={link.originalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block break-all text-14 leading-7 text-text-muted hover:text-text"
            >
              {link.originalUrl}
            </a>
            <dl className="my-6 grid grid-cols-1 gap-4 rounded-xl border border-admin-line p-4 text-13 sm:grid-cols-2">
              {[
                ['สร้างเมื่อ', date(link.createdAt)],
                ['เปิดล่าสุด', date(link.lastClickedAt)],
                ['สถานะ', link.isActive === false ? 'ปิดใช้งาน' : 'เปิดใช้งาน'],
                ['ชื่อลิงก์', 'สร้างแล้วเปลี่ยนชื่อไม่ได้'],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-12 text-text-muted">{label}</dt>
                  <dd className="mt-1 text-text-secondary">{value}</dd>
                </div>
              ))}
            </dl>
            <div className="border-t border-admin-line pt-5">
              <LinkActions link={link} />
            </div>
          </>
        )
      )}
    </Modal>
  );
}
