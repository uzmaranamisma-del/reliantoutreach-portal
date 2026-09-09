import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { test } from 'node:test';
import ts from 'typescript';

const moduleUrl = (source) =>
  `data:text/javascript;base64,${Buffer.from(ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText).toString('base64')}`;
const cryptoSource = await readFile(
  new URL('../lib/crypto.ts', import.meta.url),
  'utf8',
);
const loadCrypto = (key) =>
  import(
    moduleUrl(
      cryptoSource.replaceAll(
        'process.env.ENCRYPTION_KEY',
        JSON.stringify(key),
      ),
    )
  );
const cryptography = await loadCrypto(randomBytes(32).toString('base64'));
const responseSource = await readFile(
  new URL('../lib/response-json.ts', import.meta.url),
  'utf8',
);
const { responseJson } = await import(moduleUrl(responseSource));
const invitationTokenSource = await readFile(
  new URL('../lib/invitation-token.ts', import.meta.url),
  'utf8',
);
const invitationTokens = await import(moduleUrl(invitationTokenSource));

test('invitation tokens are unique, opaque and hash consistently', async () => {
  const first = invitationTokens.createInvitationToken();
  const second = invitationTokens.createInvitationToken();
  assert.match(first, /^[a-f0-9]{64}$/);
  assert.notEqual(first, second);
  assert.equal(
    await invitationTokens.hashInvitationToken(first),
    await invitationTokens.hashInvitationToken(first),
  );
  assert.notEqual(
    await invitationTokens.hashInvitationToken(first),
    await invitationTokens.hashInvitationToken(second),
  );
});

test('empty, HTML and malformed responses do not throw', async () => {
  for (const body of ['', '<html>Server error</html>', '{', 'null', '[]']) {
    assert.deepEqual(await responseJson(new Response(body)), {});
  }
  assert.deepEqual(
    await responseJson(Response.json({ error: 'Unavailable' })),
    { error: 'Unavailable' },
  );
});

test('credentials encrypt, round-trip and reject tampering', async () => {
  const secret = 'test-only-credential';
  const first = await cryptography.encryptSecret(secret);
  const second = await cryptography.encryptSecret(secret);
  assert.notEqual(first, second);
  assert.ok(!first.includes(secret));
  assert.equal(await cryptography.decryptSecret(first), secret);
  const [iv, payload] = first.split('.');
  const bytes = Buffer.from(payload, 'base64');
  bytes[0] ^= 1;
  await assert.rejects(
    cryptography.decryptSecret(`${iv}.${bytes.toString('base64')}`),
  );
});

test('missing and malformed encryption keys fail closed', async () => {
  for (const key of [undefined, 'invalid!', 'YQ==']) {
    const implementation = await loadCrypto(key);
    await assert.rejects(
      implementation.encryptSecret('test'),
      implementation.EncryptionConfigurationError,
    );
  }
});

// Exercise the real route with an in-memory DB stub. No external API or user records.
const source = await readFile(
  new URL('../app/api/integrations/email/route.ts', import.meta.url),
  'utf8',
);
async function loadRoute(mode) {
  let code = source.replace(/^import .*;\r?\n/gm, '');
  code =
    `
    const integrations = {};
    const and = (...args) => args;
    const eq = (...args) => args;
    class EncryptionConfigurationError extends Error {}
    const encryptSecret = async () => {
      if (${JSON.stringify(mode)} === 'encryption') throw new EncryptionConfigurationError();
      return 'encrypted-test-value';
    };
    const getWorkspaceContext = async () => ({
      role: ${JSON.stringify(mode === 'viewer' ? 'client_viewer' : 'super_admin')}, workspaceId: 'test',
      db: { insert: () => ({ values: () => ({ onConflictDoUpdate: async () => {
        if (${JSON.stringify(mode)} === 'database') throw new Error('private database detail');
      } }) }) }
    });
  ` + code;
  return import(moduleUrl(code));
}
test('route always returns safe JSON on save failures and enforces role', async () => {
  for (const [mode, status] of [
    ['encryption', 503],
    ['database', 500],
    ['viewer', 403],
    ['success', 200],
  ]) {
    const route = await loadRoute(mode);
    const response = await route.POST(
      new Request('http://localhost/api/integrations/email', {
        method: 'POST',
        body: JSON.stringify({
          apiKey: 're_test_key_for_mock_only',
          fromEmail: 'test@example.com',
        }),
      }),
    );
    assert.equal(response.status, status);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    const body = await response.json();
    assert.ok(!JSON.stringify(body).includes('private database detail'));
    assert.ok(!JSON.stringify(body).includes('re_test_key_for_mock_only'));
    if (status === 200) assert.equal(body.connection.status, 'configured');
    else assert.equal(typeof body.error, 'string');
  }
});
