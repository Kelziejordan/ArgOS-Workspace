import { openDB } from 'idb';

const DB_NAME = 'argos-workspace';
const DB_VERSION = 2;
export const STORES = {
  workspace: 'workspace',
  projects: 'projects',
  versions: 'versions',
  validations: 'validations',
  outbox: 'outbox',
  ui: 'ui',
};

let dbPromise;

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (!db.objectStoreNames.contains(STORES.workspace)) {
          db.createObjectStore(STORES.workspace, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORES.projects)) {
          const projects = db.createObjectStore(STORES.projects, { keyPath: 'id' });
          projects.createIndex('byUpdatedAt', 'updatedAt');
        }
        if (!db.objectStoreNames.contains(STORES.versions)) {
          const versions = db.createObjectStore(STORES.versions, { keyPath: 'id' });
          versions.createIndex('byProject', 'projectId');
          versions.createIndex('byCreatedAt', 'createdAt');
        }
        if (!db.objectStoreNames.contains(STORES.validations)) {
          const validations = db.createObjectStore(STORES.validations, { keyPath: 'id' });
          validations.createIndex('byProject', 'projectId');
          validations.createIndex('byVersion', 'versionId');
          validations.createIndex('byCreatedAt', 'createdAt');
        }
        if (!db.objectStoreNames.contains(STORES.outbox)) {
          const outbox = db.createObjectStore(STORES.outbox, { keyPath: 'id' });
          outbox.createIndex('byEntity', ['entityType', 'entityId']);
          outbox.createIndex('byCreatedAt', 'createdAt');
        }
        if (!db.objectStoreNames.contains(STORES.ui)) {
          db.createObjectStore(STORES.ui, { keyPath: 'id' });
        }
        if (oldVersion < 2) {
          // migration hook for future normalized workspace changes
        }
      },
    });
  }
  return dbPromise;
}

export async function putItem(storeName, value) {
  const db = await getDB();
  return db.put(storeName, value);
}

export async function getAll(storeName) {
  const db = await getDB();
  return db.getAll(storeName);
}

export async function getById(storeName, id) {
  const db = await getDB();
  return db.get(storeName, id);
}

export async function deleteById(storeName, id) {
  const db = await getDB();
  return db.delete(storeName, id);
}
