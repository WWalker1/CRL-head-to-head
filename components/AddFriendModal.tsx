'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';

interface AddFriendModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (tag: string) => Promise<void>;
}

export default function AddFriendModal({ isOpen, onClose, onAdd }: AddFriendModalProps) {
  const [tag, setTag] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await onAdd(tag);
      setTag('');
      onClose();
      toast.success('Friend added successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to add friend');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Add Friend</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="tag" className="block text-sm font-medium text-gray-700 mb-2">
              Player Tag
            </label>
            <input
              id="tag"
              type="text"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              placeholder="#ABC123"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add Friend'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

