
import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'SideBox';
  const shortName = process.env.NEXT_PUBLIC_APP_SHORT_NAME || appName;

  return {
    id: '/admin/desk',
    name: appName,
    short_name: shortName,
    description: `${appName} point-of-sale & management web app`,
    start_url: '/admin/desk',
    scope: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#70adf5',
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