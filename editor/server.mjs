import { createServer } from 'node:http';
import net from 'node:net';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const editorRoot = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(editorRoot, '..');
const publicRoot = path.join(editorRoot, 'public');
const contentRoots = {
  post: path.join(projectRoot, 'src', 'content', 'posts'),
  note: path.join(projectRoot, 'src', 'content', 'notes'),
};
const port = Number(process.env.EDITOR_PORT || 4322);
const password = process.env.EDITOR_PASSWORD;
const sessions = new Map();

async function isPortFree(portNumber) {
  return await new Promise((resolve) => {
    const tester = net.createServer();
    tester.once('error', () => resolve(false));
    tester.once('listening', () => {
      tester.close(() => resolve(true));
    });
    tester.listen(portNumber, '127.0.0.1');
  });
}

if (!password) {
  console.error('EDITOR_PASSWORD is required. Start with: $env:EDITOR_PASSWORD="your-password"; npm run editor');
  process.exit(1);
}

const finalPort = Number(process.env.EDITOR_PORT || 4322);
if (finalPort !== port) {
  console.log(`Requested port ${port} is unavailable; using ${finalPort}.`);
}

function sendJson(response, status, value) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(value));
}

function parseCookies(request) {
  return Object.fromEntries((request.headers.cookie || '').split(';').filter(Boolean).map((part) => {
    const index = part.indexOf('=');
    return [part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1).trim())];
  }));
}

function authenticated(request) {
  const token = parseCookies(request).editor_session;
  return token && sessions.has(token);
}

function slugify(value) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function yamlString(value) {
  return JSON.stringify(String(value ?? ''));
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
    try {
      data[key] = JSON.parse(raw);
    } catch {
      data[key] = raw.replace(/^["']|["']$/g, '');
    }
  }
  return { data, body: match[2].trim() };
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }[character]));
}

function markdownToHtml(markdown) {
  if (/<(?:p|h[1-6]|ul|ol|blockquote|pre)\b/i.test(markdown)) return markdown;
  const lines = markdown.split(/\r?\n/);
  const output = [];
  let paragraph = [];
  let list = null;
  let code = null;

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      const text = paragraph.join(' ').trim();
      output.push(`<p>${inlineMarkdown(text)}</p>`);
      paragraph = [];
    }
  };
  const closeList = () => {
    if (list) {
      output.push(`</${list}>`);
      list = null;
    }
  };

  for (const line of lines) {
    if (line.startsWith('```')) {
      flushParagraph();
      closeList();
      if (code === null) {
        code = [];
      } else {
        output.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`);
        code = null;
      }
      continue;
    }
    if (code !== null) {
      code.push(line);
      continue;
    }
    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    const unordered = line.match(/^\s*[-*]\s+(.+)$/);
    const ordered = line.match(/^\s*\d+\.\s+(.+)$/);
    if (heading) {
      flushParagraph();
      closeList();
      const level = Math.min(6, heading[1].length);
      const text = inlineMarkdown(heading[2]);
      output.push(`<h${level}>${text}</h${level}>`);
    } else if (unordered || ordered) {
      flushParagraph();
      const nextList = unordered ? 'ul' : 'ol';
      if (list !== nextList) {
        closeList();
        list = nextList;
        output.push(`<${list}>`);
      }
      output.push(`<li>${inlineMarkdown((unordered || ordered)[1])}</li>`);
    } else if (line.trim() === '') {
      flushParagraph();
      closeList();
    } else {
      paragraph.push(line);
    }
  }
  flushParagraph();
  closeList();
  if (code !== null) output.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`);
  return output.join('\n');
}

function inlineMarkdown(value) {
  return escapeHtml(value)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');
}

function serialize(item) {
  const lines = [
    '---',
    `title: ${yamlString(item.title)}`,
    `date: ${yamlString(item.date)}`,
  ];
  if (item.type === 'post') {
    lines.push(`description: ${yamlString(item.description)}`);
    lines.push(`tags: ${JSON.stringify(item.tags || [])}`);
    lines.push(`outline: ${JSON.stringify(item.outline || [])}`);
    lines.push(`draft: ${Boolean(item.draft)}`);
  } else {
    lines.push(`text: ${yamlString(item.text)}`);
    lines.push(`draft: ${Boolean(item.draft)}`);
  }
  return `${lines.join('\n')}\n---\n\n${item.body || ''}\n`;
}

async function readItems(type) {
  const directory = contentRoots[type];
  const files = (await fs.readdir(directory)).filter((file) => file.endsWith('.md'));
  const defaultOutline = [
    { label: 'Genesis of restraint', anchor: 'top' },
    { label: 'The long read', anchor: 'content' },
    { label: 'The quiet web posture', anchor: 'colophon' },
  ];
  return Promise.all(files.map(async (file) => {
    const source = await fs.readFile(path.join(directory, file), 'utf8');
    const parsed = parseFrontmatter(source);
    return {
      id: file.slice(0, -3),
      type,
      file,
      title: parsed.data.title || file,
      date: parsed.data.date || '',
      description: parsed.data.description || '',
      tags: parsed.data.tags || [],
      outline: Array.isArray(parsed.data.outline) && parsed.data.outline.length ? parsed.data.outline : (type === 'post' ? defaultOutline : []),
      text: parsed.data.text || '',
      draft: parsed.data.draft === true,
      body: parsed.body,
      source,
      editorHtml: markdownToHtml(parsed.body),
    };
  }));
}

async function readBody(request) {
  let body = '';
  for await (const chunk of request) body += chunk;
  return JSON.parse(body || '{}');
}

function safeFileName(value) {
  const name = slugify(value);
  if (!name || name.includes('..')) throw new Error('A valid slug is required.');
  return `${name}.md`;
}

function isWithinRoot(file, root) {
  const relative = path.relative(root, file);
  return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative);
}

async function handleApi(request, response, pathname) {
  if (pathname === '/api/session' && request.method === 'GET') {
    return sendJson(response, 200, { authenticated: Boolean(authenticated(request)) });
  }
  if (pathname === '/api/login' && request.method === 'POST') {
    const body = await readBody(request);
    const supplied = String(body.password || '');
    const matches = supplied.length === password.length
      && crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(password));
    if (!matches) return sendJson(response, 401, { error: 'That password does not match.' });
    const token = crypto.randomBytes(32).toString('hex');
    sessions.set(token, Date.now());
    response.writeHead(200, {
      'Content-Type': 'application/json',
      'Set-Cookie': `editor_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=86400`,
    });
    return response.end(JSON.stringify({ authenticated: true }));
  }
  if (pathname === '/api/logout' && request.method === 'POST') {
    const token = parseCookies(request).editor_session;
    if (token) sessions.delete(token);
    response.writeHead(200, { 'Set-Cookie': 'editor_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0' });
    return response.end('{}');
  }
  if (!authenticated(request)) return sendJson(response, 401, { error: 'Authentication required.' });

  if (pathname === '/api/content' && request.method === 'GET') {
    const [posts, notes] = await Promise.all([readItems('post'), readItems('note')]);
    return sendJson(response, 200, { posts, notes });
  }
  if (pathname === '/api/content' && request.method === 'POST') {
    const item = await readBody(request);
    const type = item.type === 'note' ? 'note' : 'post';
    const file = safeFileName(item.slug || item.title);
    const existingFile = item.id ? safeFileName(item.id) : null;
    const target = path.join(contentRoots[type], file);
    const oldTarget = existingFile ? path.join(contentRoots[type], existingFile) : null;
    const resolvedRoot = path.resolve(contentRoots[type]);
    if (!isWithinRoot(path.resolve(target), resolvedRoot) || (oldTarget && !isWithinRoot(path.resolve(oldTarget), resolvedRoot))) {
      return sendJson(response, 400, { error: 'Invalid content path.' });
    }
    await fs.mkdir(contentRoots[type], { recursive: true });
    if (oldTarget && oldTarget !== target) {
      try {
        await fs.access(target);
        return sendJson(response, 409, { error: 'A piece with that slug already exists.' });
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
      await fs.rename(oldTarget, target);
    } else if (!oldTarget) {
      try {
        await fs.access(target);
        return sendJson(response, 409, { error: 'A piece with that slug already exists.' });
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
    }
    await fs.writeFile(target, item.source ? String(item.source) : serialize({ ...item, type }), 'utf8');
    return sendJson(response, 200, { id: file.slice(0, -3), file });
  }
  return sendJson(response, 404, { error: 'Not found.' });
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://localhost:${port}`);
    if (url.pathname.startsWith('/api/')) return await handleApi(request, response, url.pathname);
    const requested = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
    const file = path.resolve(publicRoot, requested);
    if (!file.startsWith(path.resolve(publicRoot))) return sendJson(response, 400, { error: 'Invalid path.' });
    try {
      await fs.access(file);
    } catch {
      return sendJson(response, 404, { error: 'Not found.' });
    }
    const extension = path.extname(file);
    const type = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml' }[extension] || 'text/plain';
    response.writeHead(200, { 'Content-Type': `${type}; charset=utf-8` });
    response.end(await fs.readFile(file));
  } catch (error) {
    console.error(error);
    if (!response.headersSent) sendJson(response, 500, { error: 'The editor could not complete that request.' });
  }
});

server.listen(port, () => console.log(`Editor running at http://localhost:${port}`));
