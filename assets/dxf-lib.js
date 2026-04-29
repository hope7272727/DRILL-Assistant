/* DXF Library backend — Firestore (cross-device) with one-time migration
 * from the legacy localStorage `drill.dxfLib.v1` key. DXF text is gzip-
 * compressed before write to fit large drawings inside Firestore's 1MiB
 * document limit. Stored as Firestore Blob (binary) under field `textGz`;
 * legacy entries with plain `text` field are read transparently.
 *
 * Public API:
 *   await DrillDxfLib.list()                    -> [{ id, name, text, scale, savedAt }]
 *   await DrillDxfLib.save({name, text, scale}) -> upserts entry (id == name)
 *   await DrillDxfLib.updateScale(name, scale)  -> metadata-only update
 *   await DrillDxfLib.remove(name)              -> deletes entry
 *   DrillDxfLib.onChange(cb)                    -> subscribe to live updates
 */
(function () {
  const COLLECTION = 'dxf-library';
  const LEGACY_KEY = 'drill.dxfLib.v1';
  const MIGRATED_FLAG = 'drill.dxfLib.migrated.v1';

  function db() {
    if (!window.DrillFirestore) throw new Error('Firestore not initialized');
    return window.DrillFirestore;
  }
  function FsBlob() { return firebase.firestore.Blob; }

  function safeId(name) {
    return String(name).replace(/[\/ ]/g, '_').slice(0, 1500);
  }

  async function gzipString(text) {
    if (typeof CompressionStream === 'undefined') return new TextEncoder().encode(text);
    const cs = new CompressionStream('gzip');
    const stream = new Blob([text]).stream().pipeThrough(cs);
    const buf = await new Response(stream).arrayBuffer();
    return new Uint8Array(buf);
  }
  async function gunzipBytes(bytes) {
    if (typeof DecompressionStream === 'undefined') return new TextDecoder().decode(bytes);
    const ds = new DecompressionStream('gzip');
    const stream = new Blob([bytes]).stream().pipeThrough(ds);
    return await new Response(stream).text();
  }

  async function hydrate(d) {
    const data = d.data();
    const out = {
      id: d.id,
      name: data.name || d.id,
      scale: typeof data.scale === 'number' ? data.scale : 100,
      refWidth: typeof data.refWidth === 'number' ? data.refWidth : null,
      savedAt: data.savedAt || 0,
    };
    if (data.textGz && typeof data.textGz.toUint8Array === 'function') {
      try { out.text = await gunzipBytes(data.textGz.toUint8Array()); }
      catch (e) { console.warn('[DrillDxfLib] decompress failed', d.id, e); out.text = ''; }
    } else if (typeof data.text === 'string') {
      out.text = data.text;
    } else {
      out.text = '';
    }
    return out;
  }

  async function migrateLegacy() {
    if (localStorage.getItem(MIGRATED_FLAG) === '1') return;
    let raw;
    try { raw = JSON.parse(localStorage.getItem(LEGACY_KEY) || '[]'); } catch { raw = []; }
    if (!Array.isArray(raw) || raw.length === 0) {
      localStorage.setItem(MIGRATED_FLAG, '1');
      return;
    }
    try {
      for (const entry of raw) {
        if (!entry || !entry.name || !entry.text) continue;
        await save({
          name: entry.name,
          text: entry.text,
          scale: typeof entry.scale === 'number' ? entry.scale : 100,
        });
      }
      localStorage.setItem(MIGRATED_FLAG, '1');
      console.log('[DrillDxfLib] migrated', raw.length, 'legacy entries to Firestore');
    } catch (e) {
      console.warn('[DrillDxfLib] migration failed', e);
    }
  }

  async function list() {
    await migrateLegacy();
    const snap = await db().collection(COLLECTION).orderBy('savedAt', 'desc').get();
    const out = [];
    for (const d of snap.docs) out.push(await hydrate(d));
    return out;
  }

  async function save({ name, text, scale }) {
    if (!name || !text) throw new Error('name and text required');
    const ref = db().collection(COLLECTION).doc(safeId(name));
    const bytes = await gzipString(text);
    if (bytes.length > 1000000) {
      throw new Error('압축 후에도 1MB 를 초과합니다 (' + Math.round(bytes.length/1024) + 'KB). 더 작은 DXF 사용 또는 파일을 분할해주세요.');
    }
    await ref.set({
      name,
      textGz: FsBlob().fromUint8Array(bytes),
      scale: typeof scale === 'number' ? scale : 100,
      savedAt: Date.now(),
      textLen: text.length,
      gzLen: bytes.length,
    }, { merge: true });
  }

  async function updateScale(name, scale) {
    if (!name) return;
    const ref = db().collection(COLLECTION).doc(safeId(name));
    try { await ref.update({ scale: scale, savedAt: Date.now() }); } catch (_) {}
  }

  async function updateRefWidth(name, refWidth) {
    if (!name) return;
    const ref = db().collection(COLLECTION).doc(safeId(name));
    const payload = { savedAt: Date.now() };
    if (refWidth === '' || refWidth == null || !isFinite(refWidth)) {
      payload.refWidth = firebase.firestore.FieldValue.delete();
    } else {
      payload.refWidth = Number(refWidth);
    }
    try { await ref.update(payload); } catch (_) {}
  }

  async function remove(name) {
    if (!name) return;
    await db().collection(COLLECTION).doc(safeId(name)).delete();
  }

  function onChange(cb) {
    return db().collection(COLLECTION).onSnapshot(async snap => {
      const out = [];
      for (const d of snap.docs) out.push(await hydrate(d));
      cb(out);
    }, err => console.warn('[DrillDxfLib] subscribe error', err));
  }

  window.DrillDxfLib = { list, save, updateScale, updateRefWidth, remove, onChange };
})();
