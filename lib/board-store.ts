const DB_NAME = "founders-board";
const STORE = "scene";
const KEY = "board";

export type BoardSnapshot = {
  elements: unknown[];
  appState: {
    viewBackgroundColor?: string;
    gridSize?: number | null;
    scrollX?: number;
    scrollY?: number;
    zoom?: { value: number };
  };
  files: Record<string, unknown>;
};

function request<T>(req: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function openDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function loadBoard(): Promise<BoardSnapshot | null> {
  const db = await openDb();
  try {
    const value = await request(db.transaction(STORE, "readonly").objectStore(STORE).get(KEY));
    if (!value || typeof value !== "object") return null;
    const snapshot = value as Partial<BoardSnapshot>;
    if (!Array.isArray(snapshot.elements) || !snapshot.files || typeof snapshot.files !== "object") return null;
    return {
      elements: snapshot.elements,
      appState: snapshot.appState ?? {},
      files: snapshot.files,
    };
  } finally {
    db.close();
  }
}

export async function saveBoard(snapshot: BoardSnapshot) {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, "readwrite");
    const done = new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
    tx.objectStore(STORE).put(snapshot, KEY);
    await done;
  } finally {
    db.close();
  }
}
