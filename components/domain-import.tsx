'use client';
import { useRef, useState } from 'react';
import { FileSpreadsheet, Upload, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type DomainRow = [string, string, string, string, string, string];
const validDomain =
  /^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

function parseCsv(text: string) {
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter(Boolean);
  if (!lines.length) return [];
  const cells = lines.map((line) => {
    const values: string[] = [];
    let value = '';
    let quoted = false;
    for (let index = 0; index < line.length; index += 1) {
      const char = line[index];
      if (char === '"' && quoted && line[index + 1] === '"') {
        value += '"';
        index += 1;
      } else if (char === '"') quoted = !quoted;
      else if (char === ',' && !quoted) {
        values.push(value.trim());
        value = '';
      } else value += char;
    }
    values.push(value.trim());
    return values;
  });
  const header = cells[0].map((cell) => cell.toLowerCase());
  const domainIndex = header.findIndex((cell) =>
    ['domain', 'domain_name', 'website', 'url'].includes(cell),
  );
  const start = domainIndex >= 0 ? 1 : 0;
  const column = domainIndex >= 0 ? domainIndex : 0;
  return cells
    .slice(start)
    .map((row) => row[column] ?? '')
    .filter(Boolean);
}

export default function DomainImport({
  open,
  onOpenChange,
  onImported,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: (rows: DomainRow[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [domains, setDomains] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<null | {
    importedCount: number;
    duplicateCount: number;
    invalidCount: number;
  }>(null);

  async function selectFile(file?: File) {
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
    const parsed = parseCsv(await file.text());
    if (!parsed.length) {
      setError('No domains were found in this file.');
      return;
    }
    setFileName(file.name);
    setDomains(parsed.slice(0, 1000));
  }

  async function importDomains() {
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/domains', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domains }),
      });
      const data = (await response.json()) as {
        error?: string;
        imported?: string[];
        importedCount?: number;
        duplicateCount?: number;
        invalidCount?: number;
      };
      if (!response.ok || !data.imported) {
        setError(data.error || 'Domains could not be imported.');
        return;
      }
      onImported(
        data.imported.map((domain) => [
          domain,
          'Pending',
          'Pending',
          'Selector needed',
          'Pending',
          '0',
        ]),
      );
      setResult({
        importedCount: data.importedCount ?? 0,
        duplicateCount: data.duplicateCount ?? 0,
        invalidCount: data.invalidCount ?? 0,
      });
    } catch {
      setError('Import failed. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    setFileName('');
    setDomains([]);
    setResult(null);
    setError('');
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="domain-dialog domain-import-dialog">
        <DialogHeader>
          <DialogTitle>Import domains</DialogTitle>
          <DialogDescription>
            Upload a CSV with a domain column. Up to 1,000 domains per import.
          </DialogDescription>
        </DialogHeader>
        {result ? (
          <div className="domain-import-result">
            <FileSpreadsheet />
            <h3>Import complete</h3>
            <p>{result.importedCount} domains added</p>
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
              <span>Accepted format: .csv · Maximum size: 5 MB</span>
            </button>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              hidden
              onChange={(event) => void selectFile(event.target.files?.[0])}
            />
            {domains.length > 0 && (
              <div className="domain-preview">
                <div>
                  <b>{domains.length} rows found</b>
                  <button onClick={reset} aria-label="Remove file">
                    <X />
                  </button>
                </div>
                <ul>
                  {domains.slice(0, 5).map((domain, index) => (
                    <li key={`${domain}-${index}`}>
                      <span>{domain}</span>
                      <em>
                        {validDomain.test(
                          domain
                            .toLowerCase()
                            .replace(/^https?:\/\//, '')
                            .replace(/\/.*$/, '')
                            .replace(/^www\./, ''),
                        )
                          ? 'Ready'
                          : 'Invalid'}
                      </em>
                    </li>
                  ))}
                </ul>
                {domains.length > 5 && <p>+ {domains.length - 5} more rows</p>}
              </div>
            )}
            {error && <p className="domain-error">{error}</p>}
            <div className="domain-actions">
              <button type="button" onClick={() => onOpenChange(false)}>
                Cancel
              </button>
              <button
                className="primary-action"
                disabled={!domains.length || saving}
                onClick={() => void importDomains()}
              >
                {saving
                  ? 'Importing…'
                  : `Import ${domains.length || ''} domains`}
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
