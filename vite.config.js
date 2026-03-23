import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { createInitialRooms, normalizeDesk } from './src/lib/deskModel.js';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));
const storageDir = path.join(projectRoot, 'storage');
const storageFilePath = path.join(storageDir, 'desk-layout-db.json');
const roomOneSeedPath = path.join(projectRoot, 'src', 'data', 'room2_desks.json');
const roomTwoSeedPath = path.join(projectRoot, 'src', 'data', 'room1_desks.json');

async function readJsonFile(filePath) {
  const rawValue = await readFile(filePath, 'utf8');
  return JSON.parse(rawValue);
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

async function ensureStorageFile() {
  try {
    await readFile(storageFilePath, 'utf8');
  } catch {
    await mkdir(storageDir, { recursive: true });
    await writeFile(storageFilePath, JSON.stringify(await createSeedRecord(), null, 2));
  }
}

async function readStorageRecord() {
  await ensureStorageFile();

  try {
    const fallbackRecord = await createSeedRecord();
    return normalizeRecord(JSON.parse(await readFile(storageFilePath, 'utf8')), fallbackRecord);
  } catch {
    const seedRecord = await createSeedRecord();
    await writeFile(storageFilePath, JSON.stringify(seedRecord, null, 2));
    return seedRecord;
  }
}

async function writeStorageRecord(record) {
  await mkdir(storageDir, { recursive: true });
  await writeFile(storageFilePath, JSON.stringify(record, null, 2));
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';

    request.on('data', (chunk) => {
      body += chunk;
    });

    request.on('end', () => {
      resolve(body);
    });

    request.on('error', reject);
  });
}

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader('Content-Type', 'application/json');
  response.end(JSON.stringify(payload));
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

function normalizeRecord(record, fallbackRecord) {
  if (!isValidRecord(record)) {
    return fallbackRecord;
  }

  return {
    savedAt: typeof record.savedAt === 'string' ? record.savedAt : fallbackRecord.savedAt,
    rooms: {
      room1: fallbackRecord.rooms.room1.map((fallbackDesk) => {
        if (!fallbackDesk) {
          return null;
        }

        const savedDesk = record.rooms.room1.find((entry) => entry?.desk_id === fallbackDesk.desk_id);
        return normalizeDesk({
          ...fallbackDesk,
          ...(savedDesk ?? {}),
        });
      }),
      room2: record.rooms.room2.map(normalizeDesk),
    },
  };
}

function deskLayoutApiPlugin() {
  const handleRequest = async (request, response, next) => {
    const url = new URL(request.url ?? '/', 'http://localhost');

    if (url.pathname !== '/api/desk-layout') {
      next();
      return;
    }

    if (request.method === 'GET') {
      sendJson(response, 200, await readStorageRecord());
      return;
    }

    if (request.method === 'POST') {
      try {
        const rawBody = await readRequestBody(request);
        const record = JSON.parse(rawBody);

        if (!isValidRecord(record)) {
          sendJson(response, 400, { error: 'Invalid desk layout payload.' });
          return;
        }

        await writeStorageRecord(record);
        sendJson(response, 200, { ok: true });
      } catch {
        sendJson(response, 500, { error: 'Unable to save desk layout.' });
      }

      return;
    }

    sendJson(response, 405, { error: 'Method not allowed.' });
  };

  return {
    name: 'desk-layout-api',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        void handleRequest(request, response, next);
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((request, response, next) => {
        void handleRequest(request, response, next);
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), deskLayoutApiPlugin()],
});
