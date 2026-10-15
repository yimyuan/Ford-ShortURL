import { Button, Icon, IconButton, Input, Modal } from '../../../shared/ui/index.js';

export default function CreateLinkDialog({ model }) {
  const {
    nameDialog,
    nameError,
    setNameError,
    error,
    setError,
    url,
    customCode,
    setCustomCode,
    creating,
    confirmCreate,
    closeNameDialog,
  } = model;
  const notice = nameError || error;
  return (
    <Modal
      ref={nameDialog}
      labelledBy="create-link-title"
      dismissible={!creating}
      onClose={closeNameDialog}
      className="[&&]:w-[min(560px,calc(100%_-_32px))]"
    >
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <span className="mb-3 inline-flex rounded-xl bg-admin-soft p-3 text-text-secondary">
            <Icon name="link" />
          </span>
          <h2 id="create-link-title" className="text-25 font-semibold">
            สร้างลิงก์ของคุณ
          </h2>
          <p className="mt-2 text-14 leading-7 text-text-muted">
            เลือกชื่อที่ต้องการ หรือให้ระบบสุ่มชื่อให้
          </p>
        </div>
        <IconButton
          icon="close"
          label="ปิดหน้าต่างสร้างลิงก์"
          disabled={creating}
          onClick={() => nameDialog.current?.close()}
        />
      </div>
      <div className="mb-6 rounded-xl border border-admin-line bg-admin-soft px-4 py-3">
        <p className="mb-1 text-12 text-text-muted">ลิงก์ต้นฉบับ</p>
        <p className="break-all text-14 leading-7 text-text-secondary">{url}</p>
      </div>
      <form onSubmit={confirmCreate} noValidate autoComplete="off">
        <label htmlFor="custom-code" className="mb-2 block text-15 font-semibold">
          ชื่อลิงก์
        </label>
        <div className="flex min-w-0 items-center gap-3 rounded-xl border border-admin-line bg-white px-4 focus-within:border-text-secondary">
          <span className="shrink-0 text-14 text-text-muted">/r/</span>
          <Input
            id="custom-code"
            variant="plain"
            value={customCode}
            maxLength={40}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            disabled={creating}
            placeholder="เว้นว่างเพื่อสุ่มชื่อ"
            aria-invalid={!!notice}
            aria-describedby={`custom-code-help${notice ? ' create-link-error' : ''}`}
            className="border-0! outline-none! shadow-none!"
            onChange={(event) => {
              setCustomCode(event.target.value);
              setNameError('');
              setError('');
            }}
          />
        </div>
        <div className="mt-2 flex items-start justify-between gap-3">
          <p id="custom-code-help" className="text-12 leading-6 text-text-muted">
            3–40 ตัว ใช้ A–Z, a–z, 0–9 และ -<br />
            ตัวพิมพ์เล็กและใหญ่ถือเป็นคนละชื่อ
          </p>
          <button
            type="button"
            disabled={creating}
            className="shrink-0 rounded-lg px-2 py-1 text-13 font-semibold text-text-secondary hover:bg-admin-soft disabled:opacity-50"
            onClick={() => {
              setCustomCode('');
              setNameError('');
              setError('');
            }}
          >
            ใช้ชื่อสุ่ม
          </button>
        </div>
        <p className="mt-5 flex items-start gap-2 rounded-xl bg-warning-surface px-4 py-3 text-13 leading-6 text-warning">
          <Icon name="key" width="18" /> สร้างแล้วจะเปลี่ยนชื่อลิงก์ไม่ได้ กรุณาตรวจสอบก่อนยืนยัน
        </p>
        {notice && (
          <p id="create-link-error" role="alert" className="mt-4 text-14 leading-7 text-danger">
            {notice}
          </p>
        )}
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={creating}
            onClick={() => nameDialog.current?.close()}
          >
            ยกเลิก
          </Button>
          <Button type="submit" disabled={creating}>
            {creating ? 'กำลังสร้าง…' : 'ยืนยันสร้างลิงก์'} <Icon name="arrow" width="18" />
          </Button>
        </div>
      </form>
    </Modal>
  );
}
