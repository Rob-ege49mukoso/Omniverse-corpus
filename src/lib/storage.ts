
import type { Corpus, TrainingConfig } from './nxs';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('nexus-zero-workspace', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('corpora', { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function loadCorpora(): Promise<Corpus[]> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction('corpora', 'readonly');
    const request = transaction.objectStore('corpora').getAll();
    request.onsuccess = () => { resolve(request.result as Corpus[]); database.close(); };
    request.onerror = () => { reject(request.error); database.close(); };
  });
}

export async function saveCorpus(corpus: Corpus): Promise<void> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction('corpora', 'readwrite');
    transaction.objectStore('corpora').put(corpus);
    transaction.oncomplete = () => { database.close(); resolve(); };
    transaction.onerror = () => { database.close(); reject(transaction.error); };
  });
}

export async function deleteCorpus(id: string): Promise<void> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction('corpora', 'readwrite');
    transaction.objectStore('corpora').delete(id);
    transaction.oncomplete = () => { database.close(); resolve(); };
    transaction.onerror = () => { database.close(); reject(transaction.error); };
  });
}

export function loadPreferences(): { training: TrainingConfig; workspace: string } {
  try {
    const stored = JSON.parse(localStorage.getItem('nexus-preferences') || '{}');
    return { training: { ...stored.training }, workspace: stored.workspace || 'NEXUS Research' };
  } catch { return { training: {} as TrainingConfig, workspace: 'NEXUS Research' }; }
}

export function savePreferences(training: TrainingConfig, workspace: string) {
  try { localStorage.setItem('nexus-preferences', JSON.stringify({ training, workspace })); } catch { /* Private browsing can disable local storage. */ }
}
