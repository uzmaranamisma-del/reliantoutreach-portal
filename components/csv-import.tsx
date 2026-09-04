'use client';

import { useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  Upload,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type CsvRow = Record<string, string>;
type ImportedRow = [string, string, string, string, string, string];

function parseCsv(text: string): { headers: string[]; rows: CsvRow[] } {
  const lines: string[][] = [];
  let row: string[] = [],
    field = '',
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"' && quoted && text[i + 1] === '"') {
      field += '"';
      i++;
    } else if (char === '"') quoted = !quoted;
    else if (char === ',' && !quoted) {
      row.push(field.trim());
      field = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[i + 1] === '\n') i++;
      row.push(field.trim());
      if (row.some(Boolean)) lines.push(row);
      row = [];
      field = '';
    } else field += char;
  }
  row.push(field.trim());
  if (row.some(Boolean)) lines.push(row);
  const headers = (lines.shift() ?? []).map((h) =>
    h.toLowerCase().replace(/\s+/g, '_'),
  );
  return {
    headers,
    rows: lines.map((values) =>
      Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ''])),
    ),
  };
}

const pick = (row: CsvRow, ...keys: string[]) =>
  keys.map((k) => row[k]).find(Boolean) ?? '';

export default function CsvImport({
  open,
  onOpenChange,
  onImport,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (rows: ImportedRow[]) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [stage, setStage] = useState<'upload' | 'preview' | 'complete'>(
    'upload',
  );
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const validation = useMemo(() => {
    const seen = new Set<string>();
    let invalid = 0,
      missing = 0,
      duplicates = 0;
    const valid = rows.filter((row) => {
      const email = pick(row, 'email', 'work_email', 'email_address')
        .trim()
        .toLowerCase();
      if (!email) {
        missing++;
        return false;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        invalid++;
        return false;
      }
      if (seen.has(email)) {
        duplicates++;
        return false;
      }
      seen.add(email);
      return true;
    });
    return { valid, invalid, missing, duplicates };
  }, [rows]);
  async function choose(file?: File) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Please select a CSV file.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('CSV files must be smaller than 10 MB.');
      return;
    }
    const parsed = parseCsv(await file.text());
    if (!parsed.headers.length || !parsed.rows.length) {
      setError('This CSV does not contain any prospect rows.');
      return;
    }
    if (
      !parsed.headers.some((h) =>
        ['email', 'work_email', 'email_address'].includes(h),
      )
    ) {
      setError(
        'Map an email column by naming it email, work_email, or email_address.',
      );
      return;
    }
    setError('');
    setFileName(file.name);
    setHeaders(parsed.headers);
    setRows(parsed.rows);
    setStage('preview');
  }
  async function importRows() {
    setSaving(true);
    setError('');
    const payload = validation.valid.map((row) => ({
      email: pick(row, 'email', 'work_email', 'email_address'),
      firstName: pick(row, 'first_name', 'firstname'),
      lastName: pick(row, 'last_name', 'lastname'),
      jobTitle: pick(row, 'job_title', 'title'),
    }));
    const response = await fetch('/api/prospects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows: payload }),
    });
    if (!response.ok) {
      setSaving(false);
      setError('Prospects could not be saved. Please try again.');
      return;
    }
    onImport(
      validation.valid.map((row) => {
        const first = pick(row, 'first_name', 'firstname');
        const last = pick(row, 'last_name', 'lastname');
        return [
          `${first} ${last}`.trim() ||
            pick(row, 'full_name', 'name') ||
            pick(row, 'email', 'work_email', 'email_address'),
          pick(row, 'company', 'company_name') || '—',
          pick(row, 'job_title', 'title') || '—',
          pick(row, 'campaign') || 'Unassigned',
          'Imported',
          'Just now',
        ];
      }),
    );
    setSaving(false);
    setStage('complete');
  }
  function close(value: boolean) {
    onOpenChange(value);
    if (!value)
      setTimeout(() => {
        setStage('upload');
        setRows([]);
        setFileName('');
        setError('');
      }, 200);
  }
  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="csv-dialog" showCloseButton>
        <DialogHeader>
          <DialogTitle>Import prospects</DialogTitle>
          <DialogDescription>
            Upload and validate a CSV before adding prospects to this workspace.
          </DialogDescription>
        </DialogHeader>
        <div className="import-steps">
          <span className={stage === 'upload' ? 'current' : 'done'}>
            1 Upload
          </span>
          <i />
          <span
            className={
              stage === 'preview'
                ? 'current'
                : stage === 'complete'
                  ? 'done'
                  : ''
            }
          >
            2 Validate
          </span>
          <i />
          <span className={stage === 'complete' ? 'current' : ''}>
            3 Complete
          </span>
        </div>
        {stage === 'upload' && (
          <>
            <button
              className="dropzone"
              onClick={() => input.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                void choose(e.dataTransfer.files[0]);
              }}
            >
              <Upload size={24} />
              <b>Choose a CSV file</b>
              <span>or drag and drop it here</span>
              <small>Maximum file size: 10 MB</small>
            </button>
            <input
              ref={input}
              type="file"
              accept=".csv,text/csv"
              hidden
              onChange={(e) => void choose(e.target.files?.[0])}
            />
            {error && (
              <p className="import-error">
                <AlertCircle size={15} />
                {error}
              </p>
            )}
            <p className="csv-hint">
              <b>Required:</b> email, work_email, or email_address. Optional:
              first_name, last_name, company, job_title, campaign.
            </p>
          </>
        )}
        {stage === 'preview' && (
          <>
            <div className="file-summary">
              <FileSpreadsheet size={22} />
              <span>
                <b>{fileName}</b>
                <small>
                  {rows.length} rows detected · {headers.length} columns mapped
                </small>
              </span>
            </div>
            <div className="validation-grid">
              <span>
                <b>{validation.valid.length}</b>Ready
              </span>
              <span>
                <b>{validation.duplicates}</b>Duplicates
              </span>
              <span>
                <b>{validation.invalid}</b>Invalid emails
              </span>
              <span>
                <b>{validation.missing}</b>Missing email
              </span>
            </div>
            <div className="preview-table">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Company</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 5).map((row, i) => (
                    <tr key={i}>
                      <td>
                        {`${pick(row, 'first_name')} ${pick(row, 'last_name')}`.trim() ||
                          pick(row, 'name') ||
                          '—'}
                      </td>
                      <td>
                        {pick(row, 'email', 'work_email', 'email_address') ||
                          'Missing'}
                      </td>
                      <td>{pick(row, 'company', 'company_name') || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="import-actions">
              {error && (
                <p className="import-error">
                  <AlertCircle size={15} />
                  {error}
                </p>
              )}
              <button onClick={() => setStage('upload')} disabled={saving}>
                Back
              </button>
              <button
                className="primary-action"
                onClick={() => void importRows()}
                disabled={!validation.valid.length || saving}
              >
                {saving
                  ? 'Saving prospects…'
                  : `Import ${validation.valid.length} prospects`}
              </button>
            </div>
          </>
        )}
        {stage === 'complete' && (
          <div className="import-complete">
            <CheckCircle2 size={38} />
            <h3>Import complete</h3>
            <p>{validation.valid.length} prospects were added successfully.</p>
            <button className="primary-action" onClick={() => close(false)}>
              View prospects
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
