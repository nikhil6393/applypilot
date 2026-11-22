import 'dotenv/config';

/**
 * Pure native Supabase PostgREST client.
 * Zero npm dependencies, uses built-in Node fetch().
 */
const getUrl = () => process.env.SUPABASE_URL || 'https://tagjxwuikaskjqbgzepo.supabase.co';
const getKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

function getHeaders(extra = {}) {
  const key = getKey();
  return {
    'apikey': key,
    'Authorization': `Bearer ${key}`,
    'Content-Type': 'application/json',
    ...extra
  };
}

export const supabase = {
  isConfigured: () => !process.env.VITEST && process.env.NODE_ENV !== 'test' && Boolean(getUrl() && getKey()),

  from(table) {
    return {
      async select(queryString = '') {
        const query = queryString ? (queryString.startsWith('?') ? queryString : `?${queryString}`) : '';
          const res = await fetch(`${getUrl()}/rest/v1/${table}${query}`, {
          method: 'GET',
          headers: getHeaders()
        });
        if (!res.ok) throw new Error(`[Supabase ${table} select] ${res.status}: ${await res.text()}`);
        return res.json();
      },

      async insert(rows) {
        const payload = Array.isArray(rows) ? rows : [rows];
        const res = await fetch(`${getUrl()}/rest/v1/${table}`, {
          method: 'POST',
          headers: getHeaders({ 'Prefer': 'return=representation' }),
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error(`[Supabase ${table} insert] ${res.status}: ${await res.text()}`);
        return res.json();
      },

      async upsert(rows, onConflict = 'id') {
        const payload = Array.isArray(rows) ? rows : [rows];
        const res = await fetch(`${getUrl()}/rest/v1/${table}?on_conflict=${onConflict}`, {
          method: 'POST',
          headers: getHeaders({ 'Prefer': 'resolution=merge-duplicates,return=representation' }),
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error(`[Supabase ${table} upsert] ${res.status}: ${await res.text()}`);
        return res.json();
      },

      async update(patch, matchQuery) {
        const query = matchQuery.startsWith('?') ? matchQuery : `?${matchQuery}`;
        const res = await fetch(`${getUrl()}/rest/v1/${table}${query}`, {
          method: 'PATCH',
          headers: getHeaders({ 'Prefer': 'return=representation' }),
          body: JSON.stringify(patch)
        });
        if (!res.ok) throw new Error(`[Supabase ${table} update] ${res.status}: ${await res.text()}`);
        return res.json();
      },

      async delete(matchQuery) {
        const query = matchQuery.startsWith('?') ? matchQuery : `?${matchQuery}`;
        const res = await fetch(`${getUrl()}/rest/v1/${table}${query}`, {
          method: 'DELETE',
          headers: getHeaders({ 'Prefer': 'return=representation' })
        });
        if (!res.ok) throw new Error(`[Supabase ${table} delete] ${res.status}: ${await res.text()}`);
        return res.status === 204 ? [] : res.json();
      }
    };
  }
};
