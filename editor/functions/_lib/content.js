function slugify(value) {
  return String(value).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function parseFrontmatter(source) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { data: {}, body: source };
  const data = {};
  for (const line of match[1].split(/\r?\n/)) {
    const separator = line.indexOf(':');
    if (separator < 0) continue;
    const key = line.slice(0, separator).trim();
    const raw = line.slice(separator + 1).trim();
    try { data[key] = JSON.parse(raw); } catch { data[key] = raw.replace(/^["']|["']$/g, ''); }
  }
  return { data, body: match[2].trim() };
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
  }[character]));
}

function inlineMarkdown(value) {
  return escapeHtml(value)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');
}

export function markdownToHtml(markdown) {
  if (/<(?:p|h[1-6]|ul|ol|blockquote|pre)\b/i.test(markdown)) return markdown;
  const output = [];
  let paragraph = [];
  let list;
  const flush = () => {
    if (paragraph.length) {
      output.push(`<p>${inlineMarkdown(paragraph.join(' ').trim())}</p>`);
      paragraph = [];
    }
  };
  const closeList = () => { if (list) { output.push(`</${list}>`); list = undefined; } };
  for (const line of markdown.split(/\r?\n/)) {
    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    const unordered = line.match(/^\s*[-*]\s+(.+)$/);
    const ordered = line.match(/^\s*\d+\.\s+(.+)$/);
    if (heading) { flush(); closeList(); output.push(`<h${Math.min(6, heading[1].length)}>${inlineMarkdown(heading[2])}</h${Math.min(6, heading[1].length)}>`); }
    else if (unordered || ordered) {
      flush();
      const next = unordered ? 'ul' : 'ol';
      if (list !== next) { closeList(); list = next; output.push(`<${list}>`); }
      output.push(`<li>${inlineMarkdown((unordered || ordered)[1])}</li>`);
    } else if (!line.trim()) { flush(); closeList(); }
    else paragraph.push(line);
  }
  flush(); closeList();
  return output.join('\n');
}

export function itemFromSource(type, file, source, sha) {
  const parsed = parseFrontmatter(source);
  const defaultOutline = [
    { label: 'Genesis of restraint', anchor: 'top' },
    { label: 'The long read', anchor: 'content' },
    { label: 'The quiet web posture', anchor: 'colophon' },
  ];
  return {
    id: file.name.slice(0, -3),
    type,
    file: file.name,
    path: file.path,
    sha,
    source,
    date: parsed.data.date || '',
    title: parsed.data.title || file.name,
    description: parsed.data.description || '',
    tags: parsed.data.tags || [],
    outline: Array.isArray(parsed.data.outline) && parsed.data.outline.length ? parsed.data.outline : (type === 'post' ? defaultOutline : []),
    text: parsed.data.text || '',
    draft: parsed.data.draft === true,
    body: parsed.body,
    editorHtml: markdownToHtml(parsed.body),
  };
}

export function serialize(item) {
  const quote = (value) => JSON.stringify(String(value ?? ''));
  const lines = ['---', `title: ${quote(item.title)}`, `date: ${quote(item.date)}`];
  if (item.type === 'post') {
    lines.push(`description: ${quote(item.description)}`, `tags: ${JSON.stringify(item.tags || [])}`);
    lines.push(`outline: ${JSON.stringify(item.outline || [])}`, `draft: ${Boolean(item.draft)}`);
  } else {
    lines.push(`text: ${quote(item.text)}`, `draft: ${Boolean(item.draft)}`);
  }
  return `${lines.join('\n')}\n---\n\n${item.body || ''}\n`;
}

export function contentPath(item) {
  const directory = item.type === 'note' ? 'src/content/notes' : 'src/content/posts';
  const slug = slugify(item.slug || item.title);
  if (!slug || slug.includes('..')) throw new Error('A valid slug is required.');
  return `${directory}/${slug}.md`;
}
