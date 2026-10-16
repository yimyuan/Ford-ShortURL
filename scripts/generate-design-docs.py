"""Build offline HTML/SVG and vector PDFs from one diagram model.

Requires Python, reportlab, Pillow/RAQM and Thai fonts (documentation tooling only).
Does not load environment variables, contact services, or modify databases.
"""
from pathlib import Path
from html import escape
import math
import textwrap
import os
from functools import lru_cache
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.utils import ImageReader
from PIL import Image, ImageDraw, ImageFont, features

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs/diagrams'
W, H = 1120, 720
INK, MUTED, LINE = '#142d49', '#50657d', '#8c9daf'
COLORS = {'entity': '#fff1d6', 'process': '#e5effb', 'store': '#e4f4ed', 'note': '#f0f3f7'}
PAGES = []

# English identifiers remain identical to the physical database. Thai labels are
# shaped with Pillow/RAQM, with a searchable Unicode text layer in the PDF.
FONT = Path(os.environ.get('DOCS_THAI_FONT', 'C:/Windows/Fonts/tahoma.ttf'))
BOLD_FONT = Path(os.environ.get('DOCS_THAI_BOLD_FONT', 'C:/Windows/Fonts/tahomabd.ttf'))


def node(x, y, w, title, lines, kind='process', h=100):
    return dict(x=x, y=y, w=w, h=h, title=title, lines=lines, kind=kind)


def flow(a, b, label, side='right'):
    # Connect known box edges. Labels occupy the gap between nodes.
    if side == 'down':
        return ([a['x']+a['w']/2, a['y']+a['h'], b['x']+b['w']/2, b['y']], label)
    return ([a['x']+a['w'], a['y']+a['h']/2, b['x'], b['y']+b['h']/2], label)


def page(title, subtitle, nodes, edges, notes, group='dfd'):
    PAGES.append(dict(title=title, subtitle=subtitle, nodes=nodes, edges=edges, notes=notes, group=group))


# Context: the database/Redis are internal stores and therefore appear at Level 1.
a = node(30, 150, 235, 'E1 User / Admin', ['React on GitHub Pages', 'URL / credentials / actions'], 'entity', 125)
b = node(440, 150, 240, '0 Ford-ShortURL', ['Express on Render', 'Auth, links, QR, analytics'], h=125)
c = node(855, 150, 235, 'E2 Link visitor', ['GET or HEAD /r/:code', 'Browser or QR scanner'], 'entity', 125)
page('DFD - Context (Level 0)', 'API boundary: Express, PostgreSQL and Redis. React/browser clients are external actors.',
     [a,b,c], [( [265,180,440,180], 'Requests'), ([440,245,265,245], 'JWT / data / QR'),
                ([855,180,680,180], '/r/:code'), ([680,245,855,245], '302 / error')],
     ['The application returns a Location header; it does not proxy or fetch the target page.',
      'Admin uses the same UI/API boundary. Backend authorization decides access.',
      'Supabase hosts PostgreSQL; Upstash hosts Redis. They are internal stores in Level 1.'])

a=node(30,140,240,'E1 User',['Email/password or Bearer JWT'],'entity')
b=node(440,140,240,'1.0 Authenticate',['Register / login / logout','Origin, JSON and rate limit'])
c=node(850,140,240,'D1 Users + D8 Redis',['Account/hash; session issuance','Atomic rate-limit counters'],'store')
d=node(30,370,240,'E1 React memory',['JWT + expiry; no cookies','Reload requires login'],'entity')
e=node(440,370,240,'6.0 Verify identity',['JWT signature + sid + expiry','Read current account each time'])
f=node(850,370,240,'D1 Users + D8 Redis',['Current account + session','Session EXAT = JWT expiry'],'store')
page('DFD - Authentication (Level 1)', 'Access JWT default 15 minutes; no Refresh Token, Cookie or Supabase Auth.',
     [a,b,c,d,e,f],[flow(a,b,'Credentials'),flow(b,c,'Account / session'),
                   ([440,220,270,220],'JWT / user / error'),
                   ([850,220,680,220],'Account / result'),
                   flow(d,e,'Bearer token'),flow(e,f,'Identity lookup'),
                   ([440,450,270,450],'Identity / error'),
                   ([850,450,680,450],'Account / session')],
     ['1.0 returns user + accessToken + expiresAt only after Redis session creation succeeds.',
      '6.0 checks Redis session then D1 current role/active/auth_version; protected flows reuse 6.0.',
      'Logout deletes current session. Account version changes revoke old sessions at next verification.',
      'Redis auth/rate-limit failures return 503 (fail closed). Raw secrets are never logged.'])

a=node(30,135,240,'E1 Authenticated user',['Original URL + optional code','Idempotency-Key (UUID v4)'],'entity')
b=node(440,135,240,'2.0 Create short link',['6.0 + validation + rate limit','RPC create_short_link'])
c=node(850,135,240,'D2 + D6 + D7',['Links + permanent reservations','Creation intent / fingerprint'],'store')
d=node(30,365,240,'E2 Visitor',['GET / HEAD short URL','No login required'],'entity')
e=node(440,365,240,'3.0 Resolve / count',['Optional D8 code-to-ID cache','RPC resolve_short_link'])
f=node(850,365,240,'D1 + D2 + D5 + D8',['Check owner + link active','Lifetime + daily; optional cache'],'store')
page('DFD - Create / redirect (Level 1)', 'DB is authoritative. Stores share a PostgreSQL transaction where atomicity is required.',
     [a,b,c,d,e,f],[flow(a,b,'URL + intent'),flow(b,c,'Atomic create'),
                   ([440,215,270,215],'Short URL / error'),([850,215,680,215],'Saved link / conflict'),
                   flow(d,e,'/r/:code'),flow(e,f,'Atomic resolve / count'),
                   ([440,445,270,445],'302 / error'),([850,445,680,445],'Destination / result')],
     ['2.0 returns the saved short URL. Replayed key + same fingerprint returns the same link.',
      '23505: random code retries up to 5 attempts; custom code collision returns 409.',
      'D6 keeps codes after deletion. D7 retains a nullable link tombstone until owner deletion.',
      '3.0 returns 302 + Location after DB success. GET counts bots/retries; HEAD does not count.',
      'Missing/inactive link or owner: 404. DB failure: 503. Redis cache outage: bounded DB fallback.'])

a=node(30,135,240,'E1 Authenticated user',['Filters / page / link ID','QR draft / confirmation'],'entity')
b=node(440,135,240,'4.0 User workspace',['6.0 + owner scope','History / dashboard / QR'])
c=node(850,135,240,'D1 + D2 + D4 + D5',['Owned links + daily aggregates','QR settings/version only'],'store')
d=node(30,365,240,'E1 Admin',['Read / confirmed action','Expected revision'],'entity')
e=node(440,365,240,'5.0 Admin management',['6.0 + current admin role','Recheck permissions in RPC'])
f=node(850,365,240,'D1 + D2 + D3',['Users / links + audit snapshot','Mutation + audit transaction'],'store')
page('DFD - Workspace / Admin (Level 1)', 'Requests carry Bearer tokens. No actor can write a store directly from the browser.',
     [a,b,c,d,e,f],[flow(a,b,'Read / save QR'),flow(b,c,'Scoped query'),
                   ([440,215,270,215],'Page / chart / QR'),([850,215,680,215],'Rows / aggregates'),
                   flow(d,e,'Admin action'),flow(e,f,'Read / atomic write'),
                   ([440,445,270,445],'Data / result / error'),([850,445,680,445],'Rows / result')],
     ['4.0 returns filtered pages (10 rows), 7-day / Top-5 aggregates, PNG/SVG or saved QR settings.',
      'QR encodes the Render short URL; no images/logos stored. Colors need real-device scan testing.',
      '5.0 returns summary/users/owner links/audit or mutation results. Only primary admin changes roles.',
      'User changes use auth_version; link changes use management_version; QR uses qr_version.',
      'D3 has no actor/target FK and no automatic retention deletion after migrations 018-019.'])

TABLES = [
 ('users', [('id','UUID','PK'),('email','VARCHAR(254)','UK'),('password_hash','VARCHAR(255)',''),('created_at','TIMESTAMPTZ',''),('role','VARCHAR(10)',''),('is_active','BOOLEAN',''),('auth_version','BIGINT',''),('updated_at','TIMESTAMPTZ',''),('is_primary_admin','BOOLEAN','partial UK'),('must_change_password','BOOLEAN','')]),
 ('links', [('id','UUID','PK'),('user_id','UUID','FK'),('short_code','VARCHAR(40)','UK'),('original_url','TEXT',''),('created_at','TIMESTAMPTZ',''),('click_count','BIGINT',''),('last_clicked_at','TIMESTAMPTZ','nullable'),('is_active','BOOLEAN',''),('updated_at','TIMESTAMPTZ',''),('management_version','BIGINT',''),('qr_style','JSONB',''),('qr_version','BIGINT','')]),
 ('admin_audit_logs', [('id','UUID','PK'),('actor_id','UUID','snapshot'),('actor_email','TEXT','snapshot'),('target_id','UUID','snapshot'),('target_email','TEXT','snapshot'),('action','TEXT','CHECK'),('details','JSONB',''),('created_at','TIMESTAMPTZ','')]),
 ('analytics_state', [('singleton','BOOLEAN','PK / true'),('daily_started_at','TIMESTAMPTZ','')]),
 ('link_click_daily', [('link_id','UUID','PK + FK'),('day','DATE','PK'),('click_count','BIGINT','> 0')]),
 ('short_code_reservations', [('short_code','VARCHAR(40)','PK')]),
 ('link_creation_requests', [('user_id','UUID','PK + FK'),('request_id','UUID','PK'),('request_hash','TEXT','hex64'),('link_id','UUID','FK nullable')]),
]

a=node(30,130,250,'users',['id PK | email UK','primary flag; auth_version'],'store',90)
b=node(435,130,250,'links',['id PK | user_id FK','short_code UK | QR settings'],'store',90)
c=node(840,130,250,'link_click_daily',['(link_id, day) PK','link_id FK; click_count'],'store',90)
d=node(435,350,250,'link_creation_requests',['(user_id, request_id) PK','link_id nullable FK; hash'],'store',95)
e=node(30,495,300,'admin_audit_logs',['Actor/target snapshots; no FK'],'store',70)
f=node(410,495,300,'short_code_reservations',['Code PK; trigger invariant, no FK'],'store',70)
g=node(790,495,300,'analytics_state',['Singleton PK; daily start, no FK'],'store',70)
page('ER - Physical relationships', 'Solid arrows: actual FOREIGN KEY (parent to child). Reservations/audit are not FK relations.',
     [a,b,c,d,e,f,g],[flow(a,b,'1 to 0..N'),flow(b,c,'1 to 0..N'),flow(b,d,'0..1 to 0..N','down'),
                    ([155,220,435,390],'1 to 0..N')],
     ['users -> links: DELETE/UPDATE RESTRICT. Admin account deletion removes links first.',
      'users -> requests: DELETE CASCADE; links -> requests: DELETE SET NULL (tombstone).',
      'links -> daily: DELETE CASCADE. D6 reservations survive link/user deletion; no physical FK.'], 'er')

for title, indexes in [('ER - Fields (1/2)', [0,1,2]), ('ER - Fields (2/2)', [3,4,5,6])]:
    cards=[]
    for i, idx in enumerate(indexes):
        name, fields=TABLES[idx]
        if len(indexes)==3: x,y,w=30+i*365,130,330
        else: x,y,w=30+(i%2)*550,130+(i//2)*235,510
        n=node(x,y,w,name,[], 'store',45+len(fields)*27)
        n['fields']=fields
        cards.append(n)
    page(title,'Schema app | Final definitions after migrations 001-019 | All fields NOT NULL unless marked.',
         cards,[],['Composite PKs are shown on each participating field. Audit IDs are snapshots, not foreign keys.',
                  'Types/defaults/CHECKs, index details, Redis keys and migration mapping: DATA_DICTIONARY.md.',
                  'No token, QR-image, click-event, role or link-expiry tables. Redis is separate from this ER.'], 'er')


TH = {
 'DFD - Context (Level 0)': 'DFD - แผนภาพบริบท (ระดับ 0)',
 'API boundary: Express, PostgreSQL and Redis. React/browser clients are external actors.': 'ขอบเขตระบบ: Express, PostgreSQL และ Redis ส่วน React/เบราว์เซอร์เป็นผู้เรียกใช้ภายนอก',
 'E1 User / Admin': 'E1 ผู้ใช้งาน / ผู้ดูแล',
 'React on GitHub Pages': 'หน้าบ้าน React บน GitHub Pages',
 'URL / credentials / actions': 'URL / ข้อมูลเข้าสู่ระบบ / คำสั่ง',
 '0 Ford-ShortURL': '0 ระบบ Ford-ShortURL',
 'Express on Render': 'หลังบ้าน Express บน Render',
 'Auth, links, QR, analytics': 'บัญชี ลิงก์ QR และสถิติ',
 'E2 Link visitor': 'E2 ผู้เปิดลิงก์',
 'GET or HEAD /r/:code': 'เรียก GET หรือ HEAD /r/:code',
 'Browser or QR scanner': 'เบราว์เซอร์หรือเครื่องสแกน QR',
 'Requests': 'คำขอใช้งาน', 'JWT / data / QR': 'JWT / ข้อมูล / QR', '302 / error': '302 / ข้อผิดพลาด',
 'The application returns a Location header; it does not proxy or fetch the target page.': 'ระบบส่ง Location ให้เบราว์เซอร์ไปยังเว็บปลายทาง ไม่ดึงหรือส่งต่อเนื้อหาเว็บแทนผู้ใช้',
 'Admin uses the same UI/API boundary. Backend authorization decides access.': 'ผู้ดูแลใช้หน้าบ้านและ API เดียวกัน โดยหลังบ้านเป็นผู้ตัดสินสิทธิ์',
 'Supabase hosts PostgreSQL; Upstash hosts Redis. They are internal stores in Level 1.': 'PostgreSQL อยู่บน Supabase และ Redis อยู่บน Upstash แสดงเป็นแหล่งเก็บข้อมูลภายในในระดับ 1',
 'DFD - Authentication (Level 1)': 'DFD - การเข้าสู่ระบบและตรวจตัวตน (ระดับ 1)',
 'Access JWT default 15 minutes; no Refresh Token, Cookie or Supabase Auth.': 'Access JWT เริ่มต้น 15 นาที ไม่มี Refresh Token, Cookie หรือ Supabase Auth',
 'E1 User': 'E1 ผู้ใช้งาน', 'Email/password or Bearer JWT': 'อีเมล/รหัสผ่าน หรือ Bearer JWT',
 '1.0 Authenticate': '1.0 จัดการการเข้าสู่ระบบ',
 'Register / login / logout': 'สมัคร / เข้าสู่ระบบ / ออกจากระบบ',
 'Origin, JSON and rate limit': 'ตรวจ Origin, JSON และจำกัดคำขอ',
 'D1 Users + D8 Redis': 'D1 บัญชี + D8 Redis',
 'Account/hash; session issuance': 'บัญชี/แฮช และสร้างเซสชัน',
 'Atomic rate-limit counters': 'ตัวนับจำกัดคำขอแบบอะตอมมิก',
 'E1 React memory': 'E1 ผู้ใช้ผ่าน React',
 'JWT + expiry; no cookies': 'JWT ในหน่วยความจำ ไม่มี Cookie',
 'Reload requires login': 'รีโหลดแล้วต้องเข้าสู่ระบบใหม่',
 '6.0 Verify identity': '6.0 ตรวจสอบตัวตน',
 'JWT signature + sid + expiry': 'ตรวจลายเซ็น JWT, sid และอายุ',
 'Read current account each time': 'อ่านบัญชีและสิทธิ์ล่าสุดทุกครั้ง',
 'Current account + session': 'บัญชีล่าสุดและข้อมูลเซสชัน',
 'Session EXAT = JWT expiry': 'เซสชันหมดอายุพร้อม JWT',
 'Credentials': 'อีเมล/รหัสผ่าน', 'Account / session': 'บัญชี / เซสชัน',
 'JWT / user / error': 'JWT / ผู้ใช้ / ข้อผิดพลาด', 'Account / result': 'บัญชี / ผลการทำงาน',
 'Bearer token': 'โทเคน Bearer', 'Identity lookup': 'ค้นหาบัญชี/เซสชัน', 'Identity / error': 'ตัวตน / ข้อผิดพลาด',
 '1.0 returns user + accessToken + expiresAt only after Redis session creation succeeds.': '1.0 คืนผู้ใช้ accessToken และ expiresAt หลังบันทึกเซสชันใน Redis สำเร็จเท่านั้น',
 '6.0 checks Redis session then D1 current role/active/auth_version; protected flows reuse 6.0.': '6.0 ตรวจเซสชัน Redis แล้วอ่าน role/active/auth_version ล่าสุดจาก D1 งานที่ต้องเข้าสู่ระบบใช้การตรวจนี้ร่วมกัน',
 'Logout deletes current session. Account version changes revoke old sessions at next verification.': 'ออกจากระบบลบเซสชันปัจจุบัน การเปลี่ยนเวอร์ชันบัญชีทำให้เซสชันเดิมไม่ผ่านการตรวจครั้งถัดไป',
 'Redis auth/rate-limit failures return 503 (fail closed). Raw secrets are never logged.': 'Redis ส่วนยืนยันตัวตน/จำกัดคำขอล้มเหลวตอบ 503 และไม่ข้ามการตรวจ ไม่บันทึกค่าลับลง Log',
 'DFD - Create / redirect (Level 1)': 'DFD - สร้างลิงก์และเปิดลิงก์ (ระดับ 1)',
 'DB is authoritative. Stores share a PostgreSQL transaction where atomicity is required.': 'ฐานข้อมูลเป็นแหล่งข้อมูลหลัก งานที่ต้องสำเร็จร่วมกันใช้ธุรกรรม PostgreSQL เดียวกัน',
 'E1 Authenticated user': 'E1 ผู้ใช้ที่เข้าสู่ระบบแล้ว',
 'Original URL + optional code': 'URL ต้นฉบับ + ชื่อที่ต้องการ',
 'Idempotency-Key (UUID v4)': 'กุญแจคำขอซ้ำ (UUID v4)',
 '2.0 Create short link': '2.0 สร้างลิงก์สั้น',
 '6.0 + validation + rate limit': 'ตรวจตัวตน ข้อมูล และจำกัดคำขอ',
 'RPC create_short_link': 'เรียก RPC create_short_link',
 'Links + permanent reservations': 'ลิงก์และชื่อที่จองถาวร',
 'Creation intent / fingerprint': 'คำขอสร้างและลายนิ้วมือข้อมูล',
 'E2 Visitor': 'E2 ผู้เปิดลิงก์', 'GET / HEAD short URL': 'GET / HEAD ของลิงก์สั้น', 'No login required': 'ไม่ต้องเข้าสู่ระบบ',
 '3.0 Resolve / count': '3.0 เปิดลิงก์และนับคลิก',
 'Optional D8 code-to-ID cache': 'D8 แคชชื่อเป็น ID แบบไม่บังคับ',
 'RPC resolve_short_link': 'เรียก RPC resolve_short_link',
 'Check owner + link active': 'ตรวจเจ้าของและลิงก์เปิดใช้งาน',
 'Lifetime + daily; optional cache': 'ยอดสะสม/รายวัน และแคช',
 'URL + intent': 'URL + คำขอสร้าง', 'Atomic create': 'บันทึกธุรกรรมเดียว',
 'Short URL / error': 'ลิงก์สั้น / ข้อผิดพลาด', 'Saved link / conflict': 'ลิงก์ที่บันทึก / ข้อมูลขัดแย้ง',
 'Atomic resolve / count': 'ค้นหาและนับแบบอะตอมมิก', 'Destination / result': 'ปลายทาง / ผลการทำงาน',
 '2.0 returns the saved short URL. Replayed key + same fingerprint returns the same link.': '2.0 คืนลิงก์สั้นที่บันทึกแล้ว ส่งกุญแจและข้อมูลเดิมซ้ำจะได้ลิงก์เดิม',
 '23505: random code retries up to 5 attempts; custom code collision returns 409.': 'เมื่อชน UNIQUE (23505) รหัสสุ่มลองรวมไม่เกิน 5 ครั้ง ชื่อกำหนดเองซ้ำตอบ 409',
 'D6 keeps codes after deletion. D7 retains a nullable link tombstone until owner deletion.': 'D6 เก็บชื่อไว้แม้ลบลิงก์ D7 เก็บคำขอเดิมโดย link_id เป็น null จนกว่าจะลบเจ้าของ',
 '3.0 returns 302 + Location after DB success. GET counts bots/retries; HEAD does not count.': '3.0 คืน 302 และ Location หลังฐานข้อมูลสำเร็จ GET นับรวมบอต/คำขอซ้ำ ส่วน HEAD ไม่นับ',
 'Missing/inactive link or owner: 404. DB failure: 503. Redis cache outage: bounded DB fallback.': 'ไม่พบ/ลิงก์ปิด/เจ้าของถูกระงับตอบ 404 ฐานข้อมูลล้มเหลวตอบ 503 แคชล่มยังกลับไปใช้ฐานข้อมูลได้',
 'DFD - Workspace / Admin (Level 1)': 'DFD - พื้นที่ผู้ใช้และผู้ดูแล (ระดับ 1)',
 'Requests carry Bearer tokens. No actor can write a store directly from the browser.': 'คำขอใช้ Bearer Token เบราว์เซอร์ไม่สามารถเขียนแหล่งข้อมูลโดยตรง',
 'Filters / page / link ID': 'ตัวกรอง / หน้า / ID ลิงก์', 'QR draft / confirmation': 'แบบ QR / การยืนยัน',
 '4.0 User workspace': '4.0 จัดการพื้นที่ผู้ใช้', '6.0 + owner scope': 'ตรวจตัวตนและเจ้าของข้อมูล',
 'History / dashboard / QR': 'ประวัติลิงก์ / ภาพรวม / QR',
 'Owned links + daily aggregates': 'ลิงก์ของตนและสรุปยอดรายวัน', 'QR settings/version only': 'เก็บเฉพาะแบบและเวอร์ชัน QR',
 'E1 Admin': 'E1 ผู้ดูแลระบบ', 'Read / confirmed action': 'ดูข้อมูล / คำสั่งที่ยืนยันแล้ว',
 'Expected revision': 'เวอร์ชันข้อมูลที่คาดไว้', '5.0 Admin management': '5.0 บริหารระบบ',
 '6.0 + current admin role': 'ตรวจตัวตนและสิทธิ์ผู้ดูแลล่าสุด', 'Recheck permissions in RPC': 'ตรวจสิทธิ์ซ้ำในธุรกรรม RPC',
 'Users / links + audit snapshot': 'บัญชี / ลิงก์ / ประวัติการจัดการ', 'Mutation + audit transaction': 'แก้ไขและบันทึกประวัติร่วมกัน',
 'Read / save QR': 'ดูข้อมูล / บันทึกแบบ QR', 'Scoped query': 'ค้นหาภายในสิทธิ์',
 'Page / chart / QR': 'รายการ / กราฟ / QR', 'Rows / aggregates': 'รายการ / ยอดสรุป',
 'Admin action': 'คำสั่งผู้ดูแล', 'Read / atomic write': 'อ่าน / เขียนในธุรกรรม',
 'Data / result / error': 'ข้อมูล / ผล / ข้อผิดพลาด', 'Rows / result': 'รายการ / ผลการทำงาน',
 '4.0 returns filtered pages (10 rows), 7-day / Top-5 aggregates, PNG/SVG or saved QR settings.': '4.0 คืนรายการตามตัวกรองหน้าละ 10 รายการ สรุป 7 วัน/5 อันดับแรก รูป PNG/SVG หรือแบบ QR ที่บันทึก',
 'QR encodes the Render short URL; no images/logos stored. Colors need real-device scan testing.': 'QR ใช้ลิงก์สั้นของ Render ไม่เก็บรูป/โลโก้ สีที่เลือกต้องทดสอบสแกนกับอุปกรณ์จริง',
 '5.0 returns summary/users/owner links/audit or mutation results. Only primary admin changes roles.': '5.0 คืนสรุป ผู้ใช้ ลิงก์ตามเจ้าของ ประวัติ หรือผลการแก้ไข บัญชีหลักเท่านั้นที่เปลี่ยนสิทธิ์ได้',
 'User changes use auth_version; link changes use management_version; QR uses qr_version.': 'บัญชีใช้ auth_version ลิงก์ใช้ management_version และแบบ QR ใช้ qr_version กันข้อมูลเก่าเขียนทับ',
 'D3 has no actor/target FK and no automatic retention deletion after migrations 018-019.': 'D3 ไม่มี FK ของผู้กระทำ/เป้าหมาย และไม่ลบประวัติอัตโนมัติหลัง migrations 018–019',
 'ER - Physical relationships': 'ER - ความสัมพันธ์ของฐานข้อมูลจริง',
 'Solid arrows: actual FOREIGN KEY (parent to child). Reservations/audit are not FK relations.': 'ลูกศรทึบแสดง FK จริงจากตารางแม่ไปตารางลูก การจองชื่อและประวัติไม่มี FK ไปยังลิงก์/บัญชี',
 'users': 'users · ผู้ใช้งาน', 'links': 'links · ลิงก์สั้น', 'admin_audit_logs': 'admin_audit_logs · ประวัติผู้ดูแล',
 'analytics_state': 'analytics_state · จุดเริ่มสถิติ', 'link_click_daily': 'link_click_daily · ยอดรายวัน',
 'short_code_reservations': 'short_code_reservations · จองชื่อ',
 'link_creation_requests': 'link_creation_requests · คำขอสร้าง',
 'id PK | email UK': 'id เป็น PK / email ไม่ซ้ำ', 'primary flag; auth_version': 'บัญชีหลักและเวอร์ชันสิทธิ์',
 'id PK | user_id FK': 'id เป็น PK / user_id เป็น FK', 'short_code UK | QR settings': 'ชื่อไม่ซ้ำและแบบ QR',
 '(link_id, day) PK': '(link_id, day) เป็น PK ร่วม', 'link_id FK; click_count': 'link_id เป็น FK / จำนวนคลิก',
 '(user_id, request_id) PK': '(user_id, request_id) เป็น PK ร่วม', 'link_id nullable FK; hash': 'link_id เป็น FK ว่างได้ / แฮชข้อมูล',
 'Actor/target snapshots; no FK': 'ข้อมูลผู้กระทำ/เป้าหมาย ไม่มี FK',
 'Code PK; trigger invariant, no FK': 'ชื่อเป็น PK จองผ่าน trigger ไม่มี FK',
 'Singleton PK; daily start, no FK': 'แถวเดียว วันเริ่มเก็บสถิติ ไม่มี FK',
 '1 to 0..N': '1 ต่อ 0..หลาย', '0..1 to 0..N': '0..1 ต่อ 0..หลาย',
 'users -> links: DELETE/UPDATE RESTRICT. Admin account deletion removes links first.': 'users → links ใช้ DELETE/UPDATE RESTRICT เมื่อลบบัญชี ระบบลบลิงก์ของบัญชีนั้นก่อน',
 'users -> requests: DELETE CASCADE; links -> requests: DELETE SET NULL (tombstone).': 'users → คำขอ ใช้ DELETE CASCADE ส่วน links → คำขอ ใช้ DELETE SET NULL เก็บร่องรอยคำขอเดิม',
 'links -> daily: DELETE CASCADE. D6 reservations survive link/user deletion; no physical FK.': 'links → ยอดรายวัน ใช้ DELETE CASCADE การจองชื่อยังอยู่หลังลบลิงก์/บัญชี และไม่มี FK',
 'ER - Fields (1/2)': 'ER - รายละเอียดตาราง (1/2)', 'ER - Fields (2/2)': 'ER - รายละเอียดตาราง (2/2)',
 'Schema app | Final definitions after migrations 001-019 | All fields NOT NULL unless marked.': 'Schema app หลัง migrations 001–019 ทุกคอลัมน์ห้ามว่าง ยกเว้นระบุ nullable (ว่างได้)',
 'Composite PKs are shown on each participating field. Audit IDs are snapshots, not foreign keys.': 'PK หลายคอลัมน์ระบุในทุกคอลัมน์ที่ร่วมกัน ส่วน ID ในประวัติเป็นข้อมูลสำเนา ไม่ใช่ FK',
 'Types/defaults/CHECKs, index details, Redis keys and migration mapping: DATA_DICTIONARY.md.': 'ชนิดข้อมูล ค่าเริ่มต้น CHECK ดัชนี Redis และรายการ migration ดู DATA_DICTIONARY.md',
 'No token, QR-image, click-event, role or link-expiry tables. Redis is separate from this ER.': 'ไม่มีตารางโทเคน ภาพ QR รายคลิก สิทธิ์ หรือวันหมดอายุลิงก์ Redis แยกจาก ER ของ PostgreSQL',
}

for p in PAGES:
    p['title']=TH[p['title']]
    p['subtitle']=TH[p['subtitle']]
    p['notes']=[TH[s] for s in p['notes']]
    p['edges']=[(points,TH.get(label,label)) for points,label in p['edges']]
    for n in p['nodes']:
        n['title']=TH.get(n['title'],n['title'])
        n['lines']=[TH[s] for s in n['lines']]
        if 'fields' in n:
            n['fields']=[(name,typ,{'nullable':'ว่างได้','FK nullable':'FK ว่างได้','snapshot':'สำเนา','partial UK':'UK เฉพาะหลัก','PK / true':'PK / จริง'}.get(key,key)) for name,typ,key in n['fields']]


@lru_cache(maxsize=128)
def font(size, bold=False):
    return ImageFont.truetype(str(BOLD_FONT if bold else FONT), round(size*3), layout_engine=ImageFont.Layout.RAQM)


def fit_size(s, maximum, size=16, bold=False):
    width=font(size,bold).getlength(s)/3
    return min(size, size*maximum/max(width,1))


def wrap(text, width=105):
    return textwrap.wrap(text,width=width,break_long_words=False,break_on_hyphens=False)


def svg(p):
    parts=[f'<svg viewBox="0 0 {W} {H}" role="img" aria-label="{escape(p["title"])}" xmlns="http://www.w3.org/2000/svg">',
           '<defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10" fill="#8c9daf"/></marker></defs>']
    def text(x,y,s,size=13,color=INK,bold=False,anchor='start'):
        parts.append(f'<text x="{x}" y="{y}" font-size="{size}" fill="{color}" font-weight="{600 if bold else 400}" text-anchor="{anchor}">{escape(s)}</text>')
    text(30,43,p['title'],27,bold=True)
    text(30,76,p['subtitle'],12,MUTED)
    for (x1,y1,x2,y2),label in p['edges']:
        parts.append(f'<path d="M{x1} {y1} L{x2} {y2}" fill="none" stroke="{LINE}" stroke-width="1.5" marker-end="url(#arrow)"/>')
        lx,ly=(x1+x2)/2,(y1+y2)/2-9
        if abs(x1-x2)<10: lx+=14
        parts.append(f'<rect x="{lx-len(label)*3.1-4}" y="{ly-12}" width="{len(label)*6.2+8}" height="17" rx="4" fill="white"/>')
        text(lx,ly,label,11,MUTED,anchor='middle')
    for n in p['nodes']:
        x,y,w,h=n['x'],n['y'],n['w'],n['h']
        parts.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="10" stroke="{LINE}" fill="{COLORS[n["kind"]]}"/>')
        text(x+16,y+28,n['title'],fit_size(n['title'],w-32,bold=True),bold=True)
        if 'fields' in n:
            for j,(name,typ,key) in enumerate(n['fields']):
                yy=y+52+j*27
                text(x+12,yy,name,12)
                text(x+w-12,yy,typ+(' | '+key if key else ''),10,MUTED,anchor='end')
        else:
            for j,line in enumerate(n['lines']): text(x+16,y+53+j*19,line,fit_size(line,w-32,12),MUTED)
    yy=605
    for note in p['notes']:
        for line in wrap(note,145):
            text(30,yy,line,11,MUTED); yy+=16
    text(30,704,'Ford-ShortURL | แบบตามโค้ดจริง | 2026-10-16 | PK: คีย์หลัก  FK: คีย์อ้างอิง  UK: ไม่ซ้ำ',10,MUTED)
    text(1090,704,f'{PAGES.index(p)+1} / {len(PAGES)}',10,MUTED,anchor='end')
    parts.append('</svg>')
    return ''.join(parts)


def pdf(path, pages):
    c=canvas.Canvas(str(path),pagesize=(W,H),invariant=1)
    c.setTitle('Ford-ShortURL - '+path.stem)
    c.setAuthor('Ford-ShortURL')
    def text(x,y,s,size=12,color=INK,bold=False,anchor='start'):
        if any('\u0e00' <= char <= '\u0e7f' for char in s):
            f=font(size,bold)
            left,top,right,bottom=f.getbbox(s,anchor='ls')
            advance=f.getlength(s)/3
            if anchor=='middle': x-=advance/2
            elif anchor=='end': x-=advance
            image=Image.new('RGBA',(right-left+16,bottom-top+16),(255,255,255,0))
            ImageDraw.Draw(image).text((8-left,8-top),s,font=f,fill=color,anchor='ls')
            c.drawImage(ImageReader(image),x+(left-8)/3,H-y-(bottom+8)/3,
                        width=image.width/3,height=image.height/3,mask='auto')
            c.saveState()
            layer=c.beginText(x,H-y)
            layer.setFont('ThaiBold' if bold else 'Thai',size)
            layer.setTextRenderMode(3)
            layer.textOut(s)
            c.drawText(layer)
            c.restoreState()
            return
        c.setFillColor(HexColor(color));c.setFont('Helvetica-Bold' if bold else 'Helvetica',size)
        if anchor=='middle': c.drawCentredString(x,H-y,s)
        elif anchor=='end': c.drawRightString(x,H-y,s)
        else: c.drawString(x,H-y,s)
    for p in pages:
        text(30,43,p['title'],27,bold=True);text(30,76,p['subtitle'],12,MUTED)
        for (x1,y1,x2,y2),label in p['edges']:
            c.setStrokeColor(HexColor(LINE));c.setLineWidth(1.5);c.line(x1,H-y1,x2,H-y2)
            ang=math.atan2(y2-y1,x2-x1)
            for off in [-.4,.4]: c.line(x2,H-y2,x2-9*math.cos(ang+off),H-y2+9*math.sin(ang+off))
            lx,ly=(x1+x2)/2,(y1+y2)/2-9
            if abs(x1-x2)<10: lx+=14
            c.setFillColor(HexColor('#ffffff'));c.rect(lx-len(label)*3.1-4,H-ly-5,len(label)*6.2+8,17,fill=1,stroke=0)
            text(lx,ly,label,11,MUTED,anchor='middle')
        for n in p['nodes']:
            x,y,w,h=n['x'],n['y'],n['w'],n['h']
            c.setStrokeColor(HexColor(LINE));c.setFillColor(HexColor(COLORS[n['kind']]))
            c.roundRect(x,H-y-h,w,h,10,fill=1,stroke=1)
            text(x+16,y+28,n['title'],fit_size(n['title'],w-32,bold=True),bold=True)
            if 'fields' in n:
                for j,(name,typ,key) in enumerate(n['fields']):
                    yy=y+52+j*27
                    text(x+12,yy,name,12);text(x+w-12,yy,typ+(' | '+key if key else ''),10,MUTED,anchor='end')
            else:
                for j,line in enumerate(n['lines']): text(x+16,y+53+j*19,line,fit_size(line,w-32,12),MUTED)
        yy=605
        for note in p['notes']:
            for line in wrap(note,145): text(30,yy,line,11,MUTED); yy+=16
        text(30,704,'Ford-ShortURL | แบบตามโค้ดจริง | 2026-10-16 | PK: คีย์หลัก  FK: คีย์อ้างอิง  UK: ไม่ซ้ำ',10,MUTED)
        text(1090,704,f'{pages.index(p)+1} / {len(pages)}',10,MUTED,anchor='end')
        c.showPage()
    c.save()


def main():
    if not FONT.exists() or not BOLD_FONT.exists() or not features.check_feature('raqm'):
        raise RuntimeError('Thai PDFs require Thai fonts and Pillow with RAQM; see docs/diagrams/README.md')
    pdfmetrics.registerFont(TTFont('Thai',str(FONT)))
    pdfmetrics.registerFont(TTFont('ThaiBold',str(BOLD_FONT)))
    OUT.mkdir(parents=True,exist_ok=True);(OUT/'pdf').mkdir(exist_ok=True)
    header='''<!doctype html><html lang="th"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ford-ShortURL - DFD / ER</title>
<style>body{margin:0;background:#edf2f7;color:#142d49;font:16px Tahoma,system-ui,sans-serif}header,nav,.intro{max-width:1100px;margin:24px auto;padding:0 20px}h1{font-size:30px}a{color:#245c96}nav{display:flex;gap:22px;flex-wrap:wrap}section{max-width:1120px;background:white;margin:26px auto;border:1px solid #d4deea;border-radius:14px;overflow:hidden}svg{display:block;width:100%;font-family:Tahoma,sans-serif}.intro{line-height:1.8}button{padding:10px 20px;border:0;background:#142d49;color:white;border-radius:8px;cursor:pointer}@media print{header,nav,.intro{display:none}body{background:white}section{border:0;border-radius:0;break-after:page;margin:0} @page{size:landscape;margin:10mm}}</style>
<header><h1>Ford-ShortURL - DFD / ER</h1><p>อัปเดตจากโค้ดและ SQL 001–019 · 16 ตุลาคม 2026</p></header>
<nav><a href="pdf/short-url-dfd.pdf">DFD PDF</a><a href="pdf/short-url-erd.pdf">ER PDF</a><a href="pdf/short-url-design.pdf">PDF รวม</a><a href="../design/DATA_DICTIONARY.md">Data Dictionary</a><button onclick="window.print()">พิมพ์</button></nav>
<div class="intro">ใช้ Bearer JWT ในหน่วยความจำ ไม่มี Cookie/Refresh Token ฐานข้อมูล PostgreSQL 7 ตาราง และ Redis แยกต่างหาก แผนภาพอ้างอิง implementation ไม่ใช่ผลตรวจ Production<br>DFD: E = external actor, process = งานของระบบ, D = data store. ลูกศรแสดงข้อมูล ไม่ใช่ลำดับเวลาหรือการเรียกฟังก์ชัน<br>D1 users · D2 links · D3 admin_audit_logs · D4 analytics_state · D5 link_click_daily · D6 short_code_reservations · D7 link_creation_requests · D8 Redis<br>ER ลูกศรทึบคือ physical FK จาก parent ไป child ส่วน audit snapshots และการจองชื่อไม่มี FK โดยตั้งใจ</div>'''
    (OUT/'short-url-dfd.html').write_text(header+''.join('<section>'+svg(p)+'</section>' for p in PAGES)+'</html>',encoding='utf-8')
    pdf(OUT/'pdf/short-url-dfd.pdf',[p for p in PAGES if p['group']=='dfd'])
    pdf(OUT/'pdf/short-url-erd.pdf',[p for p in PAGES if p['group']=='er'])
    pdf(OUT/'pdf/short-url-design.pdf',PAGES)
    print('Generated HTML + 3 PDFs (4 DFD pages, 3 ER pages).')


if __name__=='__main__': main()
