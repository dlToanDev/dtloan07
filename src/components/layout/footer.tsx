import { siteConfig } from '@/config/site';
import Link from 'next/link';

const footerLinks = [
  { label: 'Ưu đãi & Tools', href: '/affiliate' },
  { label: 'Giới thiệu', href: '/about' },
  { label: 'Tra cứu đơn', href: '/orders/lookup' },
  { label: 'Điều khoản', href: '/terms' },
  { label: 'Bảo mật', href: '/privacy' },
  { label: 'RSS', href: '/rss.xml' },
];

export function Footer() {
  return (
    <footer className="border-border mt-16 border-t">
      <div className="container-page flex flex-col gap-4 py-8 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground text-sm">
          © {new Date().getFullYear()} {siteConfig.name}
        </p>

        <nav aria-label="Liên kết chân trang">
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            {footerLinks.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
