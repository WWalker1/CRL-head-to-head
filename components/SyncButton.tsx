'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';

interface SyncButtonProps {
  onSync: () => Promise<{ battlesProcessed: number; recordsUpdated: number }>;
}

export default function SyncButton({ onSync }: SyncButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleSync = async () => {
    setLoading(true);

    try {
      const result = await onSync();
      toast.success(`Synced! Processed ${result.battlesProcessed} battles, updated ${result.recordsUpdated} records.`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to sync battles');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleSync}
      disabled={loading}
      className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
    >
      {loading ? (
        <>
          <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Syncing...
        </>
      ) : (
        <>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Sync Battles
        </>
      )}
    </button>
  );
}

