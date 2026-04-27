/* Tiny IndexedDB key-value store used by both drill-point and drill-taper
 * to keep their working state alive across page navigations / reloads.
 * Values can include Blobs (File, Blob) — IDB stores them natively. */
(function () {
  const DB_NAME = 'drill-assistant';
  const DB_VERSION = 1;
  const STORE = 'state';

  let _dbPromise = null;
  function open() {
    if (_dbPromise) return _dbPromise;
    _dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return _dbPromise;
  }

  async function tx(mode) {
    const db = await open();
    return db.transaction(STORE, mode).objectStore(STORE);
  }

  async function set(key, value) {
    const store = await tx('readwrite');
    return new Promise((resolve, reject) => {
      const req = store.put(value, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async function get(key) {
    const store = await tx('readonly');
    return new Promise((resolve, reject) => {
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function remove(key) {
    const store = await tx('readwrite');
    return new Promise((resolve, reject) => {
      const req = store.delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  // Debounced setter: queues updates on the same key.
  const _timers = new Map();
  function setDebounced(key, getValue, ms) {
    ms = ms == null ? 600 : ms;
    if (_timers.has(key)) clearTimeout(_timers.get(key));
    _timers.set(key, setTimeout(async () => {
      _timers.delete(key);
      try {
        await set(key, await getValue());
      } catch (e) {
        console.warn('persist setDebounced failed for', key, e);
      }
    }, ms));
  }

  window.DrillPersist = { set, get, remove, setDebounced };
})();
