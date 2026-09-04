'use client';
import { useRef, useState } from 'react';
import { Mail, Upload } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
type Row = [string, string, string, string, string, string];
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function AddEmailAccount({
  open,
  onOpenChange,
  onAdded,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAdded: (row: Row) => void;
}) {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [dailyLimit, setDailyLimit] = useState('35');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/email-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, displayName, dailyLimit }),
      });
      const data = (await response.json()) as {
        error?: string;
        account?: { email: string; domain: string; dailyLimit: number };
      };
      if (!response.ok || !data.account) {
        setError(data.error || 'Email account could not be added.');
        return;
      }
      onAdded([
        data.account.email,
        data.account.domain,
        'Registered',
        String(data.account.dailyLimit),
        '0',
        'Pending',
      ]);
      setEmail('');
      setDisplayName('');
      setDailyLimit('35');
      onOpenChange(false);
    } catch {
      setError('Email account could not be added. Try again.');
    } finally {
      setSaving(false);
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="domain-dialog">
        <DialogHeader>
          <DialogTitle>Add email account</DialogTitle>
          <DialogDescription>
            Register an existing sending account for monitoring.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => void submit(e)}>
          <label className="domain-label" htmlFor="account-email">
            Email address
          </label>
          <div className="domain-input">
            <Mail size={17} />
            <input
              id="account-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="sender@example.com"
            />
          </div>
          <div className="email-form-grid">
            <label>
              <span>Display name</span>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Alex Morgan"
              />
            </label>
            <label>
              <span>Daily send limit</span>
              <input
                type="number"
                min="1"
                max="500"
                value={dailyLimit}
                onChange={(e) => setDailyLimit(e.target.value)}
              />
            </label>
          </div>
          {error && <p className="domain-error">{error}</p>}
          <div className="domain-actions">
            <button type="button" onClick={() => onOpenChange(false)}>
              Cancel
            </button>
            <button
              className="primary-action"
              disabled={saving || !emailPattern.test(email)}
            >
              {saving ? 'Adding…' : 'Add account'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
function parseLine(line: string) {
  const out: string[] = [];
  let value = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"' && quoted && line[i + 1] === '"') {
      value += '"';
      i += 1;
    } else if (char === '"') quoted = !quoted;
    else if (char === ',' && !quoted) {
      out.push(value.trim());
      value = '';
    } else value += char;
  }
  out.push(value.trim());
  return out;
}

export function ImportEmailAccounts({
  open,
  onOpenChange,
  onImported,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onImported: (rows: Row[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [accounts, setAccounts] = useState<
    Array<{ email: string; displayName: string; dailyLimit: string }>
  >([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{
    importedCount: number;
    duplicateCount: number;
    invalidCount: number;
  } | null>(null);
  async function choose(file?: File) {
    setError('');
    setResult(null);
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Please select a CSV file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('CSV file must be smaller than 5 MB.');
      return;
    }
    const lines = (await file.text())
      .replace(/^\uFEFF/, '')
      .split(/\r?\n/)
      .filter(Boolean)
      .map(parseLine);
    if (!lines.length) return;
    const headers = lines[0].map((v) => v.toLowerCase());
    const emailIndex = headers.findIndex((v) =>
      ['email', 'email_address', 'mailbox'].includes(v),
    );
    const nameIndex = headers.findIndex((v) =>
      ['display_name', 'name', 'sender_name'].includes(v),
    );
    const limitIndex = headers.findIndex((v) =>
      ['daily_limit', 'send_limit'].includes(v),
    );
    const start = emailIndex >= 0 ? 1 : 0;
    const column = emailIndex >= 0 ? emailIndex : 0;
    const parsed = lines
      .slice(start)
      .map((row) => ({
        email: row[column] || '',
        displayName: nameIndex >= 0 ? row[nameIndex] || '' : '',
        dailyLimit: limitIndex >= 0 ? row[limitIndex] || '35' : '35',
      }))
      .filter((row) => row.email)
      .slice(0, 1000);
    if (!parsed.length) {
      setError('No email accounts were found.');
      return;
    }
    setFileName(file.name);
    setAccounts(parsed);
  }
  async function runImport() {
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/email-accounts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accounts }),
      });
      const data = (await response.json()) as {
        error?: string;
        imported?: Array<{ email: string; domain: string; dailyLimit: number }>;
        importedCount?: number;
        duplicateCount?: number;
        invalidCount?: number;
      };
      if (!response.ok || !data.imported) {
        setError(data.error || 'Import failed.');
        return;
      }
      onImported(
        data.imported.map((item) => [
          item.email,
          item.domain,
          'Registered',
          String(item.dailyLimit || 35),
          '0',
          'Pending',
        ]),
      );
      setResult({
        importedCount: data.importedCount || 0,
        duplicateCount: data.duplicateCount || 0,
        invalidCount: data.invalidCount || 0,
      });
    } catch {
      setError('Import failed. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="domain-dialog domain-import-dialog">
        <DialogHeader>
          <DialogTitle>Import email accounts</DialogTitle>
          <DialogDescription>
            CSV columns: email, display_name and daily_limit. Up to 1,000 rows.
          </DialogDescription>
        </DialogHeader>
        {result ? (
          <div className="domain-import-result">
            <Mail />
            <h3>Import complete</h3>
            <p>{result.importedCount} email accounts added</p>
            <div>
              <span>{result.duplicateCount} duplicates skipped</span>
              <span>{result.invalidCount} invalid skipped</span>
            </div>
            <button
              className="primary-action"
              onClick={() => onOpenChange(false)}
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <button
              className="domain-dropzone"
              onClick={() => inputRef.current?.click()}
            >
              <Upload />
              <b>{fileName || 'Choose a CSV file'}</b>
              <span>.csv · Maximum 5 MB</span>
            </button>
            <input
              ref={inputRef}
              hidden
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => void choose(e.target.files?.[0])}
            />
            {accounts.length > 0 && (
              <div className="domain-preview">
                <div>
                  <b>{accounts.length} rows found</b>
                </div>
                <ul>
                  {accounts.slice(0, 5).map((account, i) => (
                    <li key={`${account.email}-${i}`}>
                      <span>{account.email}</span>
                      <em>
                        {emailPattern.test(account.email) ? 'Ready' : 'Invalid'}
                      </em>
                    </li>
                  ))}
                </ul>
                {accounts.length > 5 && (
                  <p>+ {accounts.length - 5} more rows</p>
                )}
              </div>
            )}
            {error && <p className="domain-error">{error}</p>}
            <div className="domain-actions">
              <button type="button" onClick={() => onOpenChange(false)}>
                Cancel
              </button>
              <button
                className="primary-action"
                disabled={!accounts.length || saving}
                onClick={() => void runImport()}
              >
                {saving
                  ? 'Importing…'
                  : `Import ${accounts.length || ''} accounts`}
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
