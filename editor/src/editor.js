import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from '@tiptap/markdown';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { common, createLowlight } from 'lowlight';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';

const app = document.querySelector('#app');
const lowlight = createLowlight(common);
let state = { posts: [], notes: [], current: null };
let editor = null;
let sourceView = null;
let originalBody = '';
let dirty = false;
let saveTimer = null;
let currentMode = 'editor';

const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
const slugify = (value) => String(value).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const request = async (url, options) => {
  const response = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...options });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Something went wrong.');
  return data;
};

const editorExtensions = [
  StarterKit.configure({ codeBlock: false }),
  Markdown,
  CodeBlockLowlight.configure({ lowlight }),
  Image.configure({ allowBase64: true }),
  Table.configure({ resizable: true }),
  TableRow,
  TableHeader,
  TableCell,
  Placeholder.configure({ placeholder: 'Begin writing here…' }),
];

function loginView(message = '') {
  app.innerHTML = `<section class="login paper"><span class="eyebrow">Private desk / editor</span><h1>Return to the drafting table.</h1><p>Sign in to publish and revise the writing on Mind is a Universe.</p><form id="login-form"><label>Desk password<input name="password" type="password" autocomplete="current-password" autofocus required /></label><button class="button primary">Open the editor →</button>${message ? `<div class="error">${escapeHtml(message)}</div>` : ''}</form></section>`;
  document.querySelector('#login-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    try { await request('/api/login', { method: 'POST', body: JSON.stringify({ password: new FormData(event.currentTarget).get('password') }) }); await load(); }
    catch (error) { loginView(error.message); }
  });
}

function shell() {
  app.innerHTML = `<div class="shell"><header class="topbar"><div><span class="eyebrow">Mind is a Universe</span><strong>Publishing desk</strong></div><div class="top-actions"><button class="button" id="new-post">＋ Blog post</button><button class="button" id="new-note">＋ Note</button><button class="text-button" id="logout">Lock desk</button></div></header><div class="workspace"><aside class="library paper"><div class="library-head"><span class="eyebrow">Your shelf</span><button class="text-button" id="refresh">Refresh</button></div><div id="library-list"></div></aside><section id="editor-area"></section></div></div>`;
  document.querySelector('#logout').onclick = async () => { await request('/api/logout', { method: 'POST' }); loginView(); };
  document.querySelector('#refresh').onclick = load;
  document.querySelector('#new-post').onclick = () => edit({ type: 'post', title: '', date: new Date().toISOString().slice(0, 10), description: '', tags: [], outline: [], body: '', draft: false });
  document.querySelector('#new-note').onclick = () => edit({ type: 'note', title: '', date: new Date().toISOString().slice(0, 10), text: '', body: '', draft: false });
}

function renderLibrary() {
  const list = document.querySelector('#library-list');
  const entries = [['Blog posts', state.posts], ['Notes', state.notes]];
  list.innerHTML = entries.map(([label, items]) => `<div class="shelf-group"><h3>${label}<span>${items.length}</span></h3>${items.sort((a, b) => b.date.localeCompare(a.date)).map((item) => `<button class="shelf-item ${state.current?.id === item.id && state.current?.type === item.type ? 'selected' : ''}" data-id="${escapeHtml(item.id)}" data-type="${item.type}"><span>${escapeHtml(item.title)}</span><small>${item.draft ? 'Draft' : 'Published'} · ${item.date}</small></button>`).join('') || '<p class="muted">Nothing here yet.</p>'}</div>`).join('');
  list.querySelectorAll('.shelf-item').forEach((button) => { button.onclick = () => edit(state[button.dataset.type === 'post' ? 'posts' : 'notes'].find((item) => item.id === button.dataset.id)); });
}

function toolbar() {
  return `<div class="toolbar" role="toolbar"><select id="block-format" aria-label="Text style"><option value="paragraph">Paragraph</option><option value="heading 1">Heading 1</option><option value="heading 2">Heading 2</option><option value="heading 3">Heading 3</option><option value="blockquote">Quote</option></select><button type="button" data-action="bold"><strong>B</strong></button><button type="button" data-action="italic"><em>I</em></button><button type="button" data-action="strike"><s>S</s></button><button type="button" data-action="code"><code>&lt;/&gt;</code></button><button type="button" data-action="bulletList">• List</button><button type="button" data-action="orderedList">1. List</button><button type="button" data-action="blockquote">❝</button><button type="button" data-action="codeBlock">Code</button><select id="code-language" aria-label="Code language"><option value="">Code language</option><option value="css">CSS</option><option value="javascript">JavaScript</option><option value="typescript">TypeScript</option><option value="bash">Shell</option><option value="json">JSON</option><option value="html">HTML</option></select><button type="button" data-action="link">Link</button><button type="button" data-action="image">Image</button><button type="button" data-action="horizontalRule">Divider</button><button type="button" data-action="undo">↶</button><button type="button" data-action="redo">↷</button><span class="toolbar-spacer"></span><span class="mode-switch" role="group" aria-label="View"><button type="button" class="view-button active" data-view="editor">Editor</button><button type="button" class="view-button" data-view="markdown">Markdown</button><button type="button" class="view-button" data-view="split">Split</button></span></div>`;
}

function outlineRow(item = { label: '', anchor: '' }, index) {
  return `<div class="outline-row" draggable="true" data-index="${index}"><span class="drag-handle" title="Drag to reorder">⋮⋮</span><input class="outline-label" aria-label="Outline label" value="${escapeHtml(item.label)}" /><span>#</span><input class="outline-anchor" aria-label="Heading anchor" value="${escapeHtml(item.anchor)}" /><button type="button" class="remove-outline" title="Remove item">×</button></div>`;
}

function edit(item) {
  if (editor) editor.destroy();
  if (sourceView) sourceView.destroy();
  state.current = item;
  originalBody = item.body || '';
  dirty = false;
  currentMode = 'editor';
  renderLibrary();
  const isPost = item.type === 'post';
  document.querySelector('#editor-area').innerHTML = `<div class="editor-head"><div><span class="eyebrow">${isPost ? 'Long form / folio' : 'Short form / memo'}</span><h1>${item.id ? 'Edit this piece.' : 'Start a new piece.'}</h1></div></div><form id="content-form"><div class="paper form-paper"><div class="field-grid"><label>Title<input id="title" required value="${escapeHtml(item.title)}" /></label><label>Publication date<input id="date" type="date" required value="${escapeHtml(item.date)}" /></label></div>${isPost ? `<label>Short description<input id="description" value="${escapeHtml(item.description)}" placeholder="What is this piece about?" /></label><label>Tags <span class="field-help">comma separated</span><input id="tags" value="${escapeHtml((item.tags || []).join(', '))}" placeholder="design, notes, webdev" /></label><section class="outline-section"><div class="section-head"><div><span class="eyebrow">Folio outline</span><p>Manual navigation shown beside the published folio.</p></div><div class="outline-actions"><button type="button" class="text-button" id="generate-outline">Generate from headings</button><button type="button" class="text-button" id="add-outline">＋ Add item</button></div></div><div id="outline-list">${(item.outline || []).map(outlineRow).join('') || '<p class="outline-empty muted">No outline items yet. Add one to create the folio navigation.</p>'}</div></section>` : `<label>Note text <span class="field-help">kept under 400 characters</span><textarea id="note-text" maxlength="400" rows="3">${escapeHtml(item.text || '')}</textarea></label>`}<label class="draft-toggle"><input id="draft" type="checkbox" ${item.draft ? 'checked' : ''} /> Save as draft (hidden from the public site)</label>${isPost ? `<div class="writing-area">${toolbar()}<div id="editor-shell"><div id="content"></div><div id="markdown-source" aria-label="Markdown source"></div><div id="split-preview" class="split-preview"></div></div><div id="bubble-toolbar" class="bubble-toolbar"><button type="button" data-action="bold"><strong>B</strong></button><button type="button" data-action="italic"><em>I</em></button><button type="button" data-action="strike"><s>S</s></button><button type="button" data-action="link">Link</button></div></div>` : '<div class="note-writing-label">The note is the content.</div>'}<div class="form-actions"><span id="save-status" class="muted">Saved</span><button class="button primary" type="submit">${item.draft ? 'Save draft' : 'Publish to site'} →</button></div></div></form>`;
  if (isPost) setupEditor(item);
  else document.querySelector('#content-form').onsubmit = (event) => save(event, item);
  document.querySelector('#content-form').querySelectorAll('input, textarea').forEach((field) => field.addEventListener('input', () => markUnsaved()));
}

function setupEditor(item) {
  editor = new Editor({ element: document.querySelector('#content'), extensions: editorExtensions, content: item.body || '', contentType: 'markdown', autofocus: false, onUpdate: () => { markUnsaved(); syncSource(); updateSplitPreview(); } });
  document.querySelector('#content-form').onsubmit = (event) => save(event, item);
  document.querySelector('#block-format').onchange = (event) => {
    const value = event.target.value;
    if (value === 'paragraph') editor.chain().focus().setParagraph().run();
    else if (value === 'blockquote') editor.chain().focus().toggleBlockquote().run();
    else editor.chain().focus().setHeading({ level: Number(value.slice(-1)) }).run();
  };
  document.querySelector('#code-language').onchange = (event) => { if (editor.isActive('codeBlock')) editor.chain().focus().updateAttributes('codeBlock', { language: event.target.value || null }).run(); };
  document.querySelectorAll('[data-action]').forEach((button) => {
    button.addEventListener('mousedown', (event) => event.preventDefault());
    button.onclick = () => runAction(button.dataset.action);
  });
  document.querySelectorAll('[data-view]').forEach((button) => button.onclick = () => switchView(button.dataset.view));
  sourceView = new EditorView({
    state: EditorState.create({
      doc: originalBody,
      extensions: [markdown(), oneDark, keymap.of([{ key: 'Mod-s', run: () => { saveCurrent(); return true; } }]), EditorView.updateListener.of((update) => {
        if (update.docChanged) { markUnsaved(); if (currentMode !== 'editor') updateFromSource(); }
      })],
    }),
    parent: document.querySelector('#markdown-source'),
  });
  document.querySelector('#add-outline').onclick = () => { document.querySelector('.outline-empty')?.remove(); document.querySelector('#outline-list').insertAdjacentHTML('beforeend', outlineRow({}, document.querySelectorAll('.outline-row').length)); bindOutline(); markUnsaved(); };
  document.querySelector('#generate-outline').onclick = generateOutline;
  bindOutline();
  document.addEventListener('selectionchange', positionBubbleToolbar);
  document.querySelector('#content').addEventListener('paste', handlePaste);
  document.querySelector('#content').addEventListener('drop', handleDrop);
  document.querySelector('#content').addEventListener('keydown', handleSlashKeydown);
  syncSource();
}

function runAction(action) {
  if (!editor) return;
  if (action === 'bold') editor.chain().focus().toggleBold().run();
  if (action === 'italic') editor.chain().focus().toggleItalic().run();
  if (action === 'strike') editor.chain().focus().toggleStrike().run();
  if (action === 'code') editor.chain().focus().toggleCode().run();
  if (action === 'bulletList') editor.chain().focus().toggleBulletList().run();
  if (action === 'orderedList') editor.chain().focus().toggleOrderedList().run();
  if (action === 'blockquote') editor.chain().focus().toggleBlockquote().run();
  if (action === 'codeBlock') editor.chain().focus().toggleCodeBlock().run();
  if (action === 'horizontalRule') editor.chain().focus().setHorizontalRule().run();
  if (action === 'undo') editor.chain().focus().undo().run();
  if (action === 'redo') editor.chain().focus().redo().run();
  if (action === 'link') {
    const url = prompt('Paste the link URL');
    if (url) editor.chain().focus().setLink({ href: url }).run();
  }

  if (action === 'image') {
    const url = prompt('Paste an image URL');
    if (url) editor.chain().focus().setImage({ src: url, alt: '' }).run();
  }
}

function handleSlashKeydown(event) {
  if (event.key !== '/') return;
  setTimeout(() => {
    const menu = document.createElement('div');
    menu.className = 'slash-menu';
    menu.innerHTML = '<strong>Insert block</strong><button data-slash="heading">Heading</button><button data-slash="bulletList">Bullet list</button><button data-slash="orderedList">Numbered list</button><button data-slash="blockquote">Quote</button><button data-slash="codeBlock">Code block</button><button data-slash="horizontalRule">Divider</button>';
    document.body.appendChild(menu);
    const rect = window.getSelection()?.getRangeAt(0)?.getBoundingClientRect();
    menu.style.left = `${Math.max(12, rect?.left || 12)}px`;
    menu.style.top = `${(rect?.bottom || 60) + 8}px`;
    menu.querySelectorAll('[data-slash]').forEach((button) => button.onclick = () => {
      const action = button.dataset.slash;
      const position = editor.state.selection.from;
      editor.chain().focus().deleteRange({ from: Math.max(1, position - 1), to: position }).run();
      if (action === 'heading') editor.chain().focus().setHeading({ level: 2 }).run();
      else runAction(action);
      menu.remove();
    });
    const close = (closeEvent) => { if (!menu.contains(closeEvent.target)) { menu.remove(); document.removeEventListener('mousedown', close); } };
    document.addEventListener('mousedown', close);
  }, 0);
}

function syncSource() {
  if (!editor) return;
  const source = document.querySelector('#markdown-source');
  if (source && currentMode !== 'markdown') sourceView.dispatch({ changes: { from: 0, to: sourceView.state.doc.length, insert: editor.getMarkdown() } });
}

function updateFromSource() {
  if (!editor) return;
  editor.commands.setContent(sourceView.state.doc.toString(), { contentType: 'markdown' });
  updateSplitPreview();
}

function switchView(mode) {
  if (!editor || mode === currentMode) return;
  if (mode === 'markdown' || mode === 'split') syncSource();
  currentMode = mode;
  document.querySelectorAll('[data-view]').forEach((button) => button.classList.toggle('active', button.dataset.view === mode));
  document.querySelector('#editor-shell').className = `view-${mode}`;
  if (mode === 'editor') updateFromSource();
  if (mode === 'split') updateSplitPreview();
}

function updateSplitPreview() {
  const preview = document.querySelector('#split-preview');
  if (!preview || !editor) return;
  preview.innerHTML = editor.getHTML();
}

function positionBubbleToolbar() {
  const bubble = document.querySelector('#bubble-toolbar');
  const selection = window.getSelection();
  if (!bubble || !selection || selection.isCollapsed || !document.querySelector('#content')?.contains(selection.anchorNode)) { bubble?.classList.remove('visible'); return; }
  const rect = selection.getRangeAt(0).getBoundingClientRect();
  bubble.style.left = `${Math.max(12, rect.left - 40)}px`;
  bubble.style.top = `${Math.max(8, rect.top - 48)}px`;
  bubble.classList.add('visible');
}

function bindOutline() {
  document.querySelectorAll('.remove-outline').forEach((button) => button.onclick = () => { button.closest('.outline-row').remove(); markUnsaved(); });
  let dragged;
  document.querySelectorAll('.outline-row').forEach((row) => {
    row.addEventListener('dragstart', () => { dragged = row; row.classList.add('dragging'); });
    row.addEventListener('dragend', () => { dragged = null; row.classList.remove('dragging'); });
    row.addEventListener('dragover', (event) => { event.preventDefault(); if (dragged && dragged !== row) row.parentElement.insertBefore(dragged, row); });
  });
}

function generateOutline() {
  const existing = [...document.querySelectorAll('.outline-row')];
  if (existing.length && !confirm('Replace the current outline with headings from the document?')) return;
  const fallback = [];
  editor.state.doc.descendants((node) => { if (node.type.name === 'heading' && node.attrs.level >= 2) fallback.push({ label: node.textContent, anchor: slugify(node.textContent) }); });
  document.querySelector('#outline-list').innerHTML = fallback.map(outlineRow).join('') || '<p class="outline-empty muted">No H2 or H3 headings found.</p>';
  bindOutline();
  markUnsaved();
}

function handlePaste(event) {
  const image = [...(event.clipboardData?.items || [])].find((item) => item.type.startsWith('image/'));
  if (!image) return;
  event.preventDefault();
  const file = image.getAsFile();
  const reader = new FileReader();
  reader.onload = () => editor.chain().focus().setImage({ src: reader.result, alt: file.name }).run();
  reader.readAsDataURL(file);
}

function handleDrop(event) {
  const file = [...(event.dataTransfer?.files || [])].find((entry) => entry.type.startsWith('image/'));
  if (!file) return;
  event.preventDefault();
  const reader = new FileReader();
  reader.onload = () => editor.chain().focus().setImage({ src: reader.result, alt: file.name }).run();
  reader.readAsDataURL(file);
}

function markUnsaved() {
  dirty = true;
  const status = document.querySelector('#save-status');
  if (status) { status.textContent = 'Unsaved changes'; status.className = 'muted unsaved'; }
  clearTimeout(saveTimer);
  if (document.querySelector('#draft')?.checked) saveTimer = setTimeout(() => saveCurrent(), 1200);
}

async function saveCurrent() {
  const form = document.querySelector('#content-form');
  if (form) await save({ preventDefault: () => {} }, state.current);
}

function collectItem(original) {
  const isPost = original.type === 'post';
  const { source: originalSource, ...itemWithoutSource } = original;
  const item = { ...itemWithoutSource, title: document.querySelector('#title').value.trim(), slug: original.id || slugify(document.querySelector('#title').value), date: document.querySelector('#date').value, draft: document.querySelector('#draft').checked };
  if (isPost) {
    const source = editor.getMarkdown();
    item.body = !dirty && source === normalize(originalBody) ? originalBody : source;
    if (!dirty && source === normalize(originalBody) && originalSource) item.source = originalSource;
    item.description = document.querySelector('#description').value.trim();
    item.tags = document.querySelector('#tags').value.split(',').map((tag) => tag.trim().toLowerCase()).filter(Boolean);
    item.outline = [...document.querySelectorAll('.outline-row')].map((row) => ({ label: row.querySelector('.outline-label').value.trim(), anchor: row.querySelector('.outline-anchor').value.trim() })).filter((entry) => entry.label && entry.anchor);
  } else {
    item.text = document.querySelector('#note-text').value.trim();
    item.body = '';
  }
  return item;
}

function normalize(value) { return String(value || '').replace(/\r\n/g, '\n').trim(); }

async function save(event, original) {
  event.preventDefault();
  const item = collectItem(original);
  const status = document.querySelector('#save-status');
  status.textContent = 'Saving…';
  status.className = 'muted';
  try {
    const result = await request('/api/content', { method: 'POST', body: JSON.stringify(item) });
    item.id = result.id; item.sha = result.sha || item.sha;
    state[item.type === 'post' ? 'posts' : 'notes'] = [...state[item.type === 'post' ? 'posts' : 'notes'].filter((entry) => entry.id !== original.id && entry.id !== result.id), item];
    state.current = item; originalBody = item.body; dirty = false; renderLibrary();
    status.textContent = item.draft ? 'Saved' : 'Published to the site'; status.className = 'muted saved';
  } catch (error) { status.textContent = error.message; status.className = 'error'; }
}

window.addEventListener('beforeunload', (event) => { if (dirty) { event.preventDefault(); event.returnValue = ''; } });

async function load() {
  try {
    const session = await request('/api/session');
    if (!session.authenticated) return loginView();
    shell();
    state = { ...state, ...(await request('/api/content')) };
    renderLibrary();
    if (state.current) edit(state.current);
    else document.querySelector('#editor-area').innerHTML = '<div class="empty-state paper"><span class="eyebrow">The desk is ready</span><h1>Choose a piece or begin a new one.</h1><p>Everything you publish here becomes part of the main site’s existing content shelf.</p></div>';
  } catch (error) { loginView(error.message); }
}

load();
