import React, { useState, useMemo } from 'react';

interface CompanyIconProps {
  company: string;
  logoUrl?: string;
  size?: number;
  className?: string;
}

// Map of canonical company names to official, high-resolution original brand logo assets
const KNOWN_ORIGINAL_LOGOS: Record<string, string> = {
  // Global Tech Giants
  google: 'https://github.com/google.png',
  alphabet: 'https://github.com/google.png',
  microsoft: 'https://github.com/microsoft.png',
  amazon: 'https://github.com/amazon.png',
  apple: 'https://github.com/apple.png',
  meta: 'https://github.com/facebook.png',
  facebook: 'https://github.com/facebook.png',
  netflix: 'https://github.com/netflix.png',
  spotify: 'https://github.com/spotify.png',
  stripe: 'https://github.com/stripe.png',
  uber: 'https://github.com/uber.png',
  airbnb: 'https://github.com/airbnb.png',
  openai: 'https://github.com/openai.png',
  anthropic: 'https://github.com/anthropics.png',
  adobe: 'https://github.com/adobe.png',
  salesforce: 'https://github.com/salesforce.png',
  nvidia: 'https://github.com/nvidia.png',
  tesla: 'https://github.com/tesla.png',
  github: 'https://github.com/github.png',
  linkedin: 'https://github.com/linkedin.png',
  twitter: 'https://github.com/twitter.png',
  x: 'https://github.com/twitter.png',
  figma: 'https://github.com/figma.png',
  notion: 'https://github.com/makenotion.png',
  canva: 'https://github.com/canva.png',
  slack: 'https://github.com/slackhq.png',
  discord: 'https://github.com/discord.png',
  zoom: 'https://github.com/zoom.png',
  dropbox: 'https://github.com/dropbox.png',
  reddit: 'https://github.com/reddit.png',
  atlassian: 'https://github.com/atlassian.png',
  shopify: 'https://github.com/shopify.png',
  cloudflare: 'https://github.com/cloudflare.png',
  docker: 'https://github.com/docker.png',
  datadog: 'https://github.com/datadog.png',
  snowflake: 'https://github.com/snowflakedb.png',
  palantir: 'https://github.com/palantir.png',
  oracle: 'https://github.com/oracle.png',
  cisco: 'https://github.com/cisco.png',
  intel: 'https://github.com/intel.png',
  ibm: 'https://github.com/ibm.png',
  mongodb: 'https://github.com/mongodb.png',
  redis: 'https://github.com/redis.png',
  postman: 'https://github.com/postmanlabs.png',
  vercel: 'https://github.com/vercel.png',
  supabase: 'https://github.com/supabase.png',
  linear: 'https://github.com/linear.png',
  raycast: 'https://github.com/raycast.png',
  replit: 'https://github.com/replit.png',
  coinbase: 'https://github.com/coinbase.png',
  robinhood: 'https://github.com/robinhood.png',
  bytedance: 'https://github.com/bytedance.png',
  tiktok: 'https://github.com/tiktok.png',
  pinterest: 'https://github.com/pinterest.png',
  snapchat: 'https://github.com/snapchat.png',
  snap: 'https://github.com/snapchat.png',
  paypal: 'https://github.com/paypal.png',
  square: 'https://github.com/square.png',
  block: 'https://github.com/square.png',
  doordash: 'https://github.com/doordash.png',
  instacart: 'https://github.com/instacart.png',
  lyft: 'https://github.com/lyft.png',
  walmart: 'https://github.com/walmart.png',
  target: 'https://github.com/target.png',
  spacex: 'https://github.com/spacex.png',
  crowdstrike: 'https://github.com/crowdstrike.png',
  paloaltonetworks: 'https://github.com/PaloAltoNetworks.png',
  servicenow: 'https://github.com/servicenow.png',
  workday: 'https://github.com/workday.png',
  intuit: 'https://github.com/intuit.png',
  gitlab: 'https://github.com/gitlab.png',
  hashicorp: 'https://github.com/hashicorp.png',

  // Leading Indian Tech & Startups
  swiggy: 'https://github.com/swiggy.png',
  zomato: 'https://github.com/zomato.png',
  razorpay: 'https://github.com/razorpay.png',
  flipkart: 'https://github.com/flipkart.png',
  phonepe: 'https://github.com/phonepe.png',
  paytm: 'https://github.com/paytm.png',
  tcs: 'https://github.com/tata.png',
  tataconsultancyservices: 'https://github.com/tata.png',
  infosys: 'https://github.com/infosys.png',
  wipro: 'https://github.com/wipro.png',
  hcl: 'https://github.com/hcltech.png',
  hcltech: 'https://github.com/hcltech.png',
  techmahindra: 'https://github.com/tech-mahindra.png',
  accenture: 'https://github.com/accenture.png',
  deloitte: 'https://github.com/deloitte.png',
  goldmansachs: 'https://github.com/goldmansachs.png',
  jpmorgan: 'https://github.com/jpmorganchase.png',
  jpmorganchase: 'https://github.com/jpmorganchase.png',
  morganstanley: 'https://github.com/morganstanley.png',
  zepto: 'https://github.com/zepto-corp.png',
  cred: 'https://github.com/cred-app.png',
  meesho: 'https://github.com/meesho.png',
  groww: 'https://github.com/groww.png',
  urbancompany: 'https://github.com/urbancompany.png',
  ola: 'https://github.com/olacabs.png',
};

// Clean company name to standard slug
function toCompanySlug(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/\b(inc|incorporated|ltd|llc|technologies|technology|corp|corporation|solutions|pvt|private|limited|services|group|labs|software|systems|co)\b/gi, '')
    .trim()
    .replace(/[^a-z0-9]/g, '');
}

// Clean and extract a probable domain name from company name
function getDomainFromCompany(name: string): string {
  if (!name) return 'company.com';
  const slug = toCompanySlug(name);
  
  const domainOverrides: Record<string, string> = {
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
    tcs: 'tcs.com',
    infosys: 'infosys.com',
    wipro: 'wipro.com',
    accenture: 'accenture.com',
    deloitte: 'deloitte.com',
    jpmorgan: 'jpmorgan.com',
    goldmansachs: 'goldmansachs.com',
  };

  if (domainOverrides[slug]) {
    return domainOverrides[slug];
  }
  return slug ? `${slug}.com` : 'company.com';
}

export const CompanyIcon: React.FC<CompanyIconProps> = ({
  company = '',
  logoUrl,
  size = 40,
  className = '',
}) => {
  const [sourceIndex, setSourceIndex] = useState(0);

  const cleanName = (company || '').trim();
  const slug = useMemo(() => toCompanySlug(cleanName), [cleanName]);
  const domain = useMemo(() => getDomainFromCompany(cleanName), [cleanName]);

  // Progressive list of original logo candidate sources
  const candidateSources = useMemo(() => {
    const list: string[] = [];

    // 1. Check verified official original logo registry
    if (slug && KNOWN_ORIGINAL_LOGOS[slug]) {
      list.push(KNOWN_ORIGINAL_LOGOS[slug]);
    }

    // 2. Direct logoUrl passed from scraper (if provided)
    if (logoUrl && logoUrl.startsWith('http')) {
      list.push(logoUrl);
    }

    // 3. GitHub Verified Org Avatar (crisp 460x460 official company icon)
    if (slug) {
      list.push(`https://github.com/${slug}.png`);
    }

    // 4. Google 128px high-resolution favicon
    list.push(`https://www.google.com/s2/favicons?domain=${domain}&sz=128`);

    // 5. DuckDuckGo High-Res Icon
    list.push(`https://icons.duckduckgo.com/ip3/${domain}.ico`);

    // 6. Clearbit Logo CDN
    list.push(`https://logo.clearbit.com/${domain}`);

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

  if (currentImageSrc) {
    return (
      <div
        style={{ width: size, height: size }}
        className={`rounded-xl bg-white border border-slate-200/90 p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-xs hover:shadow-md transition-all ${className}`}
        title={cleanName}
      >
        <img
          src={currentImageSrc}
          alt={`${cleanName} original logo`}
          loading="lazy"
          className="w-full h-full object-contain rounded-lg transition-transform duration-200 hover:scale-105"
          onError={handleImageError}
        />
      </div>
    );
  }

  // Refined modern minimalist monogram fallback (clean slate with bold corporate typography)
  return (
    <div
      style={{ width: size, height: size }}
      className={`rounded-xl bg-slate-900 border border-slate-700/80 flex items-center justify-center shrink-0 text-white font-black shadow-xs ${className}`}
      title={cleanName}
    >
      <span style={{ fontSize: Math.max(10, Math.floor(size * 0.36)) }} className="tracking-tight text-slate-100">
        {initials}
      </span>
    </div>
  );
};
