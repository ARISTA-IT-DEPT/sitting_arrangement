import { normalizeDesk, normalizeShiftTimingList, withRoomOneAdditionalDesks } from './deskModel';

const STORAGE_KEY = 'office-desk-layout-editor.rooms.v4';
const API_ENDPOINT = '/api/desk-layout';

function normalizeDeskEntry(entry, fallbackDesk) {
  if (!fallbackDesk) {
    return null;
  }

  if (!entry || typeof entry !== 'object') {
    return fallbackDesk;
  }

  return {
    ...fallbackDesk,
    ...entry,
    desk_id: typeof entry.desk_id === 'string' ? entry.desk_id : fallbackDesk.desk_id,
    employee: typeof entry.employee === 'string' ? entry.employee : fallbackDesk.employee,
  };
}

function normalizeRoomEntries(entries, fallbackEntries) {
  if (!Array.isArray(entries)) {
    return fallbackEntries;
  }

  const entryMap = new Map(
    entries
      .filter((entry) => entry && typeof entry === 'object' && typeof entry.desk_id === 'string')
      .map((entry) => [entry.desk_id, entry]),
  );

  return fallbackEntries.map((fallbackDesk) => {
    if (!fallbackDesk) {
      return null;
    }

    return normalizeDesk(normalizeDeskEntry(entryMap.get(fallbackDesk.desk_id), fallbackDesk));
  });
}

function normalizeRooms(value, fallbackRooms) {
  if (!value || typeof value !== 'object') {
    return fallbackRooms;
  }

  return {
    room1: withRoomOneAdditionalDesks(normalizeRoomEntries(value.room1, fallbackRooms.room1)),
    room2: normalizeRoomEntries(value.room2, fallbackRooms.room2),
  };
}

function normalizeShiftTimings(value) {
  return normalizeShiftTimingList(value);
}

function createRecord(rooms, shiftTimings = [], savedAt = new Date().toISOString()) {
  return { rooms, shiftTimings: normalizeShiftTimings(shiftTimings), savedAt };
}

function pickLatestRecord(leftRecord, rightRecord) {
  return compareRecords(leftRecord, rightRecord) >= 0 ? leftRecord : rightRecord;
}

function mergeDeskMetadata(baseDesk, fallbackDesk) {
  if (!baseDesk) {
    return fallbackDesk ?? null;
  }

  if (!fallbackDesk) {
    return baseDesk;
  }

  return normalizeDesk({
    ...baseDesk,
    gender: baseDesk.gender || fallbackDesk.gender || '',
    department: baseDesk.department || fallbackDesk.department || '',
    shiftTiming: baseDesk.shiftTiming || fallbackDesk.shiftTiming || '',
  });
}

function mergeRoomEntries(baseEntries, fallbackEntries) {
  const fallbackEntryMap = new Map(
    (fallbackEntries || [])
      .filter((entry) => entry && typeof entry === 'object' && typeof entry.desk_id === 'string')
      .map((entry) => [entry.desk_id, entry]),
  );

  return (baseEntries || []).map((entry) => {
    if (!entry) {
      return null;
    }

    return mergeDeskMetadata(entry, fallbackEntryMap.get(entry.desk_id) ?? null);
  });
}

function mergeRecords(localRecord, apiRecord) {
  const latestRecord = pickLatestRecord(localRecord, apiRecord);
  const fallbackRecord = latestRecord === localRecord ? apiRecord : localRecord;

  return {
    savedAt: latestRecord.savedAt,
    rooms: {
      room1: withRoomOneAdditionalDesks(
        mergeRoomEntries(latestRecord.rooms?.room1, fallbackRecord.rooms?.room1),
      ),
      room2: mergeRoomEntries(latestRecord.rooms?.room2, fallbackRecord.rooms?.room2),
    },
    shiftTimings: normalizeShiftTimingList([
      ...(latestRecord.shiftTimings ?? []),
      ...(fallbackRecord.shiftTimings ?? []),
    ]),
  };
}

function compareRecords(leftRecord, rightRecord) {
  const leftTime = Date.parse(leftRecord?.savedAt ?? '') || 0;
  const rightTime = Date.parse(rightRecord?.savedAt ?? '') || 0;
  return leftTime - rightTime;
}

function readLocalRecord(fallbackRooms) {
  if (typeof window === 'undefined') {
    return createRecord(fallbackRooms, [], '');
  }

  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY);

    if (!rawValue) {
      return createRecord(fallbackRooms, [], '');
    }

    const parsedValue = JSON.parse(rawValue);
    return {
      rooms: normalizeRooms(parsedValue?.rooms, fallbackRooms),
      shiftTimings: normalizeShiftTimings(parsedValue?.shiftTimings),
      savedAt: typeof parsedValue?.savedAt === 'string' ? parsedValue.savedAt : '',
    };
  } catch {
    return createRecord(fallbackRooms, [], '');
  }
}

function writeLocalRecord(record) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {
    // Ignore local storage failures and keep the editor usable.
  }
}

async function readApiRecord(fallbackRooms) {
  if (typeof window === 'undefined') {
    return createRecord(fallbackRooms, [], '');
  }

  try {
    const response = await fetch(API_ENDPOINT, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) {
      return createRecord(fallbackRooms, [], '');
    }

    const payload = await response.json();
    return {
      rooms: normalizeRooms(payload?.rooms, fallbackRooms),
      shiftTimings: normalizeShiftTimings(payload?.shiftTimings),
      savedAt: typeof payload?.savedAt === 'string' ? payload.savedAt : '',
    };
  } catch {
    return createRecord(fallbackRooms, [], '');
  }
}

async function writeApiRecord(record) {
  if (typeof window === 'undefined') {
    return;
  }

  const response = await fetch(API_ENDPOINT, {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(record),
  });

  if (!response.ok) {
    let payload = null;

    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    throw new Error(payload?.error || 'Unable to save desk changes.');
  }
}

export function loadDeskDatabaseSnapshot(fallbackRooms) {
  return readLocalRecord(fallbackRooms);
}

export async function loadDeskDatabase(fallbackRooms) {
  const localRecord = readLocalRecord(fallbackRooms);
  const apiRecord = await readApiRecord(fallbackRooms);
  const latestRecord = mergeRecords(localRecord, apiRecord);

  writeLocalRecord(latestRecord);
  return latestRecord;
}

export async function saveDeskDatabase({ rooms, shiftTimings = [], savedAt }) {
  const record = createRecord(rooms, shiftTimings, savedAt);
  writeLocalRecord(record);
  await writeApiRecord(record);
}
