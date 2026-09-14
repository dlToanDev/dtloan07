import { siteConfig } from '@/config/site';
import { ImageResponse } from 'next/og';

export const alt = siteConfig.name;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OgImage() {
  return new ImageResponse(
    <div
      style={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        background: '#0b0d12',
        padding: 80,
      }}
    >
      <div style={{ color: '#60a5fa', fontSize: 28, marginBottom: 24 }}>{siteConfig.shortName}</div>
      <div style={{ color: '#f8fafc', fontSize: 68, fontWeight: 700, lineHeight: 1.15 }}>
        {siteConfig.name}
      </div>
      <div style={{ color: '#94a3b8', fontSize: 30, marginTop: 28 }}>{siteConfig.description}</div>
    </div>,
    size,
  );
}
