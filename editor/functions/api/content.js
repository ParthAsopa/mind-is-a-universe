import { requireEditor } from '../_lib/auth.js';
import { deleteContentFile, listContentFiles, readContentFile, writeContentFile } from '../_lib/github.js';
import { contentPath, itemFromSource, serialize } from '../_lib/content.js';

async function allItems(env, type) {
  const files = await listContentFiles(env, type);
  return Promise.all(files.map(async (file) => {
    const content = await readContentFile(env, file);
    return itemFromSource(type, file, content.source, content.sha);
  }));
}

export async function onRequestGet({ request, env }) {
  const denied = requireEditor(request, env);
  if (denied) return denied;
  try {
    const [posts, notes] = await Promise.all([allItems(env, 'post'), allItems(env, 'note')]);
    return Response.json({ posts, notes });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 502 });
  }
}

export async function onRequestPost({ request, env }) {
  const denied = requireEditor(request, env);
  if (denied) return denied;
  try {
    const item = await request.json();
    const path = contentPath(item);
    const source = serialize(item);
    const result = await writeContentFile(env, path, source, item.sha, `${item.draft ? 'Save draft' : 'Publish'} ${path}`);
    if (item.path && item.path !== path) await deleteContentFile(env, item.path, item.sha, `Rename ${item.path} to ${path}`);
    return Response.json({ id: path.split('/').pop().slice(0, -3), file: path.split('/').pop(), sha: result.sha, commit: result.commit?.sha });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }
}
