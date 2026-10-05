import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { siteTitle, siteDescription, siteUrl } from '../config';
import { getPublishedPosts } from '../utils/posts';

export async function GET(context: APIContext) {
  const posts = await getPublishedPosts();

  const site = context.site ?? new URL(siteUrl);

  return rss({
    title: siteTitle,
    description: siteDescription,
    site,
    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.date,
      description: post.data.description,
      link: `/posts/${post.id}/`,
    })),
    customData: `<language>en-us</language>`,
  });
}
