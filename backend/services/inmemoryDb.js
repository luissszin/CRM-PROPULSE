// Minimal in-memory DB shim with a supabase-like chainable API
const tables = {
  units: [],
  users: [],
  leads: [],
  contacts: [],
  conversations: [],
  messages: [],
  whatsapp_instances: [], // Legacy
  unit_whatsapp_connections: [],
};

const idCounters = {
  units: 1,
  users: 1,
  leads: 1,
  contacts: 1,
  conversations: 1,
  messages: 1,
  whatsapp_instances: 1, // Legacy
  unit_whatsapp_connections: 1,
};


function nowISO() {
  return new Date().toISOString();
}

function clone(o) { return JSON.parse(JSON.stringify(o)); }

function from(tableName) {
  const state = {
    table: tableName,
    filters: [],
    _order: null,
    _limit: null,
    _single: false,
    _insertPayload: null,
    _updatePayload: null,
    _delete: false,
  };

  const execute = () => {
    try {
      const raw = tables[tableName] || [];
      let rows = raw.slice();

      for (const f of state.filters) {
        rows = rows.filter(r => String(r[f.key]) === String(f.val));
      }

      if (state._order) {
        const { field, opts } = state._order;
        rows.sort((a, b) => {
          if (a[field] < b[field]) return opts && opts.ascending ? -1 : 1;
          if (a[field] > b[field]) return opts && opts.ascending ? 1 : -1;
          return 0;
        });
      }

      if (state._limit != null) rows = rows.slice(0, state._limit);

      if (state._insertPayload != null) {
        const payload = state._insertPayload;
        const id = idCounters[tableName]++;
        const item = Object.assign({}, payload, { id, created_at: nowISO() });
        tables[tableName] = tables[tableName] || [];
        tables[tableName].push(item);
        const data = clone(item);
        return { data: state._single ? data : [data], error: null };
      }

      if (state._updatePayload != null) {
        const updates = state._updatePayload;
        let updated = null;
        tables[tableName] = (tables[tableName] || []).map(row => {
          if (state.filters.every(f => String(row[f.key]) === String(f.val))) {
            updated = Object.assign({}, row, updates);
            return updated;
          }
          return row;
        });
        if (!updated) return { data: state._single ? null : [], error: null };
        return { data: state._single ? clone(updated) : [clone(updated)], error: null };
      }

      if (state._delete) {
        const initialCount = tables[tableName].length;
        tables[tableName] = (tables[tableName] || []).filter(row =>
          !state.filters.every(f => String(row[f.key]) === String(f.val))
        );
        const finalCount = tables[tableName].length;
        const deletedCount = initialCount - finalCount;
        return { data: { count: deletedCount }, error: null };
      }

      if (state._single) return { data: rows[0] ?? null, error: null };
      return { data: clone(rows), error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  };

  const chain = {
    select() { return this; },
    order(field, opts) { state._order = { field, opts }; return this; },
    limit(n) { state._limit = n; return this; },
    eq(key, val) { state.filters.push({ key, val }); return this; },
    insert(payload) { state._insertPayload = payload; return this; },
    upsert(payload) { state._insertPayload = payload; return this; }, // Shim: treats upsert as insert
    update(payload) { state._updatePayload = payload; return this; },
    delete() { state._delete = true; return this; },
    single() { state._single = true; return this; },
    // allow awaiting the chain: it is thenable
    then(resolve, reject) {
      try {
        const out = execute();
        // mimic supabase returning { data, error }
        resolve(out);
      } catch (e) { reject(e); }
    }
  };

  return chain;
}

export { from, tables };
export default { from, tables };
