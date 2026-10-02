'use client';

import { useEffect, useState } from 'react';

type Props = { friendId: string; friendName: string };

export default function RivalryShareControl({ friendId, friendName }: Props) {
  const [includeDecks, setIncludeDecks] = useState(false);
  const [shareId, setShareId] = useState('');
  const [shareUrl, setShareUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [supportsNativeShare, setSupportsNativeShare] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { setSupportsNativeShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function'); }, []);

  const createShare = async () => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/rivalry-shares', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ friendId, includeDecks }),
      });
      const payload = await response.json();
      if (!response.ok || typeof payload.shareId !== 'string') {
        throw new Error(response.status === 401 ? 'Sign in to create a share link.' : payload.error || 'Could not create a share link.');
      }
      setShareId(payload.shareId);
      setShareUrl(`${window.location.origin}/rivalry/${encodeURIComponent(payload.shareId)}`);
      setMessage('Share link ready. Anyone with the link can view this snapshot.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not create a share link.');
    } finally {
      setBusy(false);
    }
  };

  const revokeLink = async () => {
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`/api/rivalry-shares?shareId=${encodeURIComponent(shareId)}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Could not revoke this share link.');
      }
      setShareUrl('');
      setShareId('');
      setMessage('Share link revoked. It can no longer be viewed.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not revoke this share link.');
    } finally {
      setBusy(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setMessage('Link copied. Send it to a friend or post it wherever you like.');
      setError('');
    } catch {
      setMessage('Copy the link below to share it.');
    }
  };

  const nativeShare = async () => {
    if (!navigator.share) return;
    try {
      await navigator.share({ title: `${friendName} rivalry record`, text: `See our Clash Royale rivalry record.`, url: shareUrl });
      setMessage('Share sheet opened.');
      setError('');
    } catch (reason) {
      if (reason instanceof Error && reason.name !== 'AbortError') setError('Could not open the share sheet. You can copy the link below.');
    }
  };

  return <section className="rounded-lg border border-blue-100 bg-blue-50/70 p-3" aria-label="Share rivalry record">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h3 className="text-sm font-bold text-blue-900">Share your record</h3>
        <p className="mt-1 text-xs leading-5 text-gray-600">Create a public snapshot of your wins and losses with {friendName}.</p>
      </div>
      {!shareUrl && <button type="button" onClick={createShare} disabled={busy} className="min-h-11 w-full rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60 sm:w-auto">{busy ? 'Creating link…' : 'Create share link'}</button>}
    </div>
    <label className="mt-3 flex min-h-11 cursor-pointer items-center gap-2 text-sm text-gray-700">
      <input type="checkbox" checked={includeDecks} onChange={event => setIncludeDecks(event.target.checked)} disabled={!!shareUrl || busy} className="h-4 w-4 accent-blue-700" />
      Include the friend’s most-played decks
    </label>
    {shareUrl && <div className="mt-2 space-y-2">
      <label className="block text-xs font-semibold text-gray-600" htmlFor={`rivalry-share-${friendId}`}>Public share link</label>
      <input id={`rivalry-share-${friendId}`} readOnly value={shareUrl} onFocus={event => event.currentTarget.select()} className="min-h-11 w-full rounded-lg border border-blue-200 bg-white px-3 text-sm text-gray-800" />
      <div className="flex flex-col gap-2 sm:flex-row">
        <button type="button" onClick={copyLink} className="min-h-11 flex-1 rounded-lg border border-blue-200 bg-white px-4 text-sm font-semibold text-blue-800 hover:bg-blue-100">Copy link</button>
        {supportsNativeShare && <button type="button" onClick={nativeShare} className="min-h-11 flex-1 rounded-lg bg-orange-600 px-4 text-sm font-bold text-white hover:bg-orange-700">Share…</button>}
        <button type="button" onClick={revokeLink} disabled={busy} className="min-h-11 rounded-lg border border-orange-200 px-4 text-sm font-semibold text-orange-800 hover:bg-orange-50 disabled:opacity-60">Revoke link</button>
      </div>
    </div>}
    {message && <p role="status" className="mt-2 text-xs leading-5 text-blue-800">{message}</p>}
    {error && <p role="alert" className="mt-2 text-xs leading-5 text-orange-800">{error}</p>}
  </section>;
}
