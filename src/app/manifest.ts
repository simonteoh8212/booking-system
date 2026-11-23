
import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'SideBox';
  const shortName = process.env.NEXT_PUBLIC_APP_SHORT_NAME || appName;
  const rawPrimary = process.env.NEXT_PUBLIC_PRIMARY_COLOR?.trim();
  const themeColor =
    rawPrimary && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(rawPrimary)
      ? rawPrimary.length === 9
        ? rawPrimary.slice(0, 7)
        : rawPrimary.length === 5
        ? rawPrimary.slice(0, 4)
        : rawPrimary
      : '#70adf5';

  return {
    id: '/admin/desk',
    name: appName,
    short_name: shortName,
    description: `${appName} point-of-sale & management web app`,
    start_url: '/admin/desk',
    scope: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: themeColor,
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  }
}