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

function getBrandColor(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash) % 360;
    return `hsl(${h}, 65%, 45%)`;
}

export const CompanyIcon = ({ company = '', logoUrl, size = 40, className = '', }) => {
    const [sourceIndex, setSourceIndex] = useState(0);
    const cleanName = (company || '').trim();
    const slug = useMemo(() => toCompanySlug(cleanName), [cleanName]);
    const domain = useMemo(() => getDomainFromCompany(cleanName), [cleanName]);

    // Reset error fallback index whenever target company or logo changes
    useEffect(() => {
        setSourceIndex(0);
    }, [cleanName, logoUrl]);

    // Progressive hierarchy of original logo candidate sources
    const candidateSources = useMemo(() => {
        const list = [];
        // 1. Check verified official original logo registry (100% verified vector/PNG asset)
        if (slug && KNOWN_ORIGINAL_LOGOS[slug]) {
            list.push(KNOWN_ORIGINAL_LOGOS[slug]);
        }
        // 2. Direct clean logoUrl passed from scraper (if provided)
        if (logoUrl && typeof logoUrl === 'string' && logoUrl.startsWith('http') && !/placeholder|default|avatar|blank|icon-company/i.test(logoUrl)) {
            list.push(logoUrl);
        }
        // 3. Official Clearbit Brand Logo CDN
        if (domain && domain !== 'company.com') {
            list.push(`https://logo.clearbit.com/${domain}`);
        }
        // 4. Unavatar Universal CDN (multi-provider brand resolver)
        if (domain && domain !== 'company.com') {
            list.push(`https://unavatar.io/${domain}?fallback=false`);
        }
        // 5. Google 128px high-resolution favicon
        if (domain && domain !== 'company.com') {
            list.push(`https://www.google.com/s2/favicons?domain=${domain}&sz=128`);
        }
        // 6. DuckDuckGo High-Res Icon
        if (domain && domain !== 'company.com') {
            list.push(`https://icons.duckduckgo.com/ip3/${domain}.ico`);
        }
        return list;
    }, [slug, domain, logoUrl]);

    const currentImageSrc = sourceIndex < candidateSources.length ? candidateSources[sourceIndex] : null;

    const handleImageError = () => {
        setSourceIndex((prev) => prev + 1);
    };

    const initials = cleanName
        ? cleanName
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((w) => w[0])
            .join('')
            .toUpperCase()
        : 'CO';

    const brandBg = useMemo(() => getBrandColor(cleanName), [cleanName]);

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
                />
            </div>
        );
    }

    // Refined modern corporate monogram fallback with dynamic brand coloring
    return (
        <div
            style={{ width: size, height: size, backgroundColor: brandBg }}
            className={`rounded-xl flex items-center justify-center shrink-0 text-white font-black shadow-xs border border-white/20 select-none ${className}`}
            title={cleanName}
        >
            <span
                style={{ fontSize: Math.max(10, Math.floor(size * 0.38)) }}
                className="tracking-tight text-white drop-shadow-sm font-bold"
            >
                {initials}
            </span>
        </div>
    );
};
