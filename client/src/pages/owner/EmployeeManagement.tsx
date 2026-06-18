/**
 * EmployeeManagement — Owner View (Phase 2: Real API)
 *
 * Reads all users from GET /api/users (real MongoDB).
 * Create / Edit / Raise to lead / Deactivate / Reset password — all via real API.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Search, KeyRound, Loader2, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { ApiUser } from '../../api/types';
import {
  listUsers,
  createUser,
  updateUser,
  resetPassword,
  CreateUserPayload,
  UpdateUserPayload,
} from '../../api/users';
import { Avatar } from '../../components/ui/Avatar';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';
import { WorkScheduleEditor, WorkScheduleValue } from '../../components/owner/WorkScheduleEditor';
import axios from 'axios';

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  lead: 'Lead',
  employee: 'Employee',
};

// ── Default form state ────────────────────────────────────────────────────────

const DEFAULT_SCHEDULE: WorkScheduleValue = { '0': 0, '1': 8, '2': 8, '3': 8, '4': 8, '5': 8, '6': 8 };

interface CreateForm {
  name: string;
  userId: string;
  password: string;
  designation: string;
  phone: string;
  email: string;
  joiningDate: string;
  workSchedule: WorkScheduleValue;
}

interface EditForm {
  name: string;
  userId: string;
  designation: string;
  phone: string;
  email: string;
  joiningDate: string;
  workSchedule: WorkScheduleValue;
  roles: ('owner' | 'lead' | 'employee')[];
  isActive: boolean;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, type = 'text', required = false, pattern }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  pattern?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      pattern={pattern}
      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
    />
  );
}

// ── Create Modal ──────────────────────────────────────────────────────────────

interface CreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

function CreateModal({ isOpen, onClose, onCreated }: CreateModalProps) {
  const [form, setForm] = useState<CreateForm>({
    name: '', userId: '', password: '', designation: '',
    phone: '', email: '', joiningDate: '', workSchedule: DEFAULT_SCHEDULE,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function reset() {
    setForm({ name: '', userId: '', password: '', designation: '', phone: '', email: '', joiningDate: '', workSchedule: DEFAULT_SCHEDULE });
    setError('');
    setShowPassword(false);
  }

  function handleClose() { reset(); onClose(); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const trimmedPhone = form.phone.trim();
    if (trimmedPhone && !/^\+?[0-9]{10,15}$/.test(trimmedPhone)) {
      setError('Phone number must be between 10 and 15 digits (optional leading +)');
      return;
    }
    setLoading(true);
    try {
      const payload: CreateUserPayload = {
        name: form.name.trim(),
        userId: form.userId.trim(),
        password: form.password,
        workSchedule: form.workSchedule,
        designation: form.designation.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        joiningDate: form.joiningDate,
      };
      await createUser(payload);
      reset();
      onCreated();
      onClose();
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.error ?? 'Failed to create user');
      } else {
        setError('Unexpected error');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add Employee" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FieldRow label="Full name *">
            <TextInput value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="e.g. Afroz Khan" required />
          </FieldRow>
          <FieldRow label="User ID *">
            <TextInput
              value={form.userId}
              onChange={(v) => setForm({ ...form, userId: v.toLowerCase() })}
              placeholder="e.g. afroz.khan"
              required
              pattern="^[a-z0-9.]+$"
            />
          </FieldRow>
        </div>

        <FieldRow label="Password *">
          <div className="relative">
            <TextInput
              type={showPassword ? 'text' : 'password'}
              value={form.password}
              onChange={(v) => setForm({ ...form, password: v })}
              placeholder="Min. 6 characters"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </FieldRow>

        <div className="grid grid-cols-2 gap-4">
          <FieldRow label="Designation">
            <TextInput value={form.designation} onChange={(v) => setForm({ ...form, designation: v })} placeholder="e.g. Senior Technician" />
          </FieldRow>
          <FieldRow label="Joining date">
            <TextInput type="date" value={form.joiningDate} onChange={(v) => setForm({ ...form, joiningDate: v })} />
          </FieldRow>
          <FieldRow label="Phone">
            <TextInput value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} placeholder="+91 98765 43210" />
          </FieldRow>
          <FieldRow label="Email">
            <TextInput type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} placeholder="name@company.com" />
          </FieldRow>
        </div>

        <FieldRow label="Work schedule">
          <WorkScheduleEditor value={form.workSchedule} onChange={(ws) => setForm({ ...form, workSchedule: ws })} />
        </FieldRow>

        {error && (
          <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>
        )}

        <div className="flex gap-3 justify-end pt-2">
          <button type="button" onClick={handleClose} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-sm bg-primary-700 text-white rounded-xl hover:bg-primary-800 disabled:opacity-50 flex items-center gap-2 transition-colors"
          >
            {loading && <Loader2 size={13} className="animate-spin" />}
            Create employee
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Edit Modal ────────────────────────────────────────────────────────────────

interface EditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
  user: ApiUser | null;
}

function EditModal({ isOpen, onClose, onUpdated, user }: EditModalProps) {
  const [form, setForm] = useState<EditForm>({
    name: '', userId: '', designation: '', phone: '', email: '', joiningDate: '',
    workSchedule: DEFAULT_SCHEDULE, roles: ['employee'], isActive: true,
  });
  const [originalUserId, setOriginalUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name,
        userId: user.userId,
        designation: user.designation,
        phone: user.phone,
        email: user.email,
        joiningDate: user.joiningDate,
        workSchedule: user.workSchedule as unknown as WorkScheduleValue,
        roles: user.roles,
        isActive: user.isActive,
      });
      setOriginalUserId(user.userId);
      setError('');
    }
  }, [user]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setError('');
    const trimmedPhone = form.phone ? form.phone.trim() : '';
    if (trimmedPhone && !/^\+?[0-9]{10,15}$/.test(trimmedPhone)) {
      setError('Phone number must be between 10 and 15 digits (optional leading +)');
      return;
    }
    setLoading(true);
    try {
      const payload: UpdateUserPayload = {
        name: form.name.trim(),
        designation: form.designation.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        joiningDate: form.joiningDate,
        workSchedule: form.workSchedule,
        roles: form.roles,
        isActive: form.isActive,
      };
      // FIX 5: include userId in payload only when changed
      const trimmedUserId = form.userId.trim();
      if (trimmedUserId && trimmedUserId !== originalUserId) {
        payload.userId = trimmedUserId;
      }
      await updateUser(user._id, payload);
      onUpdated();
      onClose();
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.error ?? 'Failed to update user');
      } else {
        setError('Unexpected error');
      }
    } finally {
      setLoading(false);
    }
  }

  if (!user) return null;

  const isOwner = user.roles.includes('owner');

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Edit — ${user.name}`} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FieldRow label="Full name *">
            <TextInput value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Full name" required />
          </FieldRow>
          <FieldRow label="User ID">
            <TextInput
              value={form.userId}
              onChange={(v) => setForm({ ...form, userId: v.toLowerCase() })}
              placeholder="e.g. afroz.khan"
              pattern="^[a-z0-9.]+$"
            />
            {/* FIX 5: warn when userId is being changed */}
            {form.userId.trim() !== originalUserId ? (
              <p className="text-xs text-amber-600 mt-1 font-medium">
                ⚠ Changing the User ID changes this person’s login. Inform them.
              </p>
            ) : (
              <p className="text-xs text-slate-400 mt-1">Lowercase letters, numbers, and dots only.</p>
            )}
          </FieldRow>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FieldRow label="Designation">
            <TextInput value={form.designation} onChange={(v) => setForm({ ...form, designation: v })} placeholder="e.g. Senior Technician" />
          </FieldRow>
          <FieldRow label="Joining date">
            <TextInput type="date" value={form.joiningDate} onChange={(v) => setForm({ ...form, joiningDate: v })} />
          </FieldRow>
          <FieldRow label="Phone">
            <TextInput value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
          </FieldRow>
          <FieldRow label="Email">
            <TextInput type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
          </FieldRow>
        </div>

        <FieldRow label="Roles">
          {isOwner ? (
            // FIX 6: owner row — show static badge, no checkboxes at all
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full">
                Owner
              </span>
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                Lead
              </span>
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 text-slate-600 text-xs font-semibold rounded-full">
                Employee
              </span>
              <p className="text-xs text-slate-400 ml-1">Owner roles are permanent.</p>
            </div>
          ) : (
            // FIX 6: non-owner — only Employee (locked) + Lead (toggle). Owner checkbox removed from DOM.
            <div className="flex gap-3">
              <label className="flex items-center gap-1.5 text-sm opacity-50 cursor-not-allowed">
                <input type="checkbox" checked disabled className="rounded" />
                Employee
              </label>
              <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.roles.includes('lead')}
                  onChange={(e) => {
                    const next = e.target.checked
                      ? [...form.roles, 'lead' as const]
                      : form.roles.filter((r) => r !== 'lead');
                    setForm({ ...form, roles: next });
                  }}
                  className="rounded"
                />
                Lead
              </label>
            </div>
          )}
          {!isOwner && <p className="text-xs text-slate-400 mt-1">Employee is always required. Toggle Lead to promote or demote.</p>}
        </FieldRow>

        <FieldRow label="Work schedule">
          <WorkScheduleEditor value={form.workSchedule} onChange={(ws) => setForm({ ...form, workSchedule: ws })} />
        </FieldRow>

        {/* Active toggle — disabled for owner */}
        {!isOwner && (
          <label className="flex items-center gap-2.5 cursor-pointer">
            <div
              role="switch"
              aria-checked={form.isActive}
              onClick={() => setForm({ ...form, isActive: !form.isActive })}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${form.isActive ? 'bg-green-500' : 'bg-slate-300'}`}
            >
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${form.isActive ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </div>
            <span className="text-sm text-slate-700">
              {form.isActive ? 'Active' : 'Deactivated'}
            </span>
          </label>
        )}

        {error && (
          <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>
        )}

        <div className="flex gap-3 justify-end pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-sm bg-primary-700 text-white rounded-xl hover:bg-primary-800 disabled:opacity-50 flex items-center gap-2 transition-colors"
          >
            {loading && <Loader2 size={13} className="animate-spin" />}
            Save changes
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Reset Password Modal ──────────────────────────────────────────────────────

interface ResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: ApiUser | null;
}

function ResetPasswordModal({ isOpen, onClose, user }: ResetPasswordModalProps) {
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  function handleClose() { setNewPassword(''); setError(''); setSuccess(false); setShowPassword(false); onClose(); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || newPassword.length < 6) return;
    setError('');
    setLoading(true);
    try {
      await resetPassword(user._id, newPassword);
      setSuccess(true);
      setTimeout(handleClose, 1200);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.error ?? 'Failed to reset password');
      } else {
        setError('Unexpected error');
      }
    } finally {
      setLoading(false);
    }
  }

  if (!user) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={`Reset password — ${user.name}`} size="sm">
      {success ? (
        <div className="text-center py-4">
          <div className="text-2xl mb-2">✅</div>
          <p className="text-sm text-green-600 font-medium">Password reset successfully</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-xs text-slate-500">Set a new password for <strong>{user.userId}</strong>. The user will need to use this to log in.</p>
          <FieldRow label="New password">
            <div className="relative">
              <TextInput
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={setNewPassword}
                placeholder="Min. 6 characters"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </FieldRow>
          {error && <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={handleClose} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">Cancel</button>
            <button
              type="submit"
              disabled={loading || newPassword.length < 6}
              className="px-4 py-2 text-sm bg-orange-600 text-white rounded-xl hover:bg-orange-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
            >
              {loading && <Loader2 size={13} className="animate-spin" />}
              Reset password
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function EmployeeManagement() {
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [loading, setLoading] = useState(true);
  // FIX 3: distinguish fetch error from genuine empty list
  const [fetchError, setFetchError] = useState<string>('');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<ApiUser | null>(null);
  const [resetUser, setResetUser] = useState<ApiUser | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setFetchError('');
    try {
      const data = await listUsers(includeInactive);
      setUsers(data);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setFetchError(err.response?.data?.error ?? 'Failed to load employees. Check your connection.');
      } else {
        setFetchError('An unexpected error occurred. Please retry.');
      }
    } finally {
      setLoading(false);
    }
  }, [includeInactive]);

  useEffect(() => { void fetchUsers(); }, [fetchUsers]);

  const filtered = users.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.userId.toLowerCase().includes(search.toLowerCase()) ||
    u.designation?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Employees</h1>
          <p className="text-xs text-slate-500 mt-0.5">{users.filter(u => u.isActive).length} active · {users.length} total</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchUsers} disabled={loading} className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 disabled:opacity-40 transition-colors" aria-label="Refresh">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            id="create-employee-btn"
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-700 text-white text-sm font-semibold rounded-xl hover:bg-primary-800 transition-colors shadow-sm"
          >
            <Plus size={15} />
            Add employee
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-5">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, ID, designation…"
            className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={(e) => setIncludeInactive(e.target.checked)}
            className="rounded"
          />
          Show deactivated
        </label>
      </div>

      {/* Table — FIX 3: error banner vs empty state */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-slate-400" size={24} />
        </div>
      ) : fetchError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-8 text-center">
          <p className="text-sm font-semibold text-red-700 mb-1">Couldn’t load employees</p>
          <p className="text-xs text-red-500 mb-4">{fetchError}</p>
          <button
            onClick={fetchUsers}
            className="px-4 py-2 text-xs bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState title={search ? 'No users match your search.' : 'No employees yet. Add one to get started.'} />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Employee</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Roles</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((user, i) => {
                const inactive = !user.isActive;
                return (
                  <tr
                    key={user._id}
                    className={`${i < filtered.length - 1 ? 'border-b border-slate-100' : ''} ${inactive ? 'opacity-60' : 'hover:bg-slate-50'} transition-colors`}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar name={user.name} color={user.avatarColor} size="sm" />
                        <div>
                          <p className="font-semibold text-slate-900">{user.name}</p>
                          <p className="text-xs text-slate-400">@{user.userId}{user.designation ? ` · ${user.designation}` : ''}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex gap-1.5 flex-wrap">
                        {user.roles.map((role) => (
                          <span
                            key={role}
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              role === 'owner' ? 'bg-purple-100 text-purple-700' :
                              role === 'lead' ? 'bg-blue-100 text-blue-700' :
                              'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {ROLE_LABELS[role]}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${inactive ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
                        {inactive ? 'Deactivated' : 'Active'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          id={`edit-user-${user._id}`}
                          onClick={() => setEditUser(user)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                          aria-label={`Edit ${user.name}`}
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          id={`reset-password-${user._id}`}
                          onClick={() => setResetUser(user)}
                          className="p-1.5 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                          aria-label={`Reset password for ${user.name}`}
                          title="Reset password"
                        >
                          <KeyRound size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      <CreateModal isOpen={showCreate} onClose={() => setShowCreate(false)} onCreated={fetchUsers} />
      <EditModal isOpen={!!editUser} onClose={() => setEditUser(null)} onUpdated={fetchUsers} user={editUser} />
      <ResetPasswordModal isOpen={!!resetUser} onClose={() => setResetUser(null)} user={resetUser} />
    </div>
  );
}
