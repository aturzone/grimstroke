/**
 * The keys to the services, kept where only the user can read them.
 *
 * One file, `tokens.json` in the workspace, written with mode 0600 and never included in an
 * archive (the archive packs boards, notebooks, assets, the profile and settings -- not this),
 * never sent to the browser, never put in a notebook. A notebook says which repository it is
 * about; the key to that repository stays on this machine.
 *
 * Keyed by host, so every notebook connected to the same GitLab uses the one key for it.
 */

import { execFile } from 'node:child_process';
import { chmod, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Provider } from '@core/git/model.ts';

export interface HostKey {
  provider: Provider;
  /** The token itself; absent when it is read from `gh` each time. */
  token?: string;
  /** Read the token from the GitHub CLI, which is already signed in, instead of keeping one. */
  gh?: boolean;
  /** Who the token belongs to, as the service said when it was tested. */
  user?: string;
  savedAt: string;
  /** For webhooks from this host: the secret they are signed with. */
  hookSecret?: string;
  /** An OAuth token (a browser sign-in), sent as a bearer token rather than a private token. */
  bearer?: boolean;
}

export interface KeyFile {
  hosts: Record<string, HostKey>;
}

export class Tokens {
  private readonly path: string;

  constructor(dir: string) {
    this.path = join(dir, 'tokens.json');
  }

  async read(): Promise<KeyFile> {
    try {
      const parsed = JSON.parse(await readFile(this.path, 'utf8')) as KeyFile;
      return { hosts: parsed.hosts ?? {} };
    } catch {
      return { hosts: {} };
    }
  }

  private async write(file: KeyFile): Promise<void> {
    await writeFile(this.path, `${JSON.stringify(file, null, 2)}\n`, { mode: 0o600 });
    // writeFile's mode only applies to a new file; an old one keeps whatever it had.
    await chmod(this.path, 0o600);
  }

  async put(host: string, key: HostKey): Promise<void> {
    const file = await this.read();
    file.hosts[host] = key;
    await this.write(file);
  }

  async get(host: string): Promise<HostKey | undefined> {
    return (await this.read()).hosts[host];
  }

  async remove(host: string): Promise<void> {
    const file = await this.read();
    delete file.hosts[host];
    await this.write(file);
  }

  /** The token for a host, reading it from `gh` if that is how it was set up. */
  async token(host: string): Promise<string | undefined> {
    const key = (await this.read()).hosts[host];
    if (!key) return undefined;
    if (key.gh) return ghToken(host);
    return key.token;
  }

  /** Which hosts have a key, and for which service -- never the keys themselves. */
  async summary(): Promise<
    Array<{ host: string; provider: Provider; user?: string; gh?: boolean }>
  > {
    const file = await this.read();
    return Object.entries(file.hosts).map(([host, key]) => ({
      host,
      provider: key.provider,
      ...(key.user ? { user: key.user } : {}),
      ...(key.gh ? { gh: true } : {}),
    }));
  }
}

/** The GitHub CLI's token for a host, if it is installed and signed in there. */
export function ghToken(host = 'github.com'): Promise<string | undefined> {
  return new Promise((done) => {
    execFile('gh', ['auth', 'token', '--hostname', host], { timeout: 5000 }, (error, stdout) => {
      const token = stdout.trim();
      done(error || !token ? undefined : token);
    });
  });
}
