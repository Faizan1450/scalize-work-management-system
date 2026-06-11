/**
 * ChangePasswordModal — self-service password change.
 * Available in the Header profile menu for all logged-in users.
 * Calls POST /api/auth/change-password.
 */

import React, { useState } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { changePassword } from '../../api/auth';
import axios from 'axios';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChangePasswordModal({ isOpen, onClose }: ChangePasswordModalProps) {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  function reset() {
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setSuccess(false);
    setShowOld(false);
    setShowNew(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await changePassword(oldPassword, newPassword);
      setSuccess(true);
      setTimeout(handleClose, 1500);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.error ?? 'Failed to change password.');
      } else {
        setError('Unexpected error.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Change Password" size="sm" id="change-password-modal">
      {success ? (
        <div className="text-center py-6">
          <div className="text-3xl mb-3">✅</div>
          <p className="text-sm font-medium text-green-600">Password changed successfully!</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 p-1">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Current password</label>
            <div className="relative">
              <input
                type={showOld ? 'text' : 'password'}
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 pr-10"
                required
                autoFocus
              />
              <button type="button" onClick={() => setShowOld(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" tabIndex={-1}>
                {showOld ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">New password</label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min. 6 characters"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 pr-10"
                required
              />
              <button type="button" onClick={() => setShowNew(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" tabIndex={-1}>
                {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Confirm new password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>
          {error && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>
          )}
          <div className="flex gap-3 justify-end pt-1">
            <button type="button" onClick={handleClose} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !oldPassword || !newPassword || !confirmPassword}
              className="px-4 py-2 text-sm bg-primary-700 text-white rounded-xl hover:bg-primary-800 disabled:opacity-50 flex items-center gap-2 transition-colors"
            >
              {loading && <Loader2 size={13} className="animate-spin" />}
              Change password
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
