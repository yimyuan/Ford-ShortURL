import { Button, Icon } from '../../../shared/ui/index.js';
const count = (value) => BigInt(value).toLocaleString('th-TH');
export const linkCreatedDate = (date) =>
  new Date(date).toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Bangkok',
  });
function ShortLink({ link }) {
  return (
    <a
      href={link.shortUrl}
      target="_blank"
      rel="noopener noreferrer"
      title={link.shortUrl}
      className="inline-flex max-w-full items-center gap-2 text-15 font-semibold text-text-secondary hover:text-text"
    >
      <span className="truncate">{link.shortCode}</span>
      <Icon name="external" width="15" />
    </a>
  );
}
function Destination({ link }) {
  return (
    <a
      href={link.originalUrl}
      target="_blank"
      rel="noopener noreferrer"
      title={link.originalUrl}
      className="block truncate text-13 text-text-muted hover:text-text hover:underline"
    >
      {link.originalUrl}
    </a>
  );
}
function ManageButton({ link, onManage }) {
  return (
    <Button
      variant="outline"
      onClick={() => onManage(link.id)}
      aria-label={`จัดการลิงก์ ${link.shortCode}`}
      className="[&&]:min-h-9 [&&]:rounded-lg [&&]:px-3 [&&]:py-1.5 [&&]:text-13"
    >
      จัดการ <Icon name="arrow" width="14" />
    </Button>
  );
}
export default function MyLinksTable({ items, onManage }) {
  return (
    <>
      <div className="hidden overflow-hidden rounded-2xl border border-admin-line bg-white lg:block">
        <table className="w-full table-fixed text-left">
          <caption className="sr-only">รายการลิงก์ของฉัน พร้อมยอดเปิดและวันที่สร้าง</caption>
          <thead className="border-b border-admin-line bg-admin-soft text-13 text-text-secondary">
            <tr>
              <th scope="col" className="w-[24%] px-5 py-4 font-semibold">
                ลิงก์สั้น
              </th>
              <th scope="col" className="w-[29%] px-4 py-4 font-semibold">
                ลิงก์ต้นฉบับ
              </th>
              <th scope="col" className="w-[17%] px-4 py-4 text-right font-semibold">
                ยอดเปิด
              </th>
              <th scope="col" className="w-[17%] px-4 py-4 font-semibold">
                วันที่สร้าง
              </th>
              <th scope="col" className="w-[13%] px-4 py-4 text-right font-semibold">
                จัดการ
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-admin-line">
            {items.map((link) => (
              <tr key={link.id} className="hover:bg-admin-soft/40">
                <td className="px-5 py-5">
                  <ShortLink link={link} />
                  {link.isActive === false && (
                    <p className="mt-1 text-11 text-warning">ปิดใช้งาน</p>
                  )}
                </td>
                <td className="px-4 py-5">
                  <Destination link={link} />
                </td>
                <td className="break-all px-4 py-5 text-right text-22 font-semibold tabular-nums text-text">
                  {count(link.clickCount)}
                  <span className="mt-0.5 block text-11 font-normal text-text-muted">ครั้ง</span>
                </td>
                <td className="px-4 py-5 text-13 text-text-muted">
                  {linkCreatedDate(link.createdAt)}
                </td>
                <td className="px-4 py-5 text-right">
                  <ManageButton link={link} onManage={onManage} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="space-y-3 lg:hidden">
        {items.map((link) => (
          <article
            key={link.id}
            className="min-w-0 rounded-2xl border border-admin-line bg-white p-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <ShortLink link={link} />
                <div className="mt-2">
                  <Destination link={link} />
                </div>
              </div>
              <div className="max-w-[40%] text-right">
                <p className="break-all text-25 font-semibold tabular-nums">
                  {count(link.clickCount)}
                </p>
                <p className="text-11 text-text-muted">ครั้ง</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-admin-line pt-3">
              <p className="text-12 text-text-muted">
                {linkCreatedDate(link.createdAt)}
                {link.isActive === false ? ' · ปิดใช้งาน' : ''}
              </p>
              <ManageButton link={link} onManage={onManage} />
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
