import React, { useState, useEffect, useMemo } from 'react';

// Comprehensive map of canonical company names to official, high-resolution brand logo assets
// Uses Clearbit Logo API as primary source (free, high-res, SVG-quality PNG)
export const KNOWN_ORIGINAL_LOGOS = {
    // ── Global Tech Giants & Cloud ──────────────────────────────────────────
    google: 'https://logo.clearbit.com/google.com',
    alphabet: 'https://logo.clearbit.com/google.com',
    microsoft: 'https://logo.clearbit.com/microsoft.com',
    amazon: 'https://logo.clearbit.com/amazon.com',
    apple: 'https://logo.clearbit.com/apple.com',
    meta: 'https://logo.clearbit.com/meta.com',
    facebook: 'https://logo.clearbit.com/meta.com',
    netflix: 'https://logo.clearbit.com/netflix.com',
    spotify: 'https://logo.clearbit.com/spotify.com',
    stripe: 'https://logo.clearbit.com/stripe.com',
    uber: 'https://logo.clearbit.com/uber.com',
    airbnb: 'https://logo.clearbit.com/airbnb.com',
    openai: 'https://logo.clearbit.com/openai.com',
    anthropic: 'https://logo.clearbit.com/anthropic.com',
    adobe: 'https://logo.clearbit.com/adobe.com',
    salesforce: 'https://logo.clearbit.com/salesforce.com',
    nvidia: 'https://logo.clearbit.com/nvidia.com',
    tesla: 'https://logo.clearbit.com/tesla.com',
    github: 'https://logo.clearbit.com/github.com',
    linkedin: 'https://logo.clearbit.com/linkedin.com',
    twitter: 'https://logo.clearbit.com/x.com',
    x: 'https://logo.clearbit.com/x.com',
    figma: 'https://logo.clearbit.com/figma.com',
    notion: 'https://logo.clearbit.com/notion.so',
    canva: 'https://logo.clearbit.com/canva.com',
    slack: 'https://logo.clearbit.com/slack.com',
    discord: 'https://logo.clearbit.com/discord.com',
    zoom: 'https://logo.clearbit.com/zoom.us',
    dropbox: 'https://logo.clearbit.com/dropbox.com',
    reddit: 'https://logo.clearbit.com/reddit.com',
    atlassian: 'https://logo.clearbit.com/atlassian.com',
    shopify: 'https://logo.clearbit.com/shopify.com',
    cloudflare: 'https://logo.clearbit.com/cloudflare.com',
    docker: 'https://logo.clearbit.com/docker.com',
    datadog: 'https://logo.clearbit.com/datadoghq.com',
    snowflake: 'https://logo.clearbit.com/snowflake.com',
    palantir: 'https://logo.clearbit.com/palantir.com',
    oracle: 'https://logo.clearbit.com/oracle.com',
    cisco: 'https://logo.clearbit.com/cisco.com',
    intel: 'https://logo.clearbit.com/intel.com',
    ibm: 'https://logo.clearbit.com/ibm.com',
    mongodb: 'https://logo.clearbit.com/mongodb.com',
    redis: 'https://logo.clearbit.com/redis.io',
    postman: 'https://logo.clearbit.com/postman.com',
    vercel: 'https://logo.clearbit.com/vercel.com',
    supabase: 'https://logo.clearbit.com/supabase.com',
    linear: 'https://logo.clearbit.com/linear.app',
    raycast: 'https://logo.clearbit.com/raycast.com',
    replit: 'https://logo.clearbit.com/replit.com',
    coinbase: 'https://logo.clearbit.com/coinbase.com',
    robinhood: 'https://logo.clearbit.com/robinhood.com',
    bytedance: 'https://logo.clearbit.com/bytedance.com',
    tiktok: 'https://logo.clearbit.com/tiktok.com',
    pinterest: 'https://logo.clearbit.com/pinterest.com',
    snapchat: 'https://logo.clearbit.com/snapchat.com',
    snap: 'https://logo.clearbit.com/snapchat.com',
    paypal: 'https://logo.clearbit.com/paypal.com',
    square: 'https://logo.clearbit.com/squareup.com',
    block: 'https://logo.clearbit.com/squareup.com',
    doordash: 'https://logo.clearbit.com/doordash.com',
    instacart: 'https://logo.clearbit.com/instacart.com',
    lyft: 'https://logo.clearbit.com/lyft.com',
    walmart: 'https://logo.clearbit.com/walmart.com',
    spacex: 'https://logo.clearbit.com/spacex.com',
    crowdstrike: 'https://logo.clearbit.com/crowdstrike.com',
    paloaltonetworks: 'https://logo.clearbit.com/paloaltonetworks.com',
    servicenow: 'https://logo.clearbit.com/servicenow.com',
    workday: 'https://logo.clearbit.com/workday.com',
    intuit: 'https://logo.clearbit.com/intuit.com',
    gitlab: 'https://logo.clearbit.com/gitlab.com',
    hashicorp: 'https://logo.clearbit.com/hashicorp.com',
    databricks: 'https://logo.clearbit.com/databricks.com',
    retool: 'https://logo.clearbit.com/retool.com',
    ramp: 'https://logo.clearbit.com/ramp.com',
    plaid: 'https://logo.clearbit.com/plaid.com',
    rippling: 'https://logo.clearbit.com/rippling.com',
    gusto: 'https://logo.clearbit.com/gusto.com',
    carta: 'https://logo.clearbit.com/carta.com',
    perplexity: 'https://logo.clearbit.com/perplexity.ai',
    cursor: 'https://logo.clearbit.com/cursor.com',
    huggingface: 'https://logo.clearbit.com/huggingface.co',
    cohere: 'https://logo.clearbit.com/cohere.com',
    scaleai: 'https://logo.clearbit.com/scale.com',
    mistral: 'https://logo.clearbit.com/mistral.ai',
    modal: 'https://logo.clearbit.com/modal.com',
    langchain: 'https://logo.clearbit.com/langchain.com',
    pinecone: 'https://logo.clearbit.com/pinecone.io',

    // ── Leading Indian Tech, Unicorns & Global Enterprises ──────────────────
    swiggy: 'https://logo.clearbit.com/swiggy.com',
    zomato: 'https://logo.clearbit.com/zomato.com',
    razorpay: 'https://logo.clearbit.com/razorpay.com',
    flipkart: 'https://logo.clearbit.com/flipkart.com',
    phonepe: 'https://logo.clearbit.com/phonepe.com',
    paytm: 'https://logo.clearbit.com/paytm.com',
    tcs: 'https://logo.clearbit.com/tcs.com',
    tataconsultancyservices: 'https://logo.clearbit.com/tcs.com',
    infosys: 'https://logo.clearbit.com/infosys.com',
    wipro: 'https://logo.clearbit.com/wipro.com',
    hcl: 'https://logo.clearbit.com/hcltech.com',
    hcltech: 'https://logo.clearbit.com/hcltech.com',
    techmahindra: 'https://logo.clearbit.com/techmahindra.com',
    accenture: 'https://logo.clearbit.com/accenture.com',
    deloitte: 'https://logo.clearbit.com/deloitte.com',
    goldmansachs: 'https://logo.clearbit.com/goldmansachs.com',
    jpmorgan: 'https://logo.clearbit.com/jpmorgan.com',
    jpmorganchase: 'https://logo.clearbit.com/jpmorgan.com',
    morganstanley: 'https://logo.clearbit.com/morganstanley.com',
    zepto: 'https://logo.clearbit.com/zeptonow.com',
    cred: 'https://logo.clearbit.com/cred.club',
    meesho: 'https://logo.clearbit.com/meesho.io',
    groww: 'https://logo.clearbit.com/groww.in',
    urbancompany: 'https://logo.clearbit.com/urbancompany.com',
    ola: 'https://logo.clearbit.com/olacabs.com',
    inmobi: 'https://logo.clearbit.com/inmobi.com',
    browserstack: 'https://logo.clearbit.com/browserstack.com',
    hasura: 'https://logo.clearbit.com/hasura.io',
    yellowai: 'https://logo.clearbit.com/yellow.ai',
    slice: 'https://logo.clearbit.com/sliceit.com',
    navi: 'https://logo.clearbit.com/navi.com',
    juspay: 'https://logo.clearbit.com/juspay.in',
    darwinbox: 'https://logo.clearbit.com/darwinbox.com',
    porter: 'https://logo.clearbit.com/porter.in',
    atherelectric: 'https://logo.clearbit.com/atherenergy.com',
    ather: 'https://logo.clearbit.com/atherenergy.com',
    spinny: 'https://logo.clearbit.com/spinny.com',
    khatabook: 'https://logo.clearbit.com/khatabook.com',
    clevertap: 'https://logo.clearbit.com/clevertap.com',
    chargebee: 'https://logo.clearbit.com/chargebee.com',
    leadsquared: 'https://logo.clearbit.com/leadsquared.com',
    moengage: 'https://logo.clearbit.com/moengage.com',
    zeta: 'https://logo.clearbit.com/zeta.tech',
    lenskart: 'https://logo.clearbit.com/lenskart.com',
    upstox: 'https://logo.clearbit.com/upstox.com',
    curefit: 'https://logo.clearbit.com/cult.fit',
    cars24: 'https://logo.clearbit.com/cars24.com',
    mpl: 'https://logo.clearbit.com/mpl.live',
    unacademy: 'https://logo.clearbit.com/unacademy.com',
    zoho: 'https://logo.clearbit.com/zoho.com',
    freshworks: 'https://logo.clearbit.com/freshworks.com',
    sprinklr: 'https://logo.clearbit.com/sprinklr.com',
    jio: 'https://logo.clearbit.com/jio.com',
    reliancejio: 'https://logo.clearbit.com/jio.com',
    airtel: 'https://logo.clearbit.com/airtel.in',
    cognizant: 'https://logo.clearbit.com/cognizant.com',
    capgemini: 'https://logo.clearbit.com/capgemini.com',
    ltimindtree: 'https://logo.clearbit.com/ltimindtree.com',
    persistent: 'https://logo.clearbit.com/persistent.com',
    mphasis: 'https://logo.clearbit.com/mphasis.com',
    hexaware: 'https://logo.clearbit.com/hexaware.com',
    birlasoft: 'https://logo.clearbit.com/birlasoft.com',
    coforge: 'https://logo.clearbit.com/coforge.com',
    cyient: 'https://logo.clearbit.com/cyient.com',
    tataelxsi: 'https://logo.clearbit.com/tataelxsi.com',
};

// Clean company name to standard slug
export function toCompanySlug(name) {
    if (!name || typeof name !== 'string') return '';
    return name
        .replace(/[\r\n\t]+/g, ' ')
        .replace(/\b(actively hiring|hiring now|hiring immediately|urgent|featured|promoted|fresh|verified|top enterprise|fast growing startup)\b/gi, '')
        .toLowerCase()
        .replace(/\b(inc|incorporated|ltd|llc|technologies|technology|corp|corporation|solutions|pvt|private|limited|services|group|labs|software|systems|co)\b/gi, '')
        .trim()
        .replace(/[^a-z0-9]/g, '');
}

// Clean and extract a probable domain name from company name
export function getDomainFromCompany(name) {
    if (!name || typeof name !== 'string') return 'company.com';
    const slug = toCompanySlug(name);
    const domainOverrides = {
        google: 'google.com',
        amazon: 'amazon.com',
        microsoft: 'microsoft.com',
        meta: 'meta.com',
        facebook: 'meta.com',
        apple: 'apple.com',
        netflix: 'netflix.com',
        spotify: 'spotify.com',
        stripe: 'stripe.com',
        uber: 'uber.com',
        swiggy: 'swiggy.com',
        razorpay: 'razorpay.com',
        flipkart: 'flipkart.com',
        github: 'github.com',
        linkedin: 'linkedin.com',
        openai: 'openai.com',
        figma: 'figma.com',
        adobe: 'adobe.com',
        salesforce: 'salesforce.com',
        nvidia: 'nvidia.com',
        tesla: 'tesla.com',
        airbnb: 'airbnb.com',
        slack: 'slack.com',
        discord: 'discord.com',
        atlassian: 'atlassian.com',
        shopify: 'shopify.com',
        notion: 'notion.so',
        canva: 'canva.com',
        zoom: 'zoom.us',
        dropbox: 'dropbox.com',
        reddit: 'reddit.com',
        zomato: 'zomato.com',
        paytm: 'paytm.com',
        phonepe: 'phonepe.com',
        zepto: 'zeptonow.com',
        cred: 'cred.club',
        meesho: 'meesho.io',
        groww: 'groww.in',
        urbancompany: 'urbancompany.com',
        ola: 'olacabs.com',
        tcs: 'tcs.com',
        infosys: 'infosys.com',
        wipro: 'wipro.com',
        hcl: 'hcltech.com',
        hcltech: 'hcltech.com',
        accenture: 'accenture.com',
        deloitte: 'deloitte.com',
        jpmorgan: 'jpmorgan.com',
        goldmansachs: 'goldmansachs.com',
        inmobi: 'inmobi.com',
        browserstack: 'browserstack.com',
        hasura: 'hasura.io',
        yellowai: 'yellow.ai',
        slice: 'sliceit.com',
        navi: 'navi.com',
        juspay: 'juspay.in',
        darwinbox: 'darwinbox.com',
        porter: 'porter.in',
        ather: 'atherenergy.com',
        atherelectric: 'atherenergy.com',
        spinny: 'spinny.com',
        khatabook: 'khatabook.com',
        clevertap: 'clevertap.com',
        chargebee: 'chargebee.com',
        leadsquared: 'leadsquared.com',
        moengage: 'moengage.com',
        zeta: 'zeta.tech',
        lenskart: 'lenskart.com',
        upstox: 'upstox.com',
        curefit: 'cult.fit',
        cars24: 'cars24.com',
        mpl: 'mpl.live',
        unacademy: 'unacademy.com',
        zoho: 'zoho.com',
        freshworks: 'freshworks.com',
        sprinklr: 'sprinklr.com',
        jio: 'jio.com',
        airtel: 'airtel.in',
        cognizant: 'cognizant.com',
        capgemini: 'capgemini.com',
        databricks: 'databricks.com',
        retool: 'retool.com',
        ramp: 'ramp.com',
        plaid: 'plaid.com',
        rippling: 'rippling.com',
        gusto: 'gusto.com',
        carta: 'carta.com',
        perplexity: 'perplexity.ai',
        cursor: 'cursor.com',
        modal: 'modal.com',
        langchain: 'langchain.com',
        pinecone: 'pinecone.io',
    };
    if (domainOverrides[slug]) {
        return domainOverrides[slug];
    }
    return slug ? `${slug}.com` : 'company.com';
}

// ── Dynamic First Alphabet Theme & Gradient Map (A–Z) ─────────────────────
export const ALPHABET_THEMES = {
    A: { from: '#4F46E5', to: '#6366F1' }, // Indigo
    B: { from: '#2563EB', to: '#3B82F6' }, // Blue
    C: { from: '#0284C7', to: '#0EA5E9' }, // Sky
    D: { from: '#0D9488', to: '#14B8A6' }, // Teal
    E: { from: '#059669', to: '#10B981' }, // Emerald
    F: { from: '#16A34A', to: '#22C55E' }, // Green
    G: { from: '#D97706', to: '#F59E0B' }, // Amber
    H: { from: '#EA580C', to: '#FB923C' }, // Orange
    I: { from: '#6366F1', to: '#818CF8' }, // Indigo Light
    J: { from: '#7C3AED', to: '#A855F7' }, // Purple
    K: { from: '#9333EA', to: '#C084FC' }, // Violet
    L: { from: '#C026D3', to: '#E879F9' }, // Fuchsia
    M: { from: '#DB2777', to: '#F472B6' }, // Pink
    N: { from: '#E11D48', to: '#FB7185' }, // Rose
    O: { from: '#DC2626', to: '#EF4444' }, // Red
    P: { from: '#F97316', to: '#FB923C' }, // Warm Orange
    Q: { from: '#0891B2', to: '#22D3EE' }, // Cyan
    R: { from: '#3B82F6', to: '#60A5FA' }, // Sky Blue
    S: { from: '#0284C7', to: '#6366F1' }, // Electric Blue / Indigo
    T: { from: '#0F766E', to: '#14B8A6' }, // Deep Teal
    U: { from: '#7C3AED', to: '#EC4899' }, // Violet Pink
    V: { from: '#6366F1', to: '#06B6D4' }, // Indigo Cyan
    W: { from: '#1D4ED8', to: '#2563EB' }, // Royal Blue
    X: { from: '#334155', to: '#64748B' }, // Slate
    Y: { from: '#EA580C', to: '#F59E0B' }, // Sunset Orange
    Z: { from: '#6D28D9', to: '#8B5CF6' }, // Deep Violet
};

/**
 * Extracts the single first alphabet letter from a company name.
 * If company name starts with numbers/symbols, finds the first alphabetical character.
 */
export function getCompanyFirstAlphabet(name) {
    if (!name || typeof name !== 'string') return 'C';
    const clean = name.trim();
    // 1. Look for first alphabetical letter
    const letterMatch = clean.match(/[a-zA-Z]/);
    if (letterMatch) {
        return letterMatch[0].toUpperCase();
    }
    // 2. Fall back to first alphanumeric character
    const numMatch = clean.match(/[0-9]/);
    if (numMatch) {
        return numMatch[0];
    }
    return (clean.charAt(0) || 'C').toUpperCase();
}

/**
 * Returns the gradient color palette for a given alphabet letter.
 */
export function getAlphabetTheme(letter, name = '') {
    const upper = (letter || '').toUpperCase();
    if (ALPHABET_THEMES[upper]) {
        return ALPHABET_THEMES[upper];
    }
    const keys = Object.keys(ALPHABET_THEMES);
    let hash = 0;
    const str = name || letter || 'C';
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const idx = Math.abs(hash) % keys.length;
    return ALPHABET_THEMES[keys[idx]];
}

/**
 * Standalone First Alphabet Logo Component
 * Renders a crisp, stylish monogram using the company's first alphabet letter.
 */
export const FirstAlphabetLogo = ({ company = '', size = 40, className = '' }) => {
    const cleanName = (company || '').trim();
    const firstAlphabet = useMemo(() => getCompanyFirstAlphabet(cleanName), [cleanName]);
    const theme = useMemo(() => getAlphabetTheme(firstAlphabet, cleanName), [firstAlphabet, cleanName]);
    const fontSize = Math.max(12, Math.round(size * 0.52));

    return (
        <div
            style={{
                width: size,
                height: size,
                background: `linear-gradient(135deg, ${theme.from} 0%, ${theme.to} 100%)`,
                boxShadow: '0 2px 6px -1px rgba(0, 0, 0, 0.16), inset 0 1px 1px rgba(255, 255, 255, 0.35)',
            }}
            className={`rounded-xl flex items-center justify-center shrink-0 text-white select-none border border-white/20 transition-all duration-200 hover:scale-105 shadow-sm ${className}`}
            title={cleanName || 'Company'}
        >
            <span
                style={{
                    fontSize,
                    lineHeight: 1,
                    textShadow: '0 1px 2px rgba(0, 0, 0, 0.25)',
                    fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    fontWeight: 800,
                }}
                className="tracking-tight text-white select-none"
            >
                {firstAlphabet}
            </span>
        </div>
    );
};

export const CompanyIcon = ({ company = '', logoUrl, size = 40, className = '' }) => {
    const [sourceIndex, setSourceIndex] = useState(0);
    const [imgFailed, setImgFailed] = useState(false);
    const cleanName = (company || '').trim();
    const slug = useMemo(() => toCompanySlug(cleanName), [cleanName]);
    const domain = useMemo(() => getDomainFromCompany(cleanName), [cleanName]);

    // Reset error fallback whenever company name or logo changes
    useEffect(() => {
        setSourceIndex(0);
        setImgFailed(false);
    }, [cleanName, logoUrl]);

    // Hierarchy of real logo sources:
    // 1. Verified official brand logo registry (Clearbit/GitHub vector asset)
    // 2. Clean scraped logo from job posting (if provided)
    // 3. Clearbit brand logo CDN
    // 4. Unavatar brand resolver (fallback=false so it 404s if missing)
    // (Notice: We deliberately omit generic favicon/globe APIs so missing logos fall back to first alphabet)
    const candidateSources = useMemo(() => {
        const list = [];
        // 1. Verified official original logo registry
        if (slug && KNOWN_ORIGINAL_LOGOS[slug]) {
            list.push(KNOWN_ORIGINAL_LOGOS[slug]);
        }
        // 2. Direct clean logoUrl passed from scraper
        if (logoUrl && typeof logoUrl === 'string' && logoUrl.startsWith('http') && !/placeholder|default|avatar|blank|icon-company|globe|favicon/i.test(logoUrl)) {
            list.push(logoUrl);
        }
        // 3. Official Clearbit Brand Logo CDN
        if (domain && domain !== 'company.com') {
            list.push(`https://logo.clearbit.com/${domain}`);
        }
        // 4. Unavatar Universal CDN (without generic fallback)
        if (domain && domain !== 'company.com') {
            list.push(`https://unavatar.io/${domain}?fallback=false`);
        }
        return list;
    }, [slug, domain, logoUrl]);

    const currentImageSrc = (!imgFailed && sourceIndex < candidateSources.length) ? candidateSources[sourceIndex] : null;

    const handleImageError = () => {
        setSourceIndex((prev) => {
            const next = prev + 1;
            if (next >= candidateSources.length) {
                setImgFailed(true);
            }
            return next;
        });
    };

    const handleImageLoad = (e) => {
        // If the image is a 1x1 blank pixel or tiny spacer, fall back to first alphabet logo
        if (e.currentTarget.naturalWidth <= 1 || e.currentTarget.naturalHeight <= 1) {
            handleImageError();
        }
    };

    // If real company logo exists and hasn't errored, display it inside crisp white container
    if (currentImageSrc) {
        return (
            <div
                style={{ width: size, height: size }}
                className={`rounded-xl bg-white border border-slate-200/90 p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-xs hover:shadow-md transition-all ${className}`}
                title={cleanName}
            >
                <img
                    src={currentImageSrc}
                    alt={`${cleanName} logo`}
                    loading="lazy"
                    className="w-full h-full object-contain rounded-lg transition-transform duration-200 hover:scale-105"
                    onError={handleImageError}
                    onLoad={handleImageLoad}
                />
            </div>
        );
    }

    // Otherwise, add the first alphabet as a logo for everyone!
    return (
        <FirstAlphabetLogo
            company={cleanName}
            size={size}
            className={className}
        />
    );
};
