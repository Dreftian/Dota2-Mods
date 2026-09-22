#!/usr/bin/env node
/**
 * Upload built release binaries to GitHub Releases for tag v1.0.10.
 */
import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const tag = `v${pkg.version}`;
const repo = 'Dreftian/Dota2-Mods';

function getToken() {
  if (process.env.GH_TOKEN) return process.env.GH_TOKEN;
  try {
    const cred = cp.execSync('git credential fill', {
      input: 'protocol=https\nhost=github.com\n',
      stdio: ['pipe', 'pipe', 'ignore'],
    }).toString();
    const match = cred.match(/password=(.+)/);
    if (match) return match[1].trim();
  } catch {
    // ignore
  }
  throw new Error('No GitHub token found');
}

async function main() {
  const token = getToken();
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'Node-Release-Uploader',
  };

  console.log(`Checking release for ${tag}...`);
  let release;
  const res = await fetch(`https://api.github.com/repos/${repo}/releases/tags/${tag}`, { headers });
  if (res.ok) {
    release = await res.json();
    console.log(`Found existing release: ${release.html_url}`);
  } else if (res.status === 404) {
    // Check drafts
    const allRes = await fetch(`https://api.github.com/repos/${repo}/releases`, { headers });
    const all = await allRes.json();
    release = all.find(r => r.tag_name === tag);
    if (release) {
      console.log(`Found draft release: ${release.html_url}`);
    } else {
      console.log(`Creating release for ${tag}...`);
      const changelog = fs.readFileSync(path.join(root, 'CHANGELOG.md'), 'utf8');
      const section = changelog.split(`## ${pkg.version}`)[1]?.split(/## \d+\.\d+\.\d+/)[0]?.trim() || '';
      const createRes = await fetch(`https://api.github.com/repos/${repo}/releases`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tag_name: tag,
          name: `v${pkg.version}`,
          body: section,
          draft: false,
          prerelease: false,
        }),
      });
      if (!createRes.ok) {
        throw new Error(`Failed to create release: ${createRes.status} ${await createRes.text()}`);
      }
      release = await createRes.json();
      console.log(`Created release: ${release.html_url}`);
    }
  } else {
    throw new Error(`Failed to fetch release: ${res.status} ${await res.text()}`);
  }

  // Ensure release is published, not draft
  if (release.draft) {
    console.log('Publishing draft release...');
    const pubRes = await fetch(release.url, {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ draft: false }),
    });
    if (pubRes.ok) {
      release = await pubRes.json();
      console.log(`Published release: ${release.html_url}`);
    }
  }

  const filesToUpload = [
    { name: 'Dota2-Mod-Setup.exe', file: path.join(root, 'Install', 'Dota2-Mod-Setup.exe'), type: 'application/vnd.microsoft.portable-executable' },
    { name: 'Dota2.Mod.exe', file: path.join(root, 'Install', 'Dota2.Mod.exe'), type: 'application/vnd.microsoft.portable-executable' },
    { name: 'latest.yml', file: path.join(root, 'Install', 'latest.yml'), type: 'text/yaml' },
    { name: 'portable.yml', file: path.join(root, 'Install', 'portable.yml'), type: 'text/yaml' },
  ];

  for (const item of filesToUpload) {
    if (!fs.existsSync(item.file)) {
      console.log(`Skipping missing file: ${item.name}`);
      continue;
    }

    const existing = release.assets?.find(a => a.name === item.name);
    if (existing) {
      console.log(`Deleting existing asset ${item.name} (${existing.id})...`);
      await fetch(`https://api.github.com/repos/${repo}/releases/assets/${existing.id}`, {
        method: 'DELETE',
        headers,
      });
    }

    console.log(`Uploading ${item.name} (${(fs.statSync(item.file).size / (1024 * 1024)).toFixed(2)} MB)...`);
    const uploadUrl = release.upload_url.replace(/\{(\?.*)?\}$/, `?name=${encodeURIComponent(item.name)}`);
    const fileBuf = fs.readFileSync(item.file);
    const upRes = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': item.type,
        'Content-Length': fileBuf.length,
      },
      body: fileBuf,
    });
    if (!upRes.ok) {
      throw new Error(`Failed to upload ${item.name}: ${upRes.status} ${await upRes.text()}`);
    }
    console.log(`Uploaded ${item.name} successfully.`);
  }

  console.log(`Release ${tag} is live at: ${release.html_url}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
