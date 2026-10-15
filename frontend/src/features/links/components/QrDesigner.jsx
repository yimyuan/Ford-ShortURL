import { useEffect, useId, useRef } from 'react';
import { Button, Icon, IconButton, Modal } from '../../../shared/ui/index.js';
import { defaultQrStyle } from '../qr-style.js';
import useQrDesigner from '../hooks/useQrDesigner.js';

export default function QrDesigner({ link, onClose }) {
  const dialog = useRef(null);
  const title = useId();
  const model = useQrDesigner(link);
  const {
    draft,
    ready,
    error,
    notice,
    validation,
    warning,
    preview,
    confirming,
    setConfirming,
    saving,
    downloading,
    change,
    save,
    download,
    dirty,
    reload,
  } = model;
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  const locked = !ready || saving || confirming;
  return (
    <Modal
      ref={dialog}
      labelledBy={title}
      onClose={onClose}
      dismissible={!saving}
      className="[&&]:w-[min(900px,calc(100%_-_32px))] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-11 font-semibold tracking-[2px] text-text-muted">MAKE IT YOURS</p>
          <h2 id={title} className="text-25 font-semibold">
            ตกแต่ง QR Code
          </h2>
          <p className="mt-2 break-all text-13 text-text-secondary">{link.shortUrl}</p>
        </div>
        <IconButton
          icon="close"
          label="ปิดหน้าต่าง QR"
          disabled={saving}
          onClick={() => dialog.current?.close()}
        />
      </div>
      {!ready ? (
        <div className="rounded-2xl bg-admin-soft p-8 text-center">
          {error ? (
            <>
              <p role="alert" className="mb-4 text-14 text-danger">
                {error}
              </p>
              <Button variant="outline" onClick={reload}>
                โหลดอีกครั้ง
              </Button>
            </>
          ) : (
            <p role="status" className="text-14">
              กำลังโหลดแบบ QR…
            </p>
          )}
        </div>
      ) : (
        <>
          <div className="grid gap-7 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="min-w-0 rounded-2xl border border-admin-line bg-admin-soft p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-12">
                <span className="font-semibold text-text-secondary">ตัวอย่าง QR</span>
                <span className="rounded-full bg-white px-3 py-1 text-text-muted">
                  {draft.size} × {draft.size} px
                </span>
              </div>
              <div className="flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-admin-line bg-white p-3">
                {validation ? (
                  <p className="p-4 text-center text-13 leading-7 text-warning">
                    ปรับสีให้เหมาะสมเพื่อแสดงตัวอย่าง
                  </p>
                ) : preview.image ? (
                  <img
                    src={preview.image}
                    alt={`ตัวอย่าง QR สำหรับ ${link.shortUrl}`}
                    className="aspect-square h-full w-full object-contain"
                  />
                ) : (
                  <p role="status" className="p-4 text-center text-13 text-text-muted">
                    {preview.error || 'กำลังสร้างตัวอย่าง…'}
                  </p>
                )}
              </div>
              {preview.error && (
                <button
                  type="button"
                  className="mt-3 text-13 underline"
                  onClick={() => preview.load()}
                >
                  ลองสร้างตัวอย่างอีกครั้ง
                </button>
              )}
              <p className="mt-4 text-12 leading-6 text-text-muted">
                รักษาขอบว่างรอบ QR ไว้เสมอ และลองสแกนก่อนนำไปพิมพ์
              </p>
            </div>
            <div className="min-w-0">
              <fieldset disabled={locked} className="m-0 min-w-0 border-0 p-0 disabled:opacity-60">
                <legend className="mb-3 text-15 font-semibold">รูปแบบจุด</legend>
                <div className="mb-2 grid grid-cols-3 gap-2">
                  {[
                    ['square', 'สี่เหลี่ยม'],
                    ['rounded', 'มุมมน'],
                    ['dots', 'วงกลม'],
                  ].map(([shape, label]) => (
                    <button
                      key={shape}
                      type="button"
                      aria-pressed={draft.shape === shape}
                      onClick={() => change({ shape })}
                      className="flex flex-col items-center gap-2 rounded-xl border border-admin-line px-2 py-3 text-13 hover:bg-admin-soft aria-pressed:border-text-secondary aria-pressed:bg-admin-soft"
                    >
                      <span className="grid grid-cols-3 gap-1" aria-hidden="true">
                        {Array.from({ length: 9 }, (_, index) => (
                          <span
                            key={index}
                            className={`h-2 w-2 bg-text-secondary ${shape === 'dots' ? 'rounded-full' : shape === 'rounded' ? 'rounded-[2px]' : ''}`}
                          />
                        ))}
                      </span>
                      {label}
                    </button>
                  ))}
                </div>
                <p className="mb-5 text-12 leading-6 text-text-muted">
                  กรอบมุมและจุดสำคัญของ QR คงรูปแบบเดิมเพื่อช่วยให้สแกนง่าย
                </p>
                <div className="mb-5 grid grid-cols-2 gap-3">
                  {[
                    ['dark', 'สีจุด QR'],
                    ['light', 'สีพื้นหลัง'],
                  ].map(([key, label]) => (
                    <label key={key} className="text-14 font-medium">
                      {label}
                      <span className="mt-2 flex items-center gap-2 rounded-xl border border-admin-line bg-white p-2">
                        <input
                          type="color"
                          value={draft[key]}
                          onChange={(event) => change({ [key]: event.target.value })}
                          className="h-9 w-10 shrink-0 cursor-pointer rounded-md border-0 bg-transparent p-0"
                        />
                        <span className="text-12 font-normal text-text-muted">
                          {draft[key].toUpperCase()}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
                <label className="block text-14 font-medium" htmlFor={`${title}-size`}>
                  ขนาดดาวน์โหลด PNG
                </label>
                <select
                  id={`${title}-size`}
                  value={draft.size}
                  onChange={(event) => change({ size: Number(event.target.value) })}
                  className="mt-2 w-full rounded-xl border border-admin-line bg-white px-3 py-3 text-14"
                >
                  {[256, 512, 1024].map((size) => (
                    <option key={size} value={size}>
                      {size} × {size} px
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => change({ ...defaultQrStyle })}
                  className="mt-4 inline-flex items-center gap-2 text-13 font-medium text-text-secondary hover:underline"
                >
                  <Icon name="refresh" width="15" /> คืนค่าเริ่มต้น
                </button>
              </fieldset>
              {(validation || warning) && (
                <p
                  role="alert"
                  className="mt-4 rounded-xl bg-warning-surface p-3 text-13 leading-6 text-warning"
                >
                  {validation || warning}
                </p>
              )}
              <div className="mt-6 border-t border-admin-line pt-5">
                <p className="mb-3 text-12 leading-6 text-text-muted">
                  ดาวน์โหลดตามแบบที่เห็น{dirty ? ' · ยังไม่ได้บันทึกแบบนี้' : ''}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {['png', 'svg'].map((format) => (
                    <Button
                      key={format}
                      variant="outline"
                      disabled={
                        !!validation || !!downloading || saving || !preview.image || preview.loading
                      }
                      onClick={() => download(format)}
                      className="[&&]:min-w-0 [&&]:rounded-xl [&&]:px-3 [&&]:text-13"
                    >
                      <Icon name="download" width="16" />{' '}
                      {downloading === format ? 'กำลังโหลด…' : format.toUpperCase()}
                    </Button>
                  ))}
                </div>
                <p className="mt-2 text-11 text-text-muted">SVG ขยายได้โดยไม่เสียความคมชัด</p>
              </div>
            </div>
          </div>
          {error && (
            <div
              role="alert"
              className="mt-5 rounded-xl bg-warning-surface p-4 text-13 leading-7 text-warning"
            >
              {error}
              <button
                type="button"
                disabled={saving}
                onClick={reload}
                className="ml-2 font-semibold underline"
              >
                โหลดแบบล่าสุด
              </button>
            </div>
          )}
          {notice && (
            <p
              role="status"
              className="mt-5 rounded-xl bg-success-surface p-4 text-14 text-success"
            >
              {notice}
            </p>
          )}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-admin-line pt-5">
            <p className="text-12 leading-6 text-text-muted">
              {confirming
                ? 'ยืนยันใช้แบบนี้สำหรับลิงก์นี้หรือไม่?'
                : 'บันทึกเฉพาะลิงก์นี้ · QR ที่ดาวน์โหลดไปแล้วไม่เปลี่ยนตาม'}
            </p>
            <div className="flex flex-wrap gap-2">
              {confirming ? (
                <>
                  <Button
                    variant="outline"
                    disabled={saving}
                    onClick={() => setConfirming(false)}
                    className="[&&]:rounded-xl [&&]:text-13"
                  >
                    กลับไปแก้ไข
                  </Button>
                  <Button disabled={saving} onClick={save} className="[&&]:rounded-xl [&&]:text-13">
                    {saving ? 'กำลังบันทึก…' : 'ยืนยันบันทึก'}
                  </Button>
                </>
              ) : (
                <Button
                  disabled={!dirty || !!validation || saving}
                  onClick={() => setConfirming(true)}
                  className="[&&]:rounded-xl [&&]:text-13"
                >
                  บันทึกแบบ QR
                </Button>
              )}
            </div>
          </div>
        </>
      )}
    </Modal>
  );
}
