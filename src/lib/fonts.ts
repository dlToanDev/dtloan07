import { Inter, JetBrains_Mono } from 'next/font/google';

/**
 * next/font tải font về và self-host lúc build → không gọi Google lúc runtime,
 * và sinh sẵn size-adjust fallback nên không bị layout shift.
 */
export const fontSans = Inter({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-inter',
  display: 'swap',
});

export const fontMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});
