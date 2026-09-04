'use client';
import { useState } from 'react';
import { Globe2, ShieldCheck } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
type DomainRow = [string, string, string, string, string, string];
export default function AddDomain({
  open,
  onOpenChange,
  onAdded,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAdded: (row: DomainRow) => void;
}) {
  const [domain, setDomain] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  async function submit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain }),
      });
      const data = (await response.json()) as {
        error?: string;
        domain?: { domain: string };
      };
      if (!response.ok || !data.domain) {
        setError(data.error || 'Domain could not be added.');
        return;
      }
      onAdded([
        data.domain.domain,
        'Pending',
        'Pending',
        'Selector needed',
        'Pending',
        '0',
      ]);
      setDomain('');
      onOpenChange(false);
    } catch {
      setError(
        'Domain could not be added. Check your connection and try again.',
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="domain-dialog">
        <DialogHeader>
          <DialogTitle>Add sending domain</DialogTitle>
          <DialogDescription>
            Add a domain to monitor its sending readiness and DNS configuration.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => void submit(e)}>
          <label className="domain-label" htmlFor="domain">
            Domain name
          </label>
          <div className="domain-input">
            <Globe2 size={17} />
            <input
              id="domain"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="example.com"
              autoComplete="off"
            />
          </div>
          {error && <p className="domain-error">{error}</p>}
          <div className="domain-info">
            <ShieldCheck />
            <p>
              <b>DNS checks start after the domain is added.</b>
              <span>
                SPF, DMARC and MX will remain pending until verified. DKIM needs
                a selector.
              </span>
            </p>
          </div>
          <div className="domain-actions">
            <button type="button" onClick={() => onOpenChange(false)}>
              Cancel
            </button>
            <button
              className="primary-action"
              disabled={saving || !domain.trim()}
            >
              {saving ? 'Adding domain…' : 'Add domain'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
