const apiBase = 'https://api.github.com';

function config(env) {
  const required = ['GITHUB_TOKEN', 'GITHUB_OWNER', 'GITHUB_REPO', 'GITHUB_BRANCH'];
  const missing = required.filter((key) => !env[key]);
  if (missing.length) throw new Error(`Missing editor configuration: ${missing.join(', ')}`);
  return env;
}

function headers(env) {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${config(env).GITHUB_TOKEN}`,
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

function repositoryUrl(env, filePath = '') {
  const { GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH } = config(env);
  return `${apiBase}/repos/${encodeURIComponent(GITHUB_OWNER)}/${encodeURIComponent(GITHUB_REPO)}/contents/${filePath}?ref=${encodeURIComponent(GITHUB_BRANCH)}`;
}

async function github(env, url, options = {}) {
  const response = await fetch(url, { ...options, headers: { ...headers(env), ...(options.headers || {}) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || `GitHub request failed (${response.status}).`);
  return data;
}

export async function listContentFiles(env, type) {
  const directory = type === 'note' ? 'src/content/notes' : 'src/content/posts';
  const files = await github(env, repositoryUrl(env, directory));
  return files.filter((file) => file.type === 'file' && file.name.endsWith('.md'));
}

export async function readContentFile(env, file) {
  const data = await github(env, repositoryUrl(env, file.path));
  return {
    ...file,
    sha: data.sha,
    source: new TextDecoder().decode(Uint8Array.from(atob(data.content.replace(/\n/g, '')), (character) => character.charCodeAt(0))),
  };
}

function toBase64(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary);
}

export async function writeContentFile(env, filePath, source, sha, message) {
  const body = {
    message,
    content: toBase64(source),
    branch: config(env).GITHUB_BRANCH,
  };
  if (sha) body.sha = sha;
  const result = await github(env, repositoryUrl(env, filePath), {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  return { ...result, sha: result.content?.sha };
}

export async function deleteContentFile(env, filePath, sha, message) {
  return github(env, repositoryUrl(env, filePath), {
    method: 'DELETE',
    body: JSON.stringify({ message, sha, branch: config(env).GITHUB_BRANCH }),
  });
}
