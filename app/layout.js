import './globals.css';
// 🔤 ฟอนต์ทั้งหมด "ฝังในเว็บ" ผ่าน next/font/google — ดาวน์โหลด+ฝังตอน build
// เว็บจริงเสิร์ฟฟอนต์เอง ไม่พึ่ง Google ตอน runtime (ขึ้นชัวร์ทุกเครื่อง/เน็ต ไม่กระพริบ)
// 📌 กฎโปรเจกต์: ฟอนต์ใหม่ทุกตัว "ต้องฝังแบบนี้" ห้ามใช้ <link> CDN
//    เพิ่มฟอนต์ = import ที่นี่ + ตั้ง variable + ต่อ className ใน <html> + ใช้ var(--font-xxx) ในโค้ด
import { Charmonman, Chonburi, Maitree, Sarabun, Trirong } from 'next/font/google';
import localFont from 'next/font/local';

// TH Sarabun New — ฟอนต์แห่งชาติไทย (ไฟล์จริงจากเครื่องพี่กัน เก็บใน app/fonts/)
// คนละตัวกับ Sarabun ของ Google: อันนี้คือฟอนต์ราชการที่ใช้ในเอกสารทางการ
const thsarabun = localFont({
  src: [
    { path: './fonts/THSarabunNew.ttf', weight: '400', style: 'normal' },
    { path: './fonts/THSarabunNew-Italic.ttf', weight: '400', style: 'italic' },
    { path: './fonts/THSarabunNew-Bold.ttf', weight: '700', style: 'normal' },
    { path: './fonts/THSarabunNew-BoldItalic.ttf', weight: '700', style: 'italic' },
  ],
  variable: '--font-thsarabun',
  display: 'swap',
});

const charmonman = Charmonman({ subsets: ['thai', 'latin'], weight: ['400', '700'], variable: '--font-charmonman', display: 'swap' });
const chonburi = Chonburi({ subsets: ['thai', 'latin'], weight: '400', variable: '--font-chonburi', display: 'swap' });
const maitree = Maitree({ subsets: ['thai', 'latin'], weight: ['400', '500', '600'], variable: '--font-maitree', display: 'swap' });
const sarabun = Sarabun({ subsets: ['thai', 'latin'], weight: ['300', '400', '500', '600', '700'], variable: '--font-sarabun', display: 'swap' });
const trirong = Trirong({ subsets: ['thai', 'latin'], weight: ['400', '500', '600', '700'], style: ['normal', 'italic'], variable: '--font-trirong', display: 'swap' });

export const metadata = {
  title: 'คลังคำ · Word Bank',
  description: 'คลังคำศัพท์สำหรับนักเขียนนิยาย เก็บคำงาม แก้สะกด จัดหมวดด้วย AI',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  const fontVars = `${charmonman.variable} ${chonburi.variable} ${maitree.variable} ${sarabun.variable} ${trirong.variable} ${thsarabun.variable}`;
  return (
    <html lang="th" className={fontVars}>
      <body>{children}</body>
    </html>
  );
}
