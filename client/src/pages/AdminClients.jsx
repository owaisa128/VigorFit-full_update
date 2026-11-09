import PageHeader from '../components/PageHeader';
import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Dumbbell,
  HelpCircle,
  Loader2,
  Mail,
  RefreshCw,
  Search,
  ShieldCheck,
  Target,
  Trash2,
  TrendingUp,
  Users,
  Utensils,
  X,
} from '../icons';
import api from '../api/axios';
import EmptyState from '../components/EmptyState';

const roleStyles = {
  admin: 'border-red-500/30 bg-red-500/10 text-red-300',
  trainer: 'border-amber-400/30 bg-amber-400/10 text-amber-200',
  user: 'border-white/10 bg-white/5 text-gray-300',
};

export default function AdminClients() {
  const [clients, setClients] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [notice, setNotice] = useState('');
  const [actionError, setActionError] = useState('');

  // Selected client for modal inspection
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientDetailsLoading, setClientDetailsLoading] = useState(false);
  const [activitySummary, setActivitySummary] = useState(null);

  // Client role change & delete action states
  const [updatingId, setUpdatingId] = useState('');
  const [deletingId, setDeletingId] = useState('');

  const fetchClients = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const params = {
        page,
        limit: 10,
      };
      if (search.trim()) params.search = search.trim();
      if (roleFilter) params.role = roleFilter;

      const { data } = await api.get('/admin/users', { params });
      if (!data?.success || !Array.isArray(data.users)) {
        throw new Error(data?.message || 'Invalid response from users endpoint.');
      }
      setClients(data.users);
      setTotalCount(data.total ?? data.users.length);
      setTotalPages(data.pages || 1);
    } catch (err) {
      setLoadError(err.response?.data?.message || err.message || 'Could not load registered clients.');
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const viewClientDetails = async (client) => {
    setSelectedClient(client);
    setActivitySummary(null);
    setClientDetailsLoading(true);
    try {
      const { data } = await api.get(`/admin/users/${client._id || client.id}`);
      if (data?.success) {
        setSelectedClient(data.user || client);
        setActivitySummary(data.activitySummary || null);
      }
    } catch (err) {
      console.warn('Could not fetch activity summary for user:', err.message);
    } finally {
      setClientDetailsLoading(false);
    }
  };

  const handleRoleChange = async (clientId, newRole) => {
    setUpdatingId(clientId);
    setActionError('');
    setNotice('');
    try {
      const { data } = await api.patch(`/admin/users/${clientId}/role`, { role: newRole });
      setNotice(data.message || 'User role updated.');
      setClients((prev) =>
        prev.map((c) => ((c._id || c.id) === clientId ? { ...c, role: newRole } : c))
      );
      if (selectedClient && ((selectedClient._id || selectedClient.id) === clientId)) {
        setSelectedClient((prev) => ({ ...prev, role: newRole }));
      }
    } catch (err) {
      setActionError(err.response?.data?.message || 'Could not update user role.');
    } finally {
      setUpdatingId('');
    }
  };

  const handleDeleteClient = async (clientId, clientName) => {
    if (!window.confirm(`Are you sure you want to permanently delete user "${clientName}" and all associated records?`)) {
      return;
    }
    setDeletingId(clientId);
    setActionError('');
    setNotice('');
    try {
      const { data } = await api.delete(`/admin/users/${clientId}`);
      setNotice(data.message || 'User deleted successfully.');
      setClients((prev) => prev.filter((c) => (c._id || c.id) !== clientId));
      setTotalCount((count) => Math.max(0, count - 1));
      if (selectedClient && ((selectedClient._id || selectedClient.id) === clientId)) {
        setSelectedClient(null);
      }
    } catch (err) {
      setActionError(err.response?.data?.message || 'Could not delete user.');
    } finally {
      setDeletingId('');
    }
  };

  return (
    <div className="vf-theme-page mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      {/* Top Header */}
      <PageHeader as="header" className="vf-page-banner mb-8 flex flex-col justify-between gap-4 rounded-2xl border border-white/10 bg-[#111115] p-5 sm:flex-row sm:items-end sm:p-6">
        <div>
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-red-300">
            <ShieldCheck className="h-4 w-4 text-red-400" aria-hidden="true" />
            <span>Administrator Panel</span>
          </p>
          <h1 className="mt-2 text-3xl font-black text-white sm:text-4xl">Registered Clients</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <p className="text-sm text-gray-400">
              Monitor and manage registered user accounts from MongoDB Atlas.
            </p>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-bold text-red-300">
              <Users className="h-3.5 w-3.5 text-red-400" aria-hidden="true" />
              <span>{totalCount} Total Registered</span>
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchClients}
          disabled={loading}
          aria-label="Refresh client data"
          className="inline-flex items-center gap-2 self-start rounded-xl border border-white/10 bg-[#111111] px-4 py-2.5 text-sm font-semibold text-gray-200 transition-colors hover:border-red-500/40 hover:bg-white/5 hover:text-white disabled:opacity-50 sm:self-auto"
        >
          <RefreshCw className={`h-4 w-4 text-red-400 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
          <span>Refresh Data</span>
        </button>
      </PageHeader>

      {/* Action / Load Feedback Alerts */}
      {actionError && (
        <div role="alert" className="mb-6 flex items-start gap-3 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{actionError}</span>
        </div>
      )}
      {notice && (
        <div role="status" className="mb-6 flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{notice}</span>
        </div>
      )}

      {/* Search & Filter Controls */}
      <section aria-label="Search and filter clients" className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by client name or email..."
            aria-label="Search registered clients"
            className="w-full rounded-xl border border-white/10 bg-[#111111] py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-500 outline-none transition focus:border-red-500 focus:ring-1 focus:ring-red-500"
          />
        </div>

        <div className="w-full sm:w-56">
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter clients by role"
            className="w-full rounded-xl border border-white/10 bg-[#111111] px-3.5 py-2.5 text-sm text-white outline-none transition focus:border-red-500 focus:ring-1 focus:ring-red-500"
          >
            <option value="">All Roles</option>
            <option value="user">Clients (User)</option>
            <option value="trainer">Trainers</option>
            <option value="admin">Administrators</option>
          </select>
        </div>
      </section>

      {/* Main Content Area */}
      {loading ? (
        <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-[#111111] p-10 text-sm text-gray-400">
          <Loader2 className="h-7 w-7 animate-spin text-red-500" aria-hidden="true" />
          <span>Loading client records from MongoDB...</span>
        </div>
      ) : loadError ? (
        <div className="rounded-2xl border border-rose-500/20 bg-[#111111] p-8 text-center text-rose-300">
          <AlertCircle className="mx-auto h-8 w-8 text-rose-400" aria-hidden="true" />
          <h2 className="mt-3 text-base font-bold text-white">Failed to retrieve client records</h2>
          <p className="mt-1 text-sm text-gray-400">{loadError}</p>
          <button
            type="button"
            onClick={fetchClients}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#E10600] to-[#650000] px-4 py-2 text-xs font-bold text-white hover:opacity-90"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Try Again</span>
          </button>
        </div>
      ) : clients.length === 0 ? (
        <EmptyState
          type="clients"
          sentence={search.trim() || roleFilter ? 'No client records match these filters.' : 'There are no client records yet.'}
          actionLabel={search.trim() || roleFilter ? 'Clear filters' : 'Refresh records'}
          onAction={() => {
            if (search.trim() || roleFilter) {
              setSearch('');
              setRoleFilter('');
              setPage(1);
            } else {
              fetchClients();
            }
          }}
        />
      ) : (
        <div className="w-full overflow-hidden rounded-2xl border border-white/10 bg-[#111111] shadow-xl">
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[650px] text-left text-sm text-gray-300">
              <thead className="border-b border-white/10 bg-[#16161b] text-[11px] font-bold uppercase tracking-wider text-gray-400">
                <tr>
                  <th scope="col" className="px-5 py-3.5">Client</th>
                  <th scope="col" className="px-5 py-3.5">Email</th>
                  <th scope="col" className="px-5 py-3.5">Role</th>
                  <th scope="col" className="px-5 py-3.5">Registered</th>
                  <th scope="col" className="px-5 py-3.5">Goal</th>
                  <th scope="col" className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {clients.map((client) => {
                  const clientId = client._id || client.id;
                  const registeredDate = client.createdAt
                    ? new Date(client.createdAt).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })
                    : 'N/A';
                  const initials = client.name
                    ? client.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2)
                    : 'VF';

                  return (
                    <tr key={clientId} className="transition-colors hover:bg-white/[0.03]">
                      <td className="whitespace-nowrap px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-[#E10600]/30 to-[#650000]/20 text-xs font-bold text-red-200">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-white">{client.name}</p>
                            <p className="truncate text-xs text-gray-500">ID: {String(clientId).slice(-6)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4">
                        <span className="flex items-center gap-1.5 text-xs text-gray-300">
                          <Mail className="h-3.5 w-3.5 text-gray-400 shrink-0" aria-hidden="true" />
                          <span>{client.email}</span>
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4">
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold capitalize ${
                            roleStyles[client.role] || roleStyles.user
                          }`}
                        >
                          {client.role || 'user'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-xs text-gray-400">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-gray-500 shrink-0" aria-hidden="true" />
                          <span>{registeredDate}</span>
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-xs text-gray-300">
                        <span className="flex items-center gap-1.5">
                          <Target className="h-3.5 w-3.5 text-red-400 shrink-0" aria-hidden="true" />
                          <span>{client.fitnessGoal || 'Overall Fitness'}</span>
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => viewClientDetails(client)}
                            className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-semibold text-gray-200 transition hover:border-red-500/40 hover:bg-white/10 hover:text-white"
                          >
                            Details
                          </button>
                          <button
                            type="button"
                            title={`Delete user ${client.name}`}
                            disabled={deletingId === clientId}
                            onClick={() => handleDeleteClient(clientId, client.name)}
                            className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-1.5 text-rose-300 transition hover:bg-rose-500/20 disabled:opacity-40"
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-white/10 px-5 py-3.5 text-xs text-gray-400">
              <p>
                Page <span className="font-semibold text-white">{page}</span> of{' '}
                <span className="font-semibold text-white">{totalPages}</span>
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded-lg border border-white/10 px-3 py-1.5 font-semibold text-white transition hover:bg-white/5 disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="rounded-lg border border-white/10 px-3 py-1.5 font-semibold text-white transition hover:bg-white/5 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Client Inspection Drawer / Modal */}
      {selectedClient && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
        >
          <div className="relative w-full max-w-xl rounded-2xl border border-white/15 bg-[#121216] p-6 shadow-2xl">
            <button
              type="button"
              aria-label="Close client details dialog"
              onClick={() => setSelectedClient(null)}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-gray-400 transition hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>

            <div className="flex items-center gap-4 border-b border-white/10 pb-5">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#E10600] to-[#650000] text-lg font-black text-white shadow-lg shadow-[#E10600]/25">
                {selectedClient.name
                  ? selectedClient.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2)
                  : 'VF'}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-xl font-bold text-white">{selectedClient.name}</h2>
                <p className="truncate text-sm text-gray-400">{selectedClient.email}</p>
                <div className="mt-1 flex items-center gap-2">
                  <span
                    className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${
                      roleStyles[selectedClient.role] || roleStyles.user
                    }`}
                  >
                    {selectedClient.role}
                  </span>
                  <span className="text-xs text-gray-500">
                    Joined {new Date(selectedClient.createdAt || Date.now()).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Client Activity Statistics from MongoDB */}
            <div className="mt-5">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Database Records Summary</p>
              {clientDetailsLoading ? (
                <div className="flex items-center gap-2 py-4 text-xs text-gray-400">
                  <Loader2 className="h-4 w-4 animate-spin text-red-500" aria-hidden="true" />
                  <span>Loading user activity metrics...</span>
                </div>
              ) : activitySummary ? (
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-xl border border-white/10 bg-[#16161b] p-3 text-center">
                    <Dumbbell className="mx-auto h-4 w-4 text-red-400" aria-hidden="true" />
                    <p className="mt-1 text-lg font-extrabold text-white">{activitySummary.workoutsCount ?? 0}</p>
                    <p className="text-[10px] uppercase text-gray-400">Workouts</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-[#16161b] p-3 text-center">
                    <Utensils className="mx-auto h-4 w-4 text-amber-400" aria-hidden="true" />
                    <p className="mt-1 text-lg font-extrabold text-white">{activitySummary.nutritionCount ?? 0}</p>
                    <p className="text-[10px] uppercase text-gray-400">Meals</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-[#16161b] p-3 text-center">
                    <TrendingUp className="mx-auto h-4 w-4 text-sky-400" aria-hidden="true" />
                    <p className="mt-1 text-lg font-extrabold text-white">{activitySummary.progressCount ?? 0}</p>
                    <p className="text-[10px] uppercase text-gray-400">Progress</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-[#16161b] p-3 text-center">
                    <HelpCircle className="mx-auto h-4 w-4 text-[var(--info)]" aria-hidden="true" />
                    <p className="mt-1 text-lg font-extrabold text-white">{activitySummary.feedbackCount ?? 0}</p>
                    <p className="text-[10px] uppercase text-gray-400">Tickets</p>
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-xs text-gray-500">Activity summary currently unavailable for this user.</p>
              )}
            </div>

            {/* Client Profile Details */}
            <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-white/10 pt-4 text-xs">
              <div>
                <dt className="text-gray-500 uppercase">Fitness Goal</dt>
                <dd className="mt-0.5 font-semibold text-white">{selectedClient.fitnessGoal || 'Overall Fitness'}</dd>
              </div>
              <div>
                <dt className="text-gray-500 uppercase">Calorie Target</dt>
                <dd className="mt-0.5 font-semibold text-white">{selectedClient.targetCalories || 2200} kcal</dd>
              </div>
              <div>
                <dt className="text-gray-500 uppercase">Weight / Target</dt>
                <dd className="mt-0.5 font-semibold text-white">
                  {selectedClient.weight || 70} kg / {selectedClient.targetWeight || 68} kg
                </dd>
              </div>
              <div>
                <dt className="text-gray-500 uppercase">Height / Unit</dt>
                <dd className="mt-0.5 font-semibold text-white">
                  {selectedClient.height || 175} cm ({selectedClient.preferredUnit || 'metric'})
                </dd>
              </div>
              <div>
                <dt className="text-gray-500 uppercase">Training experience</dt>
                <dd className="mt-0.5 font-semibold capitalize text-white">{selectedClient.trainingExperience || 'beginner'}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-gray-500 uppercase">Fitness requirements</dt>
                <dd className="mt-1 whitespace-pre-wrap leading-relaxed text-gray-200">{selectedClient.fitnessRequirements || 'No requirements provided yet.'}</dd>
              </div>
            </dl>

            {/* Role Management Actions */}
            <div className="mt-6 border-t border-white/10 pt-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                Change Client Access Level
              </label>
              <div className="flex flex-wrap items-center gap-2">
                {['user', 'trainer', 'admin'].map((role) => (
                  <button
                    key={role}
                    type="button"
                    disabled={updatingId === (selectedClient._id || selectedClient.id) || selectedClient.role === role}
                    onClick={() => handleRoleChange(selectedClient._id || selectedClient.id, role)}
                    className={`rounded-xl border px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition ${
                      selectedClient.role === role
                        ? 'border-red-500 bg-red-500/20 text-white'
                        : 'border-white/10 bg-white/5 text-gray-300 hover:border-white/20 hover:text-white'
                    } disabled:opacity-50`}
                  >
                    Set as {role}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
