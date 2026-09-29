const TOKEN_RE = /[A-Za-z][A-Za-z0-9+#.-]{1,}/g;
const STOPWORDS = new Set([
    'a',
    'an',
    'the',
    'and',
    'or',
    'but',
    'if',
    'then',
    'else',
    'for',
    'of',
    'to',
    'in',
    'on',
    'at',
    'by',
    'with',
    'as',
    'is',
    'are',
    'was',
    'were',
    'be',
    'been',
    'being',
    'it',
    'this',
    'that',
    'these',
    'those',
    'i',
    'you',
    'we',
    'they',
    'he',
    'she',
    'his',
    'her',
    'their',
    'our',
    'your',
    'my',
    'from',
    'into',
    'about',
    'over',
    'under',
    'than',
    'so',
    'such',
    'not',
    'no',
    'yes',
    'do',
    'does',
    'did',
    'have',
    'has',
    'had',
    'will',
    'would',
    'can',
    'could',
    'should',
    'may',
    'might',
    'must',
    'shall',
    'experience',
    'work',
    'working',
    'team',
    'teams',
    'company',
    'companies',
    'role',
    'roles',
    'candidate',
    'candidates',
    'skill',
    'skills',
    'responsibility',
    'responsibilities',
    'requirement',
    'requirements',
    'year',
    'years',
]);
export function tokenize(text) {
    const lower = text.toLowerCase();
    const raw = lower.match(TOKEN_RE) || [];
    const out = [];
    for (const w of raw) {
        if (w.length < 2)
            continue;
        if (STOPWORDS.has(w))
            continue;
        out.push(w);
    }
    return out;
}
export function termFrequency(tokens) {
    const tf = new Map();
    for (const t of tokens)
        tf.set(t, (tf.get(t) || 0) + 1);
    for (const [k, v] of tf)
        tf.set(k, v / tokens.length);
    return tf;
}
export function inverseDocumentFrequency(documents) {
    const df = new Map();
    for (const doc of documents) {
        const seen = new Set(doc);
        for (const t of seen)
            df.set(t, (df.get(t) || 0) + 1);
    }
    const n = documents.length || 1;
    const idf = new Map();
    for (const [term, count] of df) {
        idf.set(term, Math.log((n + 1) / (count + 1)) + 1);
    }
    return idf;
}
export function vectorize(tokens, idf) {
    const tf = termFrequency(tokens);
    const v = new Map();
    for (const [term, f] of tf) {
        const w = idf.get(term) ?? 1;
        v.set(term, f * w);
    }
    return v;
}
export function cosineSimilarity(a, b) {
    let dot = 0;
    let na = 0;
    let nb = 0;
    for (const [, v] of a)
        na += v * v;
    for (const [, v] of b)
        nb += v * v;
    if (na === 0 || nb === 0)
        return 0;
    const [small, large] = a.size <= b.size ? [a, b] : [b, a];
    for (const [k, v] of small) {
        const w = large.get(k);
        if (w != null)
            dot += v * w;
    }
    return dot / (Math.sqrt(na) * Math.sqrt(nb));
}
