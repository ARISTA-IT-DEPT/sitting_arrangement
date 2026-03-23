import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';
import { createInitialRooms, normalizeDesk } from '../src/lib/deskModel.js';

const SNAPSHOT_KEY = 'global-layout';
const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const roomOneSeedPath = path.join(projectRoot, 'src', 'data', 'room2_desks.json');
const roomTwoSeedPath = path.join(projectRoot, 'src', 'data', 'room1_desks.json');

let sqlClient;

function getDatabaseUrl() {
  const environment = globalThis.process?.env ?? {};

  return (
    environment.STORAGE_URL ||
    environment.DATABASE_URL ||
    environment.POSTGRES_URL ||
    environment.POSTGRES_PRISMA_URL ||
    environment.NEON_DATABASE_URL ||
    ''
  );
}

function getSql() {
  if (!sqlClient) {
    const databaseUrl = getDatabaseUrl();

    if (!databaseUrl) {
      throw new Error('No database connection URL was found in the environment.');
    }

    sqlClient = postgres(databaseUrl, {
      max: 1,
      prepare: false,
      idle_timeout: 20,
      connect_timeout: 15,
    });
  }

  return sqlClient;
}

async function readJsonFile(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

async function createSeedRecord() {
  const [roomOneSeed, roomTwoSeed] = await Promise.all([
    readJsonFile(roomOneSeedPath),
    readJsonFile(roomTwoSeedPath),
  ]);

  return {
    savedAt: '',
    rooms: createInitialRooms(roomOneSeed, roomTwoSeed),
  };
}

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
    room1: normalizeRoomEntries(value.room1, fallbackRooms.room1),
    room2: normalizeRoomEntries(value.room2, fallbackRooms.room2),
  };
}

function isValidRecord(record) {
  return (
    record &&
    typeof record === 'object' &&
    typeof record.savedAt === 'string' &&
    record.rooms &&
    typeof record.rooms === 'object' &&
    Array.isArray(record.rooms.room1) &&
    Array.isArray(record.rooms.room2)
  );
}

async function ensureSnapshotTable(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS desk_layout_snapshots (
      snapshot_key TEXT PRIMARY KEY,
      rooms JSONB NOT NULL,
      saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

function serializeRecord(row, fallbackRecord) {
  if (!row) {
    return fallbackRecord;
  }

  return {
    savedAt:
      row.saved_at instanceof Date
        ? row.saved_at.toISOString()
        : typeof row.saved_at === 'string'
          ? new Date(row.saved_at).toISOString()
          : fallbackRecord.savedAt,
    rooms: normalizeRooms(row.rooms, fallbackRecord.rooms),
  };
}

async function handleGet() {
  const seedRecord = await createSeedRecord();
  const sql = getSql();
  await ensureSnapshotTable(sql);

  const rows = await sql`
    SELECT rooms, saved_at
    FROM desk_layout_snapshots
    WHERE snapshot_key = ${SNAPSHOT_KEY}
    LIMIT 1
  `;

  return Response.json(serializeRecord(rows[0], seedRecord));
}

async function handlePost(request) {
  const payload = await request.json();

  if (!isValidRecord(payload)) {
    return Response.json({ error: 'Invalid desk layout payload.' }, { status: 400 });
  }

  const seedRecord = await createSeedRecord();
  const normalizedRecord = {
    savedAt: payload.savedAt,
    rooms: normalizeRooms(payload.rooms, seedRecord.rooms),
  };

  const sql = getSql();
  await ensureSnapshotTable(sql);

  await sql`
    INSERT INTO desk_layout_snapshots (snapshot_key, rooms, saved_at)
    VALUES (${SNAPSHOT_KEY}, ${sql.json(normalizedRecord.rooms)}, ${normalizedRecord.savedAt})
    ON CONFLICT (snapshot_key)
    DO UPDATE SET
      rooms = EXCLUDED.rooms,
      saved_at = EXCLUDED.saved_at
  `;

  return Response.json({ ok: true });
}

export default {
  async fetch(request) {
    try {
      if (request.method === 'GET') {
        return await handleGet();
      }

      if (request.method === 'POST') {
        return await handlePost(request);
      }

      return Response.json({ error: 'Method not allowed.' }, { status: 405 });
    } catch (error) {
      return Response.json(
        {
          error: 'Database request failed.',
          detail: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 },
      );
    }
  },
};
