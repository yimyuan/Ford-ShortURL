import { Button, Icon, Input } from '../../../shared/ui/index.js';
export default function MyLinksFilters({ model }) {
  return (
    <div className="mb-5 rounded-2xl border border-admin-line bg-white p-4 sm:p-5">
      <div className="grid items-end gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,2fr)_1fr_1fr_1fr]">
        <div>
          <label
            htmlFor="my-links-search"
            className="mb-2 block text-13 font-medium text-text-secondary"
          >
            ค้นหาลิงก์
          </label>
          <div className="relative">
            <Icon
              name="search"
              width="18"
              className="pointer-events-none absolute top-1/2 left-3 z-10 -translate-y-1/2 text-text-muted"
            />
            <Input
              id="my-links-search"
              type="search"
              value={model.query}
              onChange={(e) => model.setQuery(e.target.value)}
              maxLength={8192}
              autoComplete="off"
              placeholder="ชื่อลิงก์สั้น หรือ URL ต้นฉบับ"
              className="[&&]:rounded-xl [&&]:py-3 [&&]:pl-10 [&&]:text-14"
            />
          </div>
        </div>
        {[
          {
            key: 'clicks',
            label: 'การเปิดลิงก์',
            options: [
              ['all', 'ทั้งหมด'],
              ['opened', 'เคยเปิดแล้ว'],
              ['unopened', 'ยังไม่มีคนเปิด'],
            ],
          },
          {
            key: 'period',
            label: 'วันที่สร้าง',
            options: [
              ['all', 'ทั้งหมด'],
              ['today', 'วันนี้'],
              ['7d', '7 วันล่าสุด'],
              ['30d', '30 วันล่าสุด'],
            ],
          },
          {
            key: 'sort',
            label: 'เรียงลำดับ',
            options: [
              ['newest', 'ใหม่สุด'],
              ['oldest', 'เก่าสุด'],
              ['clicks', 'ยอดเปิดมากสุด'],
            ],
          },
        ].map((filter) => (
          <label key={filter.key} className="block text-13 font-medium text-text-secondary">
            {filter.label}
            <select
              value={model[filter.key]}
              onChange={(e) => model.setFilter(filter.key, e.target.value)}
              className="mt-2 min-h-12 w-full rounded-xl border border-admin-line bg-white px-3 py-3 text-14 text-text"
            >
              {filter.options.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-admin-line pt-4">
        <p role="status" className="text-13 text-text-muted">
          {model.state.loading
            ? 'กำลังค้นหาลิงก์…'
            : model.state.error
              ? 'ยังโหลดจำนวนรายการไม่ได้'
              : `พบ ${model.state.total.toLocaleString('th-TH')} ลิงก์${model.hasFilters ? ' ตามเงื่อนไข' : ''}`}{' '}
          · แสดงครั้งละ 10 รายการ
        </p>
        {model.hasFilters && (
          <Button
            variant="outline"
            onClick={model.clearFilters}
            className="[&&]:min-h-9 [&&]:rounded-lg [&&]:px-3 [&&]:py-1 [&&]:text-12"
          >
            <Icon name="close" width="14" />
            ล้างตัวกรอง
          </Button>
        )}
      </div>
    </div>
  );
}
