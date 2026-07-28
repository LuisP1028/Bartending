'use client';

import React, { useState, type CSSProperties } from 'react';

type Props = {
  open: boolean;
  onClose: () => void;
  onRegistered?: (result: {
    characterId: string;
    displayName: string;
    sitSrc?: string;
  }) => void;
};

const backdrop: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 10000,
  background: 'rgba(0,0,0,0.55)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 16,
};

const panel: CSSProperties = {
  background: '#1a1816',
  color: '#f2ebe3',
  border: '2px solid #c4a574',
  borderRadius: 8,
  maxWidth: 420,
  width: '100%',
  padding: '16px 18px 18px',
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  fontFamily: 'system-ui, sans-serif',
};

const inputStyle: CSSProperties = {
  padding: 8,
  borderRadius: 4,
  border: '1px solid #555',
  background: '#2a2622',
  color: '#f2ebe3',
};

const labelStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  fontSize: '0.85rem',
};

/**
 * Capture name + email/phone (+ photo). Creates patron folder server-side.
 */
export default function PatronSignupForm({
  open,
  onClose,
  onRegistered,
}: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [runPipeline, setRunPipeline] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  if (!open) return null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    if (!email.trim() && !phone.trim()) {
      setError('Email or phone is required');
      return;
    }
    if (runPipeline && !photo) {
      setError('Photo required when generating art');
      return;
    }

    const body = new FormData();
    body.set('name', name.trim());
    if (email.trim()) body.set('email', email.trim());
    if (phone.trim()) body.set('phone', phone.trim());
    if (runPipeline) body.set('runPipeline', '1');
    if (photo) body.set('photo', photo);

    setBusy(true);
    try {
      const res = await fetch('/api/patrons/register', {
        method: 'POST',
        body,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || res.statusText);
      }
      setResult(
        [
          `Folder: ${data.characterId}`,
          data.registered?.inserted
            ? 'Registered in characters.ts'
            : 'Already registered',
          data.pipeline?.ok
            ? 'Pipeline finished'
            : data.pipeline
              ? `Pipeline: ${data.pipeline.error || 'failed'}`
              : 'Folder + meta only',
        ].join(' · ')
      );
      onRegistered?.({
        characterId: data.characterId,
        displayName: data.displayName,
        sitSrc: data.sitSrc,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={backdrop} role="dialog" aria-modal="true" aria-label="Join the bar">
      <form style={panel} onSubmit={onSubmit}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h2 style={{ margin: 0, fontSize: '1.15rem' }}>Join the bar</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#f2ebe3',
              fontSize: '1.4rem',
              cursor: 'pointer',
            }}
          >
            ×
          </button>
        </div>
        <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.85, lineHeight: 1.35 }}>
          Creates a folder from your name plus a hash of your email or phone.
          Contact is not stored in public meta (hash only).
        </p>
        <label style={labelStyle}>
          Name *
          <input
            style={inputStyle}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            required
          />
        </label>
        <label style={labelStyle}>
          Email
          <input
            style={inputStyle}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </label>
        <label style={labelStyle}>
          Phone
          <input
            style={inputStyle}
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
          />
        </label>
        <label style={labelStyle}>
          Selfie / photo
          <input
            style={inputStyle}
            type="file"
            accept="image/*"
            onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
          />
        </label>
        <label
          style={{
            ...labelStyle,
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 8,
            fontSize: '0.8rem',
          }}
        >
          <input
            type="checkbox"
            checked={runPipeline}
            onChange={(e) => setRunPipeline(e.target.checked)}
          />
          Generate walk/sit art now (server needs XAI_API_KEY; may take minutes)
        </label>
        {error && (
          <p style={{ color: '#ff8a80', margin: 0, fontSize: '0.85rem' }}>{error}</p>
        )}
        {result && (
          <p style={{ color: '#a5d6a7', margin: 0, fontSize: '0.85rem' }}>{result}</p>
        )}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 8,
            marginTop: 6,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            style={{
              padding: '8px 12px',
              borderRadius: 4,
              border: '1px solid #c4a574',
              background: '#3d3429',
              color: '#f2ebe3',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            style={{
              padding: '8px 12px',
              borderRadius: 4,
              border: '1px solid #c4a574',
              background: '#6b5344',
              color: '#f2ebe3',
              cursor: busy ? 'wait' : 'pointer',
              opacity: busy ? 0.6 : 1,
            }}
          >
            {busy ? 'Working…' : 'Create patron folder'}
          </button>
        </div>
      </form>
    </div>
  );
}
