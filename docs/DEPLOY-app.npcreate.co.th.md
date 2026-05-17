# Deploy ที่ app.npcreate.co.th

คู่มือตั้งค่าโดเมนย่อยสำหรับ **NP Create OS** บน Vercel + Supabase

---

## 1. โครงสร้างโดเมน (แนะนำ)

| โดเมน | ใช้ทำอะไร |
|--------|-----------|
| **app.npcreate.co.th** | แอปหลัก (OS + Client Workspace + `/contact`) |
| npcreate.co.th | เว็บไซต์บริษัท (แยกโปรเจกต์) — ลิงก์มาที่ `https://app.npcreate.co.th` |

แอปนี้ deploy ที่ root ของ subdomain (`/`, `/app`, `/login`, `/contact`) ไม่ต้องใส่ path prefix

---

## 2. Vercel — เพิ่มโดเมน

1. เปิดโปรเจกต์ `np-create-operating-system` ใน [Vercel Dashboard](https://vercel.com)
2. **Settings → Domains → Add**
3. ใส่ `app.npcreate.co.th`
4. ตั้ง DNS ตามที่ Vercel แสดง (มักเป็น):

| Type | Name | Value |
|------|------|--------|
| **CNAME** | `app` | `cname.vercel-dns.com` |

5. รอ SSL ออก (Let's Encrypt อัตโนมัติ)
6. ตั้ง **Production Branch** = `main` (หรือ branch ที่ใช้ deploy จริง)

---

## 3. Environment Variables (Vercel)

ใน **Settings → Environment Variables** (Production + Preview ตามต้องการ):

| ตัวแปร | ค่า |
|--------|-----|
| `VITE_APP_URL` | `https://app.npcreate.co.th` |
| `VITE_SUPABASE_URL` | URL จาก Supabase |
| `VITE_SUPABASE_ANON_KEY` | anon key จาก Supabase |

หลังเพิ่ม/แก้ env ให้ **Redeploy** โปรเจกต์

---

## 4. Supabase Auth (สำคัญ)

ใน Supabase → **Authentication → URL Configuration**:

| ช่อง | ค่า |
|------|-----|
| **Site URL** | `https://app.npcreate.co.th` |
| **Redirect URLs** | `https://app.npcreate.co.th/**` |

ถ้ามี Preview บน Vercel เพิ่ม:

`https://*-np-create-operating-system.vercel.app/**`

(หรือ domain preview จริงของทีม)

---

## 5. Deploy จากเครื่อง

```bash
npm run build
npx vercel --prod
```

หรือ push ขึ้น Git ที่เชื่อม Vercel แล้ว deploy อัตโนมัติ

---

## 6. ตรวจหลัง deploy

| URL | คาดหวัง |
|-----|---------|
| https://app.npcreate.co.th/login | หน้าเข้าสู่ระบบ |
| https://app.npcreate.co.th/contact | ฟอร์มลูกค้าใหม่ |
| https://app.npcreate.co.th/app | หลัง login → หน้าหลัก |
| https://app.npcreate.co.th/app/status | โดเมนแสดง `app.npcreate.co.th (production)` |

---

## 7. ลิงก์จากเว็บหลัก npcreate.co.th

ในปุ่ม "เข้าสู่ระบบ" / "ลูกค้า" บนเว็บหลัก ใช้:

```html
<a href="https://app.npcreate.co.th/login">เข้าสู่ระบบทีมงาน</a>
<a href="https://app.npcreate.co.th/contact">ติดต่อ / สนใจบริการ</a>
```

---

## 8. Local development

ใน `.env.local`:

```env
VITE_APP_URL=http://localhost:5173
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

`npm run dev` ยังใช้ localhost ได้ตามปกติ — canonical meta จะชี้ตาม `VITE_APP_URL` ตอน build เท่านั้น
