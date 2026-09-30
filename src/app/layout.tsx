import { Footer } from '@/components/layout/footer';
import { ConditionalFooter } from '@/components/layout/conditional-footer';
import { Header } from '@/components/layout/header';
import { ThemeProvider } from '@/components/theme-provider';
import { ProgressBar } from '@/components/layout/progress-bar';
import { ExitIntentPopup } from '@/components/marketing/exit-intent-popup';
import { LoginAdPopup } from '@/components/marketing/login-ad-popup';
import { AnnouncementBar } from '@/components/layout/announcement-bar';
import { CartDrawer } from '@/components/shop/cart-drawer';
import { FloatingContactWidget } from '@/components/layout/floating-contact-widget';
import { siteConfig } from '@/config/site';
import { fontMono, fontSans } from '@/lib/fonts';
import { cn } from '@/lib/utils';
import {
  getActiveBannerAnnouncement,
  getPublicLoginAdConfig,
  getPublicActiveAnnouncements,
} from '@/server/actions/settings';
import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.shortName}`,
  },
  description: siteConfig.description,
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0b0d12' },
  ],
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [adConfig, activeAnnouncement, announcements] = await Promise.all([
    getPublicLoginAdConfig(),
    getActiveBannerAnnouncement(),
    getPublicActiveAnnouncements(),
  ]);

  return (
    // suppressHydrationWarning: next-themes gắn class vào <html> trước khi React
    // hydrate, nên markup server và client khác nhau một cách có chủ đích.
    <html lang="vi" suppressHydrationWarning>
      <body className={cn(fontSans.variable, fontMono.variable, 'font-sans')}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <a
            href="#main"
            className="bg-primary text-primary-foreground sr-only rounded-lg px-4 py-2 focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50"
          >
            Bỏ qua, tới nội dung chính
          </a>

          <ProgressBar />
          <AnnouncementBar announcement={activeAnnouncement} />
          <div className="flex min-h-dvh flex-col">
            <Header announcements={announcements} />
            <main id="main" className="flex-1">
              {children}
            </main>
            <ConditionalFooter>
              <Footer />
            </ConditionalFooter>
          </div>
          <ExitIntentPopup />
          <LoginAdPopup initialConfig={adConfig} />
          <CartDrawer />
          <FloatingContactWidget />
        </ThemeProvider>
      </body>
    </html>
  );
}
