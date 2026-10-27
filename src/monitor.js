/** Validate stored observations before using them to resume a session. */
export function validateSession(value) {
  if (value == null) return null;
  const fail = () => { throw new Error('Journal de session invalide. La sauvegarde originale doit être conservée.'); };
  const object = (item) => item && typeof item === 'object' && !Array.isArray(item);
  const time = (item) => {
    if (!Number.isSafeInteger(item) || item < 0) fail();
    return item;
  };
  const count = (item) => {
    if (!Number.isSafeInteger(item) || item < 0 || item > 100_000) fail();
    return item;
  };
  if (!object(value) || !['idle', 'active', 'finished'].includes(value.status)
    || !Array.isArray(value.incidents) || value.incidents.length > 10_000) fail();
  const status = value.status;
  const fullscreenExits = count(value.fullscreenExits);
  if (status === 'idle') {
    if (value.startedAt !== null || value.endedAt !== null || value.incidents.length
      || value.absenceCount !== 0 || value.totalAwayMs !== 0 || fullscreenExits !== 0
      || (value.savedAt != null) || (value.fullscreenEvents != null
        && (!Array.isArray(value.fullscreenEvents) || value.fullscreenEvents.length !== 0))) fail();
    return { status, startedAt: null, endedAt: null, incidents: [], absenceCount: 0,
      totalAwayMs: 0, fullscreenExits: 0, fullscreenEvents: [], savedAt: null };
  }
  const startedAt = time(value.startedAt);
  const endedAt = status === 'finished' ? time(value.endedAt) : null;
  if (status === 'active' && value.endedAt !== null) fail();
  if (endedAt !== null && endedAt < startedAt) fail();
  const savedAt = status === 'finished' ? endedAt : time(value.savedAt ?? startedAt);
  if (savedAt < startedAt || (status === 'finished' && value.savedAt != null && value.savedAt !== endedAt)) fail();
  let previousEnd = startedAt;
  const incidents = value.incidents.map((entry, index) => {
    if (!object(entry) || !Array.isArray(entry.reasons) || !entry.reasons.length
      || entry.reasons.length > 3 || !entry.reasons.every((reason) => ['focus', 'visibility', 'reload'].includes(reason))
      || new Set(entry.reasons).size !== entry.reasons.length) fail();
    const start = time(entry.start);
    const end = entry.end === null ? null : time(entry.end);
    if (start < previousEnd || start > savedAt
      || (end !== null && (end < start || end > savedAt))
      || (end === null && (status !== 'active' || index !== value.incidents.length - 1))) fail();
    const durationMs = (end ?? savedAt) - start;
    if (entry.durationMs !== durationMs) fail();
    previousEnd = end ?? savedAt;
    return { start, end, durationMs, reasons: [...entry.reasons] };
  });
  const totalAwayMs = incidents.reduce((total, entry) => total + entry.durationMs, 0);
  if (value.absenceCount !== incidents.length || value.totalAwayMs !== totalAwayMs
    || totalAwayMs > savedAt - startedAt) fail();
  const rawEvents = value.fullscreenEvents ?? [];
  if (!Array.isArray(rawEvents) || rawEvents.length > 100_000 || rawEvents.length > fullscreenExits) fail();
  let previousEvent = startedAt;
  const fullscreenEvents = rawEvents.map((entry) => {
    if (!object(entry) || entry.type !== 'exit') fail();
    const at = time(entry.at);
    if (at < previousEvent || at > savedAt) fail();
    previousEvent = at;
    return { at, type: 'exit' };
  });
  return { status, startedAt, endedAt, incidents, absenceCount: incidents.length,
    totalAwayMs, fullscreenExits, fullscreenEvents, savedAt };
}

/** Browser signals are observations, not proof of a particular application or action. */
export function createMonitor({ now = Date.now, onChange = () => {}, restored = null } = {}) {
  restored = validateSession(restored);
  let status = 'idle';
  let startedAt = null;
  let endedAt = null;
  let fullscreenExits = 0;
  let fullscreenEvents = [];
  let focused = true;
  let visible = true;
  let fullscreen = false;
  let incidents = [];

  let lastTimestamp = restored?.savedAt ?? restored?.startedAt ?? 0;
  const timestamp = () => {
    const value = now();
    if (!Number.isSafeInteger(value) || value < 0) throw new Error('Horloge invalide.');
    lastTimestamp = Math.max(lastTimestamp, value);
    return lastTimestamp;
  };
  const opened = () => incidents.findLast((incident) => incident.end === null);
  const notify = () => onChange(snapshot());

  function snapshot() {
    const at = status === 'finished' ? endedAt : timestamp();
    const entries = incidents.map((incident) => ({
      ...incident,
      durationMs: Math.max(0, (incident.end ?? at) - incident.start),
      reasons: [...incident.reasons],
    }));
    return {
      status, startedAt, endedAt, incidents: entries,
      absenceCount: entries.length,
      totalAwayMs: entries.reduce((total, incident) => total + incident.durationMs, 0),
      fullscreenExits,
      fullscreenEvents: fullscreenEvents.map((event) => ({ ...event })),
      savedAt: status === 'idle' ? null : at,
    };
  }

  function start() {
    if (status !== 'idle') return;
    status = 'active';
    startedAt = timestamp();
    notify();
  }

  function signal(type, value) {
    if (status !== 'active' || typeof value !== 'boolean') return;
    if (type === 'fullscreen') {
      if (fullscreen === value) return;
      if (fullscreen && !value) {
        fullscreenExits += 1;
        fullscreenEvents.push({ at: timestamp(), type: 'exit' });
      }
      fullscreen = value;
      notify();
      return;
    }
    if (type !== 'focus' && type !== 'visibility') return;
    if (type === 'focus') focused = value;
    else visible = value;
    const away = !focused || !visible;
    let incident = opened();
    if (away) {
      if (!incident) {
        incident = { start: timestamp(), end: null, reasons: [] };
        incidents.push(incident);
      }
      if (!value && !incident.reasons.includes(type)) incident.reasons.push(type);
    } else if (incident) incident.end = Math.max(incident.start, timestamp());
    notify();
  }

  function finish() {
    if (status !== 'active') return;
    endedAt = timestamp();
    const incident = opened();
    if (incident) incident.end = Math.max(incident.start, endedAt);
    status = 'finished';
    notify();
  }

  if (restored && ['active', 'finished'].includes(restored.status)) {
    status = restored.status;
    startedAt = restored.startedAt;
    endedAt = restored.endedAt;
    fullscreenExits = restored.fullscreenExits ?? 0;
    fullscreenEvents = structuredClone(restored.fullscreenEvents);
    incidents = structuredClone(restored.incidents ?? []);
    if (status === 'active') {
      focused = false;
      visible = false;
      const incident = opened();
      if (incident) {
        if (!incident.reasons.includes('reload')) incident.reasons.push('reload');
      } else {
        incidents.push({
          start: restored.savedAt ?? restored.startedAt ?? timestamp(),
          end: null,
          reasons: ['reload'],
        });
      }
    }
  }

  return { start, signal, finish, snapshot };
}
