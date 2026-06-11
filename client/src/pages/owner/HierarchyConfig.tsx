/**
 * HierarchyConfig — Owner View (Phase 2: Real API)
 *
 * Reads users from GET /api/users (real MongoDB).
 * Lead assignment via PATCH /api/users/:id/leads.
 * The visual tree UI and flat editor are preserved from Phase 1.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { GitBranch, X, ChevronDown, ChevronRight, Users, Shield, Briefcase, Loader2, RefreshCw } from 'lucide-react';
import { ApiUser } from '../../api/types';
import { listUsers, updateLeads } from '../../api/users';
import { Avatar } from '../../components/ui/Avatar';
import { EmptyState } from '../../components/ui/EmptyState';
import axios from 'axios';

type ApiRole = 'owner' | 'lead' | 'employee';

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Map ApiUser to a shape compatible with the tree/editor UI
function getId(u: ApiUser) { return u._id; }

// ─── Recursive Tree ────────────────────────────────────────────────────────────

const roleIcon: Record<ApiRole, React.ReactNode> = {
  owner: <Shield size={10} className="text-purple-500" />,
  lead: <Briefcase size={10} className="text-blue-500" />,
  employee: <Users size={10} className="text-slate-400" />,
};

const roleBg: Record<ApiRole, string> = {
  owner: 'bg-purple-50 text-purple-700 border-purple-200',
  lead: 'bg-blue-50 text-blue-700 border-blue-200',
  employee: 'bg-slate-50 text-slate-600 border-slate-200',
};

interface TreeNodeProps {
  user: ApiUser;
  depth: number;
  allUsers: ApiUser[];
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
}

function TreeNode({ user, depth, allUsers, expandedIds, onToggle }: TreeNodeProps) {
  const directReports = allUsers.filter(
    (u) => u.leadIds.includes(getId(user)) && getId(u) !== getId(user)
  );
  const hasChildren = directReports.length > 0;
  const expanded = expandedIds.has(getId(user));

  return (
    <div className="relative">
      {depth > 0 && (
        <>
          <div className="absolute top-0 -left-4 w-px h-5 bg-slate-200" style={{ left: depth * 20 - 12 }} />
          <div className="absolute top-5 bg-slate-200 h-px w-3" style={{ left: depth * 20 - 12 }} />
        </>
      )}

      <div className="flex items-center gap-2 py-1.5 group" style={{ paddingLeft: depth * 20 }}>
        <button
          id={`tree-toggle-${getId(user)}`}
          onClick={() => hasChildren && onToggle(getId(user))}
          className={`w-5 h-5 flex items-center justify-center flex-shrink-0 rounded transition-colors ${
            hasChildren ? 'text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer' : 'cursor-default'
          }`}
          aria-label={expanded ? 'Collapse' : 'Expand'}
          disabled={!hasChildren}
        >
          {hasChildren ? (
            expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />
          ) : (
            <span className="w-px h-3 bg-slate-200 rounded-full" />
          )}
        </button>

        <div className="flex items-center gap-2 min-w-0">
          <Avatar name={user.name} color={user.avatarColor} size="sm" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800 truncate">{user.name}</p>
            <p className="text-[10px] text-slate-400 truncate">@{user.userId}</p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {user.roles.map((r) => (
              <span
                key={r}
                className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-semibold border ${roleBg[r]}`}
              >
                {roleIcon[r]}
                {r}
              </span>
            ))}
          </div>
          {hasChildren && (
            <span className="text-[10px] text-slate-400">
              {directReports.length} report{directReports.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {hasChildren && expanded && (
        <div className="relative">
          <div className="absolute top-0 bottom-0 w-px bg-slate-200" style={{ left: depth * 20 + 8 }} />
          {directReports.map((child) => (
            <TreeNode
              key={getId(child)}
              user={child}
              depth={depth + 1}
              allUsers={allUsers}
              expandedIds={expandedIds}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export function HierarchyConfig() {
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [loading, setLoading] = useState(true);
  // FIX 3: distinguish fetch error from genuine empty list
  const [fetchError, setFetchError] = useState<string>('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setFetchError('');
    try {
      const data = await listUsers(false);
      setUsers(data);
      // Expand owners by default
      setExpandedIds(new Set(data.filter((u) => u.roles.includes('owner')).map(getId)));
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setFetchError(err.response?.data?.error ?? 'Failed to load hierarchy. Check your connection.');
      } else {
        setFetchError('An unexpected error occurred. Please retry.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchUsers(); }, [fetchUsers]);

  const owners = users.filter((u) => u.roles.includes('owner'));
  const leads = users.filter((u) => u.roles.includes('lead'));

  // Configurable = users who are NOT pure-owner-only (owner+lead+employee are fine)
  const configurableUsers = users.filter(
    (u) => !(u.roles.length === 1 && u.roles[0] === 'owner')
  );

  async function setLeadsForUser(userId: string, newLeadIds: string[]) {
    setSavingId(userId);
    setErrors((prev) => ({ ...prev, [userId]: '' }));
    try {
      const updated = await updateLeads(userId, newLeadIds);
      setUsers((prev) => prev.map((u) => (getId(u) === userId ? updated : u)));
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setErrors((prev) => ({ ...prev, [userId]: err.response?.data?.error ?? 'Failed to save' }));
      }
    } finally {
      setSavingId(null);
    }
  }

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <Loader2 className="animate-spin text-slate-400" size={24} />
      </div>
    );
  }

  // FIX 3: error banner instead of silent empty state
  if (fetchError) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-8 text-center">
          <p className="text-sm font-semibold text-red-700 mb-1">Couldn’t load hierarchy</p>
          <p className="text-xs text-red-500 mb-4">{fetchError}</p>
          <button
            onClick={fetchUsers}
            className="px-4 py-2 text-xs bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Hierarchy Configuration</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Visualise the reporting tree and set which leads each employee reports to.
          </p>
        </div>
        <button
          onClick={fetchUsers}
          disabled={loading}
          className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 disabled:opacity-40 transition-colors"
          aria-label="Refresh"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* ── Visual Tree Card ── */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <GitBranch size={15} className="text-slate-400" />
            <span className="text-sm font-semibold text-slate-700">Reporting Tree</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              id="hierarchy-expand-all-btn"
              onClick={() => setExpandedIds(new Set(users.map(getId)))}
              className="text-xs text-primary-700 hover:underline"
            >
              Expand all
            </button>
            <span className="text-slate-300">·</span>
            <button
              id="hierarchy-collapse-all-btn"
              onClick={() => setExpandedIds(new Set())}
              className="text-xs text-slate-500 hover:underline"
            >
              Collapse all
            </button>
          </div>
        </div>

        {users.length === 0 ? (
          <EmptyState
            icon={<GitBranch size={24} />}
            title="No users yet"
            description="Add employees and leads via Employee Management first."
          />
        ) : (
          <div className="pl-2 py-1 overflow-x-auto">
            {owners.map((owner) => (
              <TreeNode
                key={getId(owner)}
                user={owner}
                depth={0}
                allUsers={users}
                expandedIds={expandedIds}
                onToggle={toggleExpand}
              />
            ))}
            {/* Orphans at root */}
            {configurableUsers
              .filter((u) => u.leadIds.length === 0 && !owners.some((o) => getId(o) === getId(u)))
              .map((u) => (
                <TreeNode
                  key={getId(u)}
                  user={u}
                  depth={0}
                  allUsers={users}
                  expandedIds={expandedIds}
                  onToggle={toggleExpand}
                />
              ))}
          </div>
        )}
      </div>

      {/* ── Flat assignment editor ── */}
      <div>
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Configure Reporting Lines</h2>

        {configurableUsers.length === 0 ? (
          <EmptyState
            icon={<GitBranch size={24} />}
            title="No employees to configure"
            description="Add employees first via Employee Management."
          />
        ) : (
          <div className="space-y-3">
            {configurableUsers.map((user) => {
              const isOwner = user.roles.includes('owner');
              const currentLeadIds = user.leadIds;
              const currentLeads = leads.filter((l) => currentLeadIds.includes(getId(l)));
              const availableLeads = leads.filter((l) => getId(l) !== getId(user));
              const saving = savingId === getId(user);
              const errorMsg = errors[getId(user)];

              return (
                <div key={getId(user)} className="card p-4">
                  <div className="flex items-start gap-4">
                    {/* User identity */}
                    <div className="flex items-center gap-2.5 w-44 flex-shrink-0">
                      <Avatar name={user.name} color={user.avatarColor} size="sm" />
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{user.name}</p>
                        <div className="flex gap-1 mt-0.5">
                          {user.roles.map((r) => (
                            <span key={r} className="text-[10px] text-slate-400 capitalize">{r}</span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Owner: no assignment UI */}
                    {isOwner ? (
                      <div className="flex-1 flex items-center gap-2 self-center">
                        <span className="text-slate-300 text-xs flex-shrink-0">—</span>
                        <span className="text-xs font-medium text-purple-600 bg-purple-50 border border-purple-200 px-3 py-1.5 rounded-lg">
                          Owner — top of hierarchy
                        </span>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center self-center text-slate-300 text-xs flex-shrink-0">
                          {saving ? <Loader2 size={12} className="animate-spin text-primary-600" /> : 'reports to →'}
                        </div>

                        <div className="flex-1">
                          {/* Active leads */}
                          <div className="flex flex-wrap gap-2 mb-2 min-h-7">
                            {currentLeads.length === 0 ? (
                              <span className="text-xs text-slate-400 italic self-center">No leads assigned</span>
                            ) : (
                              currentLeads.map((lead) => (
                                <div
                                  key={getId(lead)}
                                  className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 border border-blue-200 rounded-full"
                                >
                                  <Avatar name={lead.name} color={lead.avatarColor} size="sm" />
                                  <span className="text-xs font-medium text-blue-700">{lead.name}</span>
                                  <button
                                    id={`remove-lead-${getId(lead)}-from-${getId(user)}`}
                                    onClick={() =>
                                      setLeadsForUser(
                                        getId(user),
                                        currentLeadIds.filter((id) => id !== getId(lead))
                                      )
                                    }
                                    disabled={saving}
                                    className="w-4 h-4 flex items-center justify-center rounded-full text-blue-400 hover:text-blue-600 hover:bg-blue-100 disabled:opacity-40"
                                  >
                                    <X size={10} />
                                  </button>
                                </div>
                              ))
                            )}
                          </div>

                          {/* Add lead buttons */}
                          {availableLeads.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {availableLeads
                                .filter((l) => !currentLeadIds.includes(getId(l)))
                                .map((lead) => (
                                  <button
                                    key={getId(lead)}
                                    id={`add-lead-${getId(lead)}-to-${getId(user)}`}
                                    onClick={() =>
                                      setLeadsForUser(getId(user), [...currentLeadIds, getId(lead)])
                                    }
                                    disabled={saving}
                                    className="flex items-center gap-1.5 px-2 py-1 text-xs border border-dashed rounded-full transition-colors text-slate-500 border-slate-300 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-40"
                                  >
                                    + {lead.name}
                                  </button>
                                ))}
                            </div>
                          )}

                          {errorMsg && (
                            <p className="text-xs text-red-600 mt-2">{errorMsg}</p>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
