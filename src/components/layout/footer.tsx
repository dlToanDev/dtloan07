import { siteConfig } from '@/config/site';
import Link from 'next/link';
import Image from 'next/image';

const footerLinks = [
  { label: 'Affiliate', href: '/affiliate' },
  { label: 'Khóa học', href: '/courses' },
  { label: 'Shop', href: '/shop' },
  { label: 'Tài khoản Pro', href: '/account?tab=pro' },
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
        <div className="flex items-center gap-2">
          <Image
            src={siteConfig.logo}
            alt={siteConfig.name}
            width={48}
            height={26}
            className="h-6 w-auto rounded object-contain"
          />
          <p className="text-muted-foreground text-sm">
            © {new Date().getFullYear()} {siteConfig.name}
          </p>
        </div>

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
