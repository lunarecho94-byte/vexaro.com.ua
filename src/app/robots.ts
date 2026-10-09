import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/checkout', '/thank-you', '/api/'],
      },
    ],
    sitemap: 'https://urbangrid.com.ua/sitemap.xml',
  };
}
