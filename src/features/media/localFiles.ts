import { File } from 'expo-file-system';
import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';

const WEB_FILE_PREFIX = 'web-keepsake:';
const DATABASE_NAME = 'ivelive-keepsake-files';
const STORE_NAME = 'files';

function openWebFileDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('This browser cannot save keepsakes for upload.'));
  }
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(new Error('Could not prepare browser storage for this keepsake.'));
  });
}

export async function persistWebBlob(blob: Blob): Promise<string> {
  if (Platform.OS !== 'web') {
    throw new Error('Browser media storage is only available on web.');
  }
  const path = `${WEB_FILE_PREFIX}${Crypto.randomUUID()}`;
  const database = await openWebFileDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put(blob, path);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(new Error('Could not save this keepsake in browser storage.'));
    transaction.onabort = () =>
      reject(new Error('Could not save this keepsake in browser storage.'));
  }).finally(() => database.close());
  return path;
}

export async function getLocalBlob(path: string): Promise<Blob> {
  if (Platform.OS !== 'web') {
    const file = new File(path);
    if (!file.exists || file.size <= 0) {
      throw new Error('The keepsake file is no longer available on this device.');
    }
    return file;
  }
  if (!path.startsWith(WEB_FILE_PREFIX)) {
    throw new Error('The browser could not find this saved keepsake. Choose it again.');
  }
  const database = await openWebFileDatabase();
  return new Promise<Blob>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readonly');
    const request = transaction.objectStore(STORE_NAME).get(path);
    request.onsuccess = () => {
      if (request.result instanceof Blob && request.result.size > 0) {
        resolve(request.result);
      } else {
        reject(new Error('The keepsake file is no longer available in this browser.'));
      }
    };
    request.onerror = () =>
      reject(new Error('Could not read the saved keepsake from this browser.'));
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => database.close();
    transaction.onabort = () => database.close();
  });
}

export async function readLocalBytes(uri: string): Promise<ArrayBuffer> {
  if (Platform.OS === 'web') {
    if (uri.startsWith(WEB_FILE_PREFIX)) {
      return (await getLocalBlob(uri)).arrayBuffer();
    }
    const response = await fetch(uri);
    if (!response.ok) throw new Error('Could not read the selected keepsake.');
    return response.arrayBuffer();
  }
  return new File(uri).arrayBuffer();
}

export async function localFileSize(uri: string): Promise<number> {
  if (Platform.OS === 'web') {
    if (uri.startsWith(WEB_FILE_PREFIX)) {
      return (await getLocalBlob(uri)).size;
    }
    const response = await fetch(uri);
    if (!response.ok) throw new Error('Could not read the selected keepsake.');
    return (await response.blob()).size;
  }
  return new File(uri).size;
}

export async function deleteLocalFile(path: string | null): Promise<void> {
  if (!path) return;
  if (Platform.OS === 'web') {
    if (!path.startsWith(WEB_FILE_PREFIX)) return;
    const database = await openWebFileDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).delete(path);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () =>
        reject(new Error('Could not clear the local keepsake file.'));
      transaction.onabort = () =>
        reject(new Error('Could not clear the local keepsake file.'));
    }).finally(() => database.close());
    return;
  }
  const file = new File(path);
  if (file.exists) file.delete();
}
