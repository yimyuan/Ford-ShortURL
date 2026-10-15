import { Button, Icon, Input, Modal } from '../../../shared/ui/index.js';
import useAdminLinkActions from '../hooks/useAdminLinkActions.js';
import AdminLinkAddress from './AdminLinkAddress.jsx';
import AdminLinkStatus from './AdminLinkStatus.jsx';
const labels = {
  link_enable: 'เปิดใช้งานลิงก์',
  link_disable: 'ปิดใช้งานลิงก์',
  link_delete: 'ลบลิงก์ถาวร',
};
export default function AdminLinkActions({ ownerId, target, onChanged }) {
  const {
    dialog,
    detail,
    action,
    setAction,
    code,
    setCode,
    busy,
    error,
    qr,
    confirm,
    close,
    closed,
    open,
  } = useAdminLinkActions(ownerId, target, onChanged);
  return (
    <>
      <Button
        variant="info"
        className="[&&]:rounded-xl [&&]:px-3 [&&]:text-14"
        onClick={open}
        aria-label={`รายละเอียดลิงก์ ${target.shortCode}`}
      >
        รายละเอียด ⋯
      </Button>
      <Modal
        ref={dialog}
        labelledBy={`link-action-${target.id}`}
        dismissible={!busy}
        onClose={closed}
        className="[&&]:w-[min(600px,calc(100%_-_24px))] [&&_.ui-modal__body]:p-5 sm:[&&_.ui-modal__body]:p-6"
      >
        <div className="flex items-center gap-3 rounded-2xl bg-admin-sidebar px-4 py-4 text-white">
          <Icon name="link" width="24" className="shrink-0" />
          <div>
            <h2 id={`link-action-${target.id}`} className="text-20 font-semibold">
              {action ? `ยืนยัน${labels[action]}` : 'รายละเอียดลิงก์'}
            </h2>
            <p className="mt-1 font-display text-13 text-admin-sidebar-muted">{target.shortCode}</p>
          </div>
        </div>
        {!detail && !error && (
          <p role="status" className="py-8 text-center">
            กำลังโหลดรายละเอียด…
          </p>
        )}
        {detail && (
          <>
            <section
              aria-label="ข้อมูลลิงก์"
              className="mt-4 space-y-4 rounded-xl border border-admin-line bg-white p-4"
            >
              <div>
                <p className="mb-1 text-12 text-text-muted">เจ้าของลิงก์</p>
                <p className="break-all text-15 font-semibold">{detail.owner.email}</p>
              </div>
              <AdminLinkAddress link={detail.link} expanded />
              <dl className="grid grid-cols-2 gap-4 border-t border-admin-line pt-3 text-14">
                <div>
                  <dt className="mb-1 text-12 text-text-muted">สถานะ</dt>
                  <dd>
                    <AdminLinkStatus status={detail.link.status} />
                  </dd>
                </div>
                <div>
                  <dt className="mb-1 text-12 text-text-muted">จำนวนเปิด</dt>
                  <dd className="font-display text-18 font-semibold">
                    {BigInt(detail.link.clickCount).toLocaleString('th-TH')} ครั้ง
                  </dd>
                </div>
                <div>
                  <dt className="mb-1 text-12 text-text-muted">วันที่สร้าง</dt>
                  <dd>{new Date(detail.link.createdAt).toLocaleString('th-TH')}</dd>
                </div>
                <div>
                  <dt className="mb-1 text-12 text-text-muted">เปิดล่าสุด</dt>
                  <dd>
                    {detail.link.lastClickedAt
                      ? new Date(detail.link.lastClickedAt).toLocaleString('th-TH')
                      : 'ยังไม่มีการเปิด'}
                  </dd>
                </div>
              </dl>
            </section>
            {!action ? (
              <div className="mt-4 grid gap-3">
                <Button
                  variant="info"
                  className="[&&]:rounded-xl"
                  disabled={qr.loading}
                  onClick={qr.load}
                >
                  <Icon name="qr" width="18" />
                  {qr.loading ? 'กำลังสร้าง QR Code…' : 'ดู QR Code'}
                </Button>
                {qr.error && (
                  <p role="alert" className="text-14 text-warning">
                    {qr.error}
                  </p>
                )}
                {qr.image && (
                  <div className="rounded-xl border border-admin-line bg-white p-4">
                    <img
                      src={qr.image}
                      alt={`QR Code ลิงก์ ${detail.link.shortCode}`}
                      className="mx-auto aspect-square w-full max-w-60"
                    />
                    <Button
                      variant="outline"
                      href={qr.image}
                      download={`shorturl-${detail.link.shortCode}.svg`}
                      className="mt-3 w-full [&&]:rounded-xl"
                    >
                      <Icon name="download" width="17" />
                      ดาวน์โหลด QR
                    </Button>
                  </div>
                )}
                {detail.canManage ? (
                  <>
                    <Button
                      variant={detail.link.isActive ? 'warning' : 'success'}
                      className="[&&]:rounded-xl"
                      onClick={() =>
                        setAction(detail.link.isActive ? 'link_disable' : 'link_enable')
                      }
                    >
                      <Icon name={detail.link.isActive ? 'pause' : 'check'} width="18" />
                      {detail.link.isActive ? 'ปิดใช้งานลิงก์' : 'เปิดใช้งานลิงก์'}
                    </Button>
                    <Button
                      variant="danger"
                      className="[&&]:rounded-xl"
                      onClick={() => setAction('link_delete')}
                    >
                      <Icon name="trash" width="18" />
                      ลบลิงก์ถาวร
                    </Button>
                  </>
                ) : (
                  <p className="rounded-xl bg-warning-surface p-3 text-14 text-warning">
                    บัญชีหลักเท่านั้นที่จัดการลิงก์ของ Admin คนอื่นได้
                  </p>
                )}
              </div>
            ) : (
              <div className="mt-4 space-y-4 rounded-xl border border-admin-line bg-admin-soft p-4 text-15 leading-7">
                <p>
                  {action === 'link_delete'
                    ? 'ลิงก์สั้นและ QR นี้จะเปิดไม่ได้อีก ลบแล้วกู้คืนผ่านระบบไม่ได้'
                    : action === 'link_disable'
                      ? 'หยุดลิงก์สั้นและ QR นี้ชั่วคราว เปิดใช้งานกลับได้ภายหลัง'
                      : detail.owner.isActive
                        ? 'อนุญาตให้เปิดลิงก์สั้นและ QR นี้ได้อีกครั้ง'
                        : 'เปิดสถานะลิงก์ไว้ แต่เจ้าของยังถูกระงับ ลิงก์จะยังเปิดไม่ได้จนกว่าจะเปิดบัญชีเจ้าของ'}
                </p>
                {action === 'link_delete' && (
                  <label className="block">
                    พิมพ์รหัส{' '}
                    <strong className="select-all font-display">{detail.link.shortCode}</strong>{' '}
                    เพื่อยืนยัน
                    <Input
                      autoComplete="off"
                      value={code}
                      onChange={(event) => setCode(event.target.value)}
                      className="mt-2"
                    />
                  </label>
                )}
              </div>
            )}
          </>
        )}
        {error && (
          <p role="alert" className="mt-4 rounded-xl bg-warning-surface p-4 text-14 text-warning">
            {error}
          </p>
        )}
        <div className="mt-5 flex flex-wrap justify-end gap-3 border-t border-admin-line pt-4">
          <Button variant="outline" className="[&&]:rounded-xl" disabled={busy} onClick={close}>
            {action ? 'ยกเลิก' : 'ปิด'}
          </Button>
          {action && detail && (
            <Button
              variant={
                action === 'link_delete'
                  ? 'danger'
                  : action === 'link_disable'
                    ? 'warning'
                    : 'success'
              }
              className="[&&]:rounded-xl"
              onClick={confirm}
              disabled={busy || (action === 'link_delete' && code !== detail.link.shortCode)}
            >
              {busy ? 'กำลังดำเนินการ…' : `ยืนยัน${labels[action]}`}
            </Button>
          )}
        </div>
      </Modal>
    </>
  );
}
