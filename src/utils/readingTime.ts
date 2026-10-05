/**
 * Computes an estimated reading time for a post based on word count.
 * Average adult reading speed is approximately 200 words per minute.
 */
export function getReadingTime(content: string | undefined | null): string {
  if (!content) {
    return '1 min read';
  }

  // Remove code blocks, HTML tags, images, links, markdown headers/emphasis
  const sanitized = content
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]*`/g, '')
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/[#*`_~>+\-]/g, ' ')
    .trim();

  const words = sanitized.split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / 200));

  return `${minutes} min read`;
}
