const API_BASE = '/api';

export async function fetchStats() {
  const res = await fetch(`${API_BASE}/dashboard/stats`);
  if (!res.ok) throw new Error('Failed to fetch dashboard stats');
  return res.json();
}

export async function fetchLocations() {
  const res = await fetch(`${API_BASE}/wbs/locations`);
  if (!res.ok) throw new Error('Failed to fetch locations');
  const data = await res.json();
  return Array.isArray(data) ? data : (data?.locations || []);
}

export async function fetchWBS(params = {}) {
  const query = new URLSearchParams();
  if (params.discipline && params.discipline !== 'All') query.append('discipline', params.discipline);
  if (params.location && params.location !== 'All') query.append('location', params.location);
  if (params.status && params.status !== 'All') query.append('status', params.status);
  if (params.search) query.append('search', params.search);

  const res = await fetch(`${API_BASE}/wbs?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch WBS activities');
  return res.json();
}

export async function resetWBS() {
  const res = await fetch(`${API_BASE}/wbs/reset`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to reset WBS baseline');
  return res.json();
}

export async function importWBS(file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/wbs/import`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error('Failed to import WBS file');
  return res.json();
}

export async function fetchPendingReports() {
  const res = await fetch(`${API_BASE}/reports/pending`);
  if (!res.ok) throw new Error('Failed to fetch pending reports');
  return res.json();
}

export async function fetchAllReports() {
  const res = await fetch(`${API_BASE}/reports`);
  if (!res.ok) throw new Error('Failed to fetch reports');
  return res.json();
}

export async function submitReport(reportData) {
  const res = await fetch(`${API_BASE}/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reportData),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to submit report');
  }
  return res.json();
}

export async function seedDemoReports() {
  const res = await fetch(`${API_BASE}/reports/seed-demo`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to seed demo reports');
  return res.json();
}

export async function reconcileReport(reportId, data) {
  const res = await fetch(`${API_BASE}/reconcile/${reportId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to reconcile report');
  }
  return res.json();
}

export async function fetchHistory() {
  const res = await fetch(`${API_BASE}/dashboard/history`);
  if (!res.ok) throw new Error('Failed to fetch progress history');
  return res.json();
}

export async function fetchFeedback() {
  const res = await fetch(`${API_BASE}/dashboard/feedback`);
  if (!res.ok) throw new Error('Failed to fetch feedback learning log');
  return res.json();
}

export async function uploadPhoto(file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error('Failed to upload photo');
  return res.json();
}
