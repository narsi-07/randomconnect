const { SitemapStream, streamToPromise } = require('sitemap');
const { createWriteStream } = require('fs');

async function generateSitemap() {
  const smStream = new SitemapStream({ hostname: 'https://free4talk.xyz/' });
  const writeStream = createWriteStream('./public/sitemap.xml');

  smStream.pipe(writeStream);

  // Add your URLs here
  smStream.write({ url: '/', changefreq: 'daily', priority: 1.0 });
  smStream.write({ url: '/about', changefreq: 'monthly', priority: 0.8 });

  // End the stream
  smStream.end();

  await streamToPromise(smStream);

  console.log('Sitemap generated');
}

generateSitemap();
