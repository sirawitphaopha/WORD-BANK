import './globals.css';

export const metadata = {
  title: 'คลังคำ · Word Bank',
  description: 'คลังคำศัพท์สำหรับนักเขียนนิยาย เก็บคำงาม แก้สะกด จัดหมวดด้วย AI',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Charmonman:wght@400;700&family=Chonburi&family=Maitree:wght@400;500;600&family=Sarabun:wght@300;400;500;600;700&family=Trirong:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
