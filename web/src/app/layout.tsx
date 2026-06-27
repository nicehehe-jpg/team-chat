import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Team Chat',
  description: '팀 내부 채팅 앱',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
