import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Fieldbase',
    short_name: 'Fieldbase',
    description: 'Sales management for Alberta Premium Coatings',
    start_url: '/quotes',
    display: 'standalone',
    background_color: '#111111',
    theme_color: '#3FA82A',
    orientation: 'portrait',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  }
}
