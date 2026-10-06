// src/utils/posts.ts
import { getCollection, type CollectionEntry } from 'astro:content';

export type Post = CollectionEntry<'posts'>;
export type Note = CollectionEntry<'notes'>;

/**
 * Returns all published posts (excluding drafts in production builds),
 * sorted chronologically newest first.
 */
export async function getPublishedPosts(): Promise<Post[]> {
  const posts = await getCollection('posts', ({ data }) => {
    return import.meta.env.PROD ? data.draft !== true : true;
  });

  return posts.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

/**
 * Calculates a map of tag names to their respective post counts.
 */
export function getTagCounts(posts: Post[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const post of posts) {
    for (const tag of post.data.tags) {
      counts[tag] = (counts[tag] || 0) + 1;
    }
  }
  return counts;
}

/** Returns short published notes, newest first. */
export async function getPublishedNotes(): Promise<Note[]> {
  const notes = await getCollection('notes', ({ data }) => {
    return import.meta.env.PROD ? data.draft !== true : true;
  });

  return notes.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}
