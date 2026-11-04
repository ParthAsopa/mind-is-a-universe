const apiBase = 'https://api.github.com';

function config(env) {
  const required = ['GITHUB_TOKEN', 'GITHUB_OWNER', 'GITHUB_REPO', 'GITHUB_BRANCH'];
  const missing = required.filter((key) => !env[key]);
  if (missing.length) throw new Error(`Missing editor configuration: ${missing.join(', ')}`);
  return env;
}

function headers(env) {
  const token = config(env).GITHUB_TOKEN;
  return {
    Accept: 'application/vnd.github+json',
    Authorization: ['Bearer', token].join(' '),
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'MindIsAUniverseEditor/1.0',
  };
}

function repositoryUrl(env, filePath = '') {
  const { GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH } = config(env);
  const encodedPath = filePath.split('/').map((part) => encodeURIComponent(part)).join('/');
  return `${apiBase}/repos/${encodeURIComponent(GITHUB_OWNER)}/${encodeURIComponent(GITHUB_REPO)}/contents/${encodedPath}?ref=${encodeURIComponent(GITHUB_BRANCH)}`;
}

function sanitizeDiagnostic(value) {
  if (Array.isArray(value)) return value.map(sanitizeDiagnostic);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => {
      if (/authorization|cookie|password|secret|token/i.test(key)) return [key, '[redacted]'];
      return [key, sanitizeDiagnostic(entry)];
    }));
  }
  if (typeof value === 'string') {
    return value.replace(/(bearer\s+|authorization\s*[:=]\s*|cookie\s*[:=]\s*|token\s*[:=]\s*)\S+/gi, '$1[redacted]');
  }
  return value;
}

async function github(env, url, options = {}) {
  const response = await fetch(url, { ...options, headers: { ...headers(env), ...(options.headers || {}) } });
  const responseText = await response.text();
  let data = {};
  try {
    data = responseText ? JSON.parse(responseText) : {};
  } catch {
    data = { body: responseText };
  }
  if (!response.ok) {
    const diagnostic = sanitizeDiagnostic(data);
    console.error('GitHub API request failed', {
      status: response.status,
      statusText: response.statusText,
      body: diagnostic,
    });
    const message = typeof data.message === 'string'
      ? data.message
      : typeof data.body === 'string' && data.body
        ? data.body
        : `GitHub request failed (${response.status}).`;
    throw new Error(`GitHub request failed (${response.status}): ${message}`);
  }
  return data;
}

export async function listContentFiles(env, type) {
  const directory = type === 'note' ? 'src/content/notes' : 'src/content/posts';
  const files = await github(env, repositoryUrl(env, directory));
  if (!Array.isArray(files)) throw new Error(`GitHub returned an unexpected directory response for ${directory}.`);
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
