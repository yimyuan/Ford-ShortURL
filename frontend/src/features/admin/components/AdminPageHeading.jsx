import { Button, Icon } from '../../../shared/ui/index.js';
export default function AdminPageHeading({ model, onDetails }) {
  const { section, current, loading, reload, ready, unauthorized } = model;
  return (
    <>
      {' '}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 font-display text-13 font-semibold tracking-[2.4px] text-accent-muted">
            YOUR LINK CONTROL CENTER
          </p>
          <h1 className="text-32 font-semibold leading-[1.7] tracking-normal sm:text-36">
            {section === 'overview' ? 'ภาพรวมระบบ' : current.label}
          </h1>
          <p className="mt-1 text-16 leading-7 text-text-muted">
            {section === 'overview'
              ? 'ดูแลทุกลิงก์ ทุกผู้ใช้ และทุกการเชื่อมต่อในที่เดียว'
              : section === 'users'
                ? 'ตรวจสอบบัญชีผู้ใช้งาน สิทธิ์ และสถานะการใช้งาน'
                : section === 'history'
                  ? 'ตรวจสอบว่าใครจัดการบัญชีใด เมื่อไร และทำอะไร'
                  : 'เลือกเจ้าของบัญชีเพื่อดูแลลิงก์และตรวจสอบการใช้งาน'}
          </p>
        </div>
        <Button
          variant="info"
          className="[&&]:min-h-12 [&&]:rounded-xl [&&]:px-4 [&&]:py-2 [&&]:text-15"
          disabled={loading}
          onClick={reload}
        >
          <Icon
            name="refresh"
            width="16"
            height="16"
            className={loading ? 'motion-safe:animate-spin' : ''}
          />
          {loading ? 'กำลังโหลด' : 'โหลดข้อมูลใหม่'}
        </Button>
      </div>
      {!ready && (
        <div
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-admin-line bg-admin-panel px-5 py-3"
          role="status"
        >
          <div className="flex items-start gap-3">
            <Icon name="shield" width="18" className="mt-1 text-accent-muted" />
            <div>
              <p className="text-15 font-medium">
                {loading
                  ? 'กำลังตรวจสอบการเข้าถึงข้อมูล'
                  : unauthorized
                    ? 'บัญชีนี้ยังเข้าถึงข้อมูลไม่ได้'
                    : 'ยังโหลดข้อมูลจัดการระบบไม่ได้'}
              </p>
              <p className="text-14 leading-6 text-text-muted">
                {unauthorized
                  ? 'กรุณาตรวจสอบสิทธิ์ หรือลองเข้าสู่ระบบใหม่'
                  : 'ตรวจสอบการเชื่อมต่อหลังบ้าน แล้วลองโหลดข้อมูลใหม่อีกครั้ง'}
              </p>
            </div>
          </div>
          <button onClick={onDetails} className="text-14 font-medium underline underline-offset-4">
            ดูรายละเอียด
          </button>
        </div>
      )}
    </>
  );
}
