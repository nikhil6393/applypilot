import React, { useState, useEffect, useMemo } from 'react';

// Comprehensive map of canonical company names to official, high-resolution brand logo assets
// Uses Clearbit Logo API as primary source (free, high-res, SVG-quality PNG)
export const KNOWN_ORIGINAL_LOGOS = {
    // ── Global Tech Giants & Cloud ──────────────────────────────────────────
    google: 'https://unavatar.io/google.com',
    alphabet: 'https://unavatar.io/google.com',
    microsoft: 'https://unavatar.io/microsoft.com',
    amazon: 'https://unavatar.io/amazon.com',
    apple: 'https://unavatar.io/apple.com',
    meta: 'https://unavatar.io/meta.com',
    facebook: 'https://unavatar.io/meta.com',
    netflix: 'https://unavatar.io/netflix.com',
    spotify: 'https://unavatar.io/spotify.com',
    stripe: 'https://unavatar.io/stripe.com',
    uber: 'https://unavatar.io/uber.com',
    airbnb: 'https://unavatar.io/airbnb.com',
    openai: 'https://unavatar.io/openai.com',
    anthropic: 'https://unavatar.io/anthropic.com',
    adobe: 'https://unavatar.io/adobe.com',
    salesforce: 'https://unavatar.io/salesforce.com',
    nvidia: 'https://unavatar.io/nvidia.com',
    tesla: 'https://unavatar.io/tesla.com',
    github: 'https://unavatar.io/github.com',
    linkedin: 'https://unavatar.io/linkedin.com',
    twitter: 'https://unavatar.io/x.com',
    x: 'https://unavatar.io/x.com',
    figma: 'https://unavatar.io/figma.com',
    notion: 'https://unavatar.io/notion.so',
    canva: 'https://unavatar.io/canva.com',
    slack: 'https://unavatar.io/slack.com',
    discord: 'https://unavatar.io/discord.com',
    zoom: 'https://unavatar.io/zoom.us',
    dropbox: 'https://unavatar.io/dropbox.com',
    reddit: 'https://unavatar.io/reddit.com',
    atlassian: 'https://unavatar.io/atlassian.com',
    shopify: 'https://unavatar.io/shopify.com',
    cloudflare: 'https://unavatar.io/cloudflare.com',
    docker: 'https://unavatar.io/docker.com',
    datadog: 'https://unavatar.io/datadoghq.com',
    snowflake: 'https://unavatar.io/snowflake.com',
    palantir: 'https://unavatar.io/palantir.com',
    oracle: 'https://unavatar.io/oracle.com',
    cisco: 'https://unavatar.io/cisco.com',
    intel: 'https://unavatar.io/intel.com',
    ibm: 'https://unavatar.io/ibm.com',
    mongodb: 'https://unavatar.io/mongodb.com',
    redis: 'https://unavatar.io/redis.io',
    postman: 'https://unavatar.io/postman.com',
    vercel: 'https://unavatar.io/vercel.com',
    supabase: 'https://unavatar.io/supabase.com',
    linear: 'https://unavatar.io/linear.app',
    raycast: 'https://unavatar.io/raycast.com',
    replit: 'https://unavatar.io/replit.com',
    coinbase: 'https://unavatar.io/coinbase.com',
    robinhood: 'https://unavatar.io/robinhood.com',
    bytedance: 'https://unavatar.io/bytedance.com',
    tiktok: 'https://unavatar.io/tiktok.com',
    pinterest: 'https://unavatar.io/pinterest.com',
    snapchat: 'https://unavatar.io/snapchat.com',
    snap: 'https://unavatar.io/snapchat.com',
    paypal: 'https://unavatar.io/paypal.com',
    square: 'https://unavatar.io/squareup.com',
    block: 'https://unavatar.io/squareup.com',
    doordash: 'https://unavatar.io/doordash.com',
    instacart: 'https://unavatar.io/instacart.com',
    lyft: 'https://unavatar.io/lyft.com',
    walmart: 'https://unavatar.io/walmart.com',
    spacex: 'https://unavatar.io/spacex.com',
    crowdstrike: 'https://unavatar.io/crowdstrike.com',
    paloaltonetworks: 'https://unavatar.io/paloaltonetworks.com',
    servicenow: 'https://unavatar.io/servicenow.com',
    workday: 'https://unavatar.io/workday.com',
    intuit: 'https://unavatar.io/intuit.com',
    gitlab: 'https://unavatar.io/gitlab.com',
    hashicorp: 'https://unavatar.io/hashicorp.com',
    databricks: 'https://unavatar.io/databricks.com',
    retool: 'https://unavatar.io/retool.com',
    ramp: 'https://unavatar.io/ramp.com',
    plaid: 'https://unavatar.io/plaid.com',
    rippling: 'https://unavatar.io/rippling.com',
    gusto: 'https://unavatar.io/gusto.com',
    carta: 'https://unavatar.io/carta.com',
    perplexity: 'https://unavatar.io/perplexity.ai',
    cursor: 'https://unavatar.io/cursor.com',
    huggingface: 'https://unavatar.io/huggingface.co',
    cohere: 'https://unavatar.io/cohere.com',
    scaleai: 'https://unavatar.io/scale.com',
    mistral: 'https://unavatar.io/mistral.ai',
    modal: 'https://unavatar.io/modal.com',
    langchain: 'https://unavatar.io/langchain.com',
    pinecone: 'https://unavatar.io/pinecone.io',

    // ── Leading Indian Tech, Unicorns & Global Enterprises ──────────────────
    swiggy: 'https://unavatar.io/swiggy.com',
    zomato: 'https://unavatar.io/zomato.com',
    razorpay: 'https://unavatar.io/razorpay.com',
    flipkart: 'https://unavatar.io/flipkart.com',
    phonepe: 'https://unavatar.io/phonepe.com',
    paytm: 'https://unavatar.io/paytm.com',
    tcs: 'https://unavatar.io/tcs.com',
    tataconsultancyservices: 'https://unavatar.io/tcs.com',
    infosys: 'https://unavatar.io/infosys.com',
    wipro: 'https://unavatar.io/wipro.com',
    hcl: 'https://unavatar.io/hcltech.com',
    hcltech: 'https://unavatar.io/hcltech.com',
    techmahindra: 'https://unavatar.io/techmahindra.com',
    accenture: 'https://unavatar.io/accenture.com',
    deloitte: 'https://unavatar.io/deloitte.com',
    goldmansachs: 'https://unavatar.io/goldmansachs.com',
    jpmorgan: 'https://unavatar.io/jpmorgan.com',
    jpmorganchase: 'https://unavatar.io/jpmorgan.com',
    morganstanley: 'https://unavatar.io/morganstanley.com',
    zepto: 'https://unavatar.io/zeptonow.com',
    cred: 'https://unavatar.io/cred.club',
    meesho: 'https://unavatar.io/meesho.io',
    groww: 'https://unavatar.io/groww.in',
    urbancompany: 'https://unavatar.io/urbancompany.com',
    ola: 'https://unavatar.io/olacabs.com',
    inmobi: 'https://unavatar.io/inmobi.com',
    browserstack: 'https://unavatar.io/browserstack.com',
    hasura: 'https://unavatar.io/hasura.io',
    yellowai: 'https://unavatar.io/yellow.ai',
    slice: 'https://unavatar.io/sliceit.com',
    navi: 'https://unavatar.io/navi.com',
    juspay: 'https://unavatar.io/juspay.in',
    darwinbox: 'https://unavatar.io/darwinbox.com',
    porter: 'https://unavatar.io/porter.in',
    atherelectric: 'https://unavatar.io/atherenergy.com',
    ather: 'https://unavatar.io/atherenergy.com',
    spinny: 'https://unavatar.io/spinny.com',
    khatabook: 'https://unavatar.io/khatabook.com',
    clevertap: 'https://unavatar.io/clevertap.com',
    chargebee: 'https://unavatar.io/chargebee.com',
    leadsquared: 'https://unavatar.io/leadsquared.com',
    moengage: 'https://unavatar.io/moengage.com',
    zeta: 'https://unavatar.io/zeta.tech',
    lenskart: 'https://unavatar.io/lenskart.com',
    upstox: 'https://unavatar.io/upstox.com',
    curefit: 'https://unavatar.io/cult.fit',
    cars24: 'https://unavatar.io/cars24.com',
    mpl: 'https://unavatar.io/mpl.live',
    unacademy: 'https://unavatar.io/unacademy.com',
    zoho: 'https://unavatar.io/zoho.com',
    freshworks: 'https://unavatar.io/freshworks.com',
    sprinklr: 'https://unavatar.io/sprinklr.com',
    jio: 'https://unavatar.io/jio.com',
    reliancejio: 'https://unavatar.io/jio.com',
    airtel: 'https://unavatar.io/airtel.in',
    cognizant: 'https://unavatar.io/cognizant.com',
    capgemini: 'https://unavatar.io/capgemini.com',
    ltimindtree: 'https://unavatar.io/ltimindtree.com',
    persistent: 'https://unavatar.io/persistent.com',
    mphasis: 'https://unavatar.io/mphasis.com',
    hexaware: 'https://unavatar.io/hexaware.com',
    birlasoft: 'https://unavatar.io/birlasoft.com',
    coforge: 'https://unavatar.io/coforge.com',
    cyient: 'https://unavatar.io/cyient.com',
    tataelxsi: 'https://unavatar.io/tataelxsi.com',
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
    const cleanName = (company || '').trim();
    const [imgFailed, setImgFailed] = useState(false);
    const [imgLoaded, setImgLoaded] = useState(false);

    useEffect(() => {
        setImgFailed(false);
        setImgLoaded(false);
    }, [cleanName, logoUrl]);

    const hasLogoCandidate = Boolean(
        logoUrl &&
        typeof logoUrl === 'string' &&
        logoUrl.startsWith('http') &&
        !/placeholder|default|avatar|blank|icon-company|globe|favicon|clearbit\.com|unavatar\.io/i.test(logoUrl)
    );

    // If no logo candidate or image failed, immediately render the stylish FirstAlphabetLogo
    if (!hasLogoCandidate || imgFailed) {
        return (
            <FirstAlphabetLogo
                company={cleanName}
                size={size}
                className={className}
            />
        );
    }

    return (
        <div
            style={{ width: size, height: size }}
            className={`rounded-xl bg-white border border-slate-200/90 flex items-center justify-center shrink-0 overflow-hidden shadow-xs hover:shadow-md transition-all relative ${className}`}
            title={cleanName}
        >
            {!imgLoaded && (
                <FirstAlphabetLogo
                    company={cleanName}
                    size={size}
                    className="absolute inset-0 w-full h-full"
                />
            )}
            <img
                src={logoUrl}
                alt=""
                loading="lazy"
                className={`w-full h-full object-contain rounded-lg transition-transform duration-200 hover:scale-105 ${imgLoaded ? 'block' : 'hidden'}`}
                onError={() => setImgFailed(true)}
                onLoad={(e) => {
                    if (e.currentTarget.naturalWidth <= 1 || e.currentTarget.naturalHeight <= 1) {
                        setImgFailed(true);
                    } else {
                        setImgLoaded(true);
                    }
                }}
            />
        </div>
    );
};
