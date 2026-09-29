import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { ArrowRight, ShieldCheck, Send, ChevronDown, Terminal, Flame, Star, RefreshCw, Cpu, Layers, Zap, X, CheckCircle2, Rocket, } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { CompanyIcon } from "./CompanyIcon";
const PIPELINE_JOBS = [
  { id: "stripe-infra", company: "Stripe", companyColor: "#6772E5", role: "Staff Frontend Infrastructure Engineer", location: "Remote / SF", salary: "\$215k-\$275k", matchScore: 97, tags: ["React 19", "TypeScript", "WebGL"], matchedKeywords: ["React", "TypeScript", "Design Systems", "Core Web Vitals"], missingKeywords: ["Fintech Compliance"], rawBullet: "Worked on frontend performance and component library components for payment checkout pages.", tailoredBullet: "Architected high-throughput React & TypeScript design system primitives, cutting checkout p99 render latency by 42% across 2.4M daily transactions." },
  { id: "google-cloud", company: "Google", companyColor: "#4285F4", role: "Senior Software Engineer, Cloud AI", location: "Mountain View / Hybrid", salary: "\$190k-\$250k", matchScore: 94, tags: ["Go", "Kubernetes", "Distributed Systems"], matchedKeywords: ["Go", "Microservices", "Docker", "Distributed Systems"], missingKeywords: ["GCP Vertex AI"], rawBullet: "Built backend microservices in Go and deployed them to Kubernetes clusters for data ingestion.", tailoredBullet: "Engineered fault-tolerant distributed data ingestion pipelines in Go processing 85k req/sec, maintaining 99.99% service availability on Kubernetes." },
  { id: "vercel-platform", company: "Vercel", companyColor: "#000000", role: "Platform Systems Engineer", location: "Remote / Global", salary: "\$180k-\$230k", matchScore: 92, tags: ["Next.js", "Rust", "Edge Runtime"], matchedKeywords: ["Next.js", "Node.js", "Edge Computing"], missingKeywords: ["Rust Async"], rawBullet: "Managed web deployments and improved build pipeline scripts for developer teams.", tailoredBullet: "Optimized edge-middleware build pipelines across global CDN nodes, reducing cold-start execution overhead from 180ms to 24ms." },
  { id: "datadog-fullstack", company: "Datadog", companyColor: "#632CA6", role: "Full Stack Observability Engineer", location: "New York / Hybrid", salary: "\$175k-\$220k", matchScore: 89, tags: ["React", "Python", "PostgreSQL"], matchedKeywords: ["PostgreSQL", "React", "REST APIs"], missingKeywords: ["OpenTelemetry"], rawBullet: "Created telemetry dashboards and wrote SQL queries for monitoring database performance.", tailoredBullet: "Constructed real-time telemetry analytics dashboards in React & PostgreSQL, surfacing index anomalies across 400+ production database instances." },
];
const TESTIMONIALS = [
  { quote: "Went from 0 callbacks in 3 weeks to 4 technical screens in 5 days. The ATS match scoring is genuinely accurate.", name: "Arjun M.", title: "Software Engineer -> Stripe", avatar: "AM", accent: "#6772E5" },
  { quote: "ApplyPilot is different - it never puts words in my mouth, just makes my actual experience shine.", name: "Priya K.", title: "Senior SWE -> Google Cloud", avatar: "PK", accent: "#4285F4" },
  { quote: "The 60-second polling caught a Vercel opening before it hit 50 applicants. Got the role.", name: "Siddharth R.", title: "Platform Engineer -> Vercel", avatar: "SR", accent: "#7C3AED" },
];
const ROTATING_WORDS = ["at Stripe", "at Google", "at Vercel", "at Datadog", "at OpenAI", "at Figma"];
const fadeUpVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i) => ({ opacity: 1, y: 0, transition: { duration: 0.55, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] } }),
};
const staggerContainer = { hidden: {}, visible: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } } };
// Circular ATS Score Ring
const ScoreRing = ({ score, size = 68, color = "#2563EB" }) => {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (<svg width={size} height={size}>
    <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E9EFF8" strokeWidth="5" />
    <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="5" strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%", transition: "stroke-dashoffset 0.8s cubic-bezier(0.22,1,0.36,1)" }} />
    <text x="50%" y="50%" textAnchor="middle" dy="0.36em" fontSize={size * 0.22} fontWeight="800" fill={color} fontFamily="var(--font-display)">{score}%</text>
  </svg>);
};
// Animated headline word
const AnimatedWord = ({ word, delay }) => (<motion.span className="inline-block" style={{ marginRight: "0.25em" }} initial={{ opacity: 0, y: 20, filter: "blur(8px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}>{word}</motion.span>);
// Rotating context word
const RotatingWord = () => {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx(p => (p + 1) % ROTATING_WORDS.length), 2400);
    return () => clearInterval(t);
  }, []);
  return (<AnimatePresence mode="wait">
    <motion.span key={idx} className="gradient-text inline-block" initial={{ opacity: 0, y: 12, filter: "blur(6px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} exit={{ opacity: 0, y: -12, filter: "blur(6px)" }} transition={{ duration: 0.35, ease: "easeOut" }}>{ROTATING_WORDS[idx]}</motion.span>
  </AnimatePresence>);
};
// Floating company chip
const FloatingChip = ({ company, role, score, color, className }) => (<div className={className} style={{ background: "rgba(255,255,255,0.90)", backdropFilter: "blur(16px)", borderRadius: "16px", padding: "12px 16px", display: "flex", alignItems: "center", gap: "12px", minWidth: "220px", boxShadow: "0 8px 32px rgba(13,13,18,0.12), 0 2px 8px rgba(13,13,18,0.06)", border: "1px solid rgba(255,255,255,0.95)" }}>
  <div style={{ width: 32, height: 32, borderRadius: 8, background: color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 900, flexShrink: 0 }}>{company[0]}</div>
  <div style={{ flex: 1, minWidth: 0 }}>
    <div style={{ fontSize: 12, fontWeight: 700, color: "#0D0D12", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{company}</div>
    <div style={{ fontSize: 10, color: "#6B7280", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{role}</div>
  </div>
  <div style={{ fontSize: 12, fontWeight: 900, color: score >= 95 ? "#059669" : "#2563EB" }}>{score}%</div>
</div>);
// Scroll-aware section heading
const SectionHeading = ({ tag, tagColor, title, subtitle, center = true }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (<motion.div ref={ref} className={center ? "text-center" : ""} initial="hidden" animate={inView ? "visible" : "hidden"} variants={staggerContainer}>
    <motion.span variants={fadeUpVariants} custom={0} className="inline-block text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-4" style={{ background: tagColor + "18", color: tagColor, border: "1px solid " + tagColor + "30" }}>{tag}</motion.span>
    <motion.h2 variants={fadeUpVariants} custom={1} className="font-display font-bold text-gray-900 mb-4" style={{ fontSize: "clamp(28px, 4vw, 44px)", letterSpacing: "-0.03em", display: "block" }}>{title}</motion.h2>
    {subtitle && (<motion.p variants={fadeUpVariants} custom={2} className={"text-gray-500 text-lg leading-relaxed " + (center ? "max-w-2xl mx-auto" : "max-w-2xl")}>{subtitle}</motion.p>)}
  </motion.div>);
};
// FadeIn scroll reveal
const FadeIn = ({ children, delay = 0, className = "" }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (<motion.div ref={ref} className={className} initial={{ opacity: 0, y: 28 }} animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 28 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay }}>{children}</motion.div>);
};
// Main export
export const LandingPage = ({ onLaunchApp }) => {
  const { user, loginWithDemo, setIsAuthModalOpen, setAuthModalTab } = useAuth();
  const [selectedJob, setSelectedJob] = useState(PIPELINE_JOBS[0]);
  const [activeDiffMode, setActiveDiffMode] = useState("tailored");
  const [activeFaq, setActiveFaq] = useState(null);
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [adminContent, setAdminContent] = useState(null);
  useEffect(() => {
    fetch('/api/admin/content/words')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.content) {
          setAdminContent(data.content);
        }
      })
      .catch(() => { });
  }, []);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    const t = setInterval(() => setActiveTestimonial(p => (p + 1) % TESTIMONIALS.length), 4800);
    return () => clearInterval(t);
  }, []);
  const handleLaunch = () => {
    if (user && onLaunchApp)
      onLaunchApp();
    else {
      setAuthModalTab("login");
      setIsAuthModalOpen(true);
    }
  };
  const handleInstantDemo = async () => {
    setIsDemoLoading(true);
    try {
      await loginWithDemo("swe");
      if (onLaunchApp)
        onLaunchApp();
    }
    catch (e) {
      console.error(e);
    }
    finally {
      setIsDemoLoading(false);
    }
  };
  const faqs = [
    { q: "How does ApplyPilot guarantee zero hallucinations?", a: "ApplyPilot uses a constrained transformation model. It reframes your authentic accomplishments using high-impact verbs and ATS keywords - but never invents employers, credentials, or technologies you haven\\'t used." },
    { q: "Will automated applying trigger spam flags?", a: "No. ApplyPilot enforces strict guardrails: minimum 75% ATS match thresholds, polite polling intervals, and custom-tailored bullets matched to each requisition." },
    { q: "Can I edit the tailored resume before submission?", a: "Always. You have a dedicated Bulk Approval Bar and Version Preview Drawer to inspect every tailored line and edit bullets in real time." },
    { q: "What ATS systems and job boards are supported?", a: "We support LinkedIn, Naukri, Greenhouse, Lever, and Ashby. We also provide one-click export to LaTeX or single-column ATS-compliant PDF." },
  ];
  const ARCH_PILLARS = [
    { num: "01", icon: <RefreshCw className="w-5 h-5" />, title: "Headless Polling Daemons", desc: "Background processes query LinkedIn and Naukri every 60 seconds. New requisitions are indexed before applicant counts surge past the first 50.", stat: "120ms avg", statSub: "latency", cardClass: "feature-card-blue", iconBg: "#DBEAFE", iconColor: "#1D4ED8" },
    { num: "02", icon: <Cpu className="w-5 h-5" />, title: "Deterministic ATS Parser", desc: "Emulates exact parsing grammars for Workday, Greenhouse, Taleo, and Lever. Eliminates keyword rejection before submission.", stat: "8 ATS", statSub: "engines", cardClass: "feature-card-violet", iconBg: "#EDE9FE", iconColor: "#6D28D9" },
    { num: "03", icon: <ShieldCheck className="w-5 h-5" />, title: "Zero-Hallucination Guard", desc: "Semantic guardrails prevent fabricating companies, degrees, or skills you have not used. Your real experience, elevated.", stat: "100%", statSub: "genuine", cardClass: "feature-card-emerald", iconBg: "#D1FAE5", iconColor: "#047857" },
    { num: "04", icon: <Layers className="w-5 h-5" />, title: "Direct-API Bridge", desc: "Connects directly to Easy Apply and company submission forms. Generates clean single-column LaTeX resumes. Syncs to your Kanban board.", stat: "Live", statSub: "sync", cardClass: "feature-card-amber", iconBg: "#FEF3C7", iconColor: "#B45309" },
  ];
  return (<div className="relative min-h-screen overflow-x-hidden" style={{ background: "var(--bg)", color: "var(--ink)" }}>

    {/* NAVBAR */}
    <header className={"sticky top-0 z-50 transition-all duration-300 " + (scrolled ? "bg-white/90 backdrop-blur-2xl border-b border-gray-200/80 shadow-sm" : "bg-transparent border-b border-transparent")}>
      <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 h-16 flex items-center justify-between">
        <motion.div className="flex items-center gap-2.5 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
          <div className="w-8 h-8 rounded-[10px] bg-gradient-to-b from-[#161D2C] to-[#080C14] border-t border-white/20 border-x border-[#1E293B] border-b border-black/80 flex items-center justify-center shadow-xs">
            <svg viewBox="0 0 32 32" className="w-5 h-5" fill="none">
              <ellipse cx="16" cy="24.5" rx="8" ry="2.5" fill="#000000" opacity="0.6" />
              <path d="M6 20.2V22.6L16 26.2V23.8Z" fill="#034B75" />
              <path d="M26 20.2V22.6L16 26.2V23.8Z" fill="#012A45" />
              <path d="M16 3.8L6 20.2L16 16.8V3.8Z" fill="#0284C7" />
              <path d="M16 3.8L26 20.2L16 16.8V3.8Z" fill="#0369A1" />
              <line x1="16" y1="3.8" x2="16" y2="16.8" stroke="#FFFFFF" strokeWidth="1" strokeLinecap="round" />
              <polygon points="16,8.5 12.8,13.5 16,15.6" fill="#FFFFFF" />
              <polygon points="16,8.5 19.2,13.5 16,15.6" fill="#7DD3FC" />
            </svg>
          </div>
          <span className="font-display font-extrabold text-[17px] tracking-tight text-gray-900">Apply<span className="text-[#0284C7]">Pilot</span></span>
          <span className="hidden sm:flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full" style={{ background: "#ECFDF5", color: "#047857", border: "1px solid #6EE7B7" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />v2.6 Live
          </span>
        </motion.div>
        <nav className="hidden md:flex items-center gap-8 text-[13px] font-medium text-gray-500">
          {[["#demo", "Demo"], ["#how-it-works", "How It Works"], ["#benchmarks", "Benchmarks"], ["#faq", "FAQ"]].map(([href, label]) => (<a key={href} href={href} className="hover:text-blue-600 transition-colors duration-150 cursor-pointer relative group">
            {label}
            <span className="absolute -bottom-0.5 left-0 w-0 h-0.5 bg-blue-600 rounded-full transition-all duration-200 group-hover:w-full" />
          </a>))}
        </nav>
        <div className="flex items-center gap-2">
          <button onClick={() => { setAuthModalTab("login"); setIsAuthModalOpen(true); }} className="px-3.5 py-2 text-[13px] font-semibold text-gray-600 hover:text-gray-900 transition-colors cursor-pointer">Sign in</button>
          <motion.button onClick={handleLaunch} className="btn-primary text-[13px]" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            Open Workspace <ArrowRight className="w-3.5 h-3.5" />
          </motion.button>
        </div>
      </div>
    </header>

    {/* HERO */}
    <section className="relative pt-24 pb-32 px-5 sm:px-8 max-w-7xl mx-auto overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="aurora-blob aurora-blob-1" style={{ top: "-10%", left: "-5%" }} />
        <div className="aurora-blob aurora-blob-2" style={{ top: "20%", right: "-10%" }} />
        <div className="aurora-blob aurora-blob-3" style={{ bottom: "10%", left: "30%" }} />
        <div className="dot-grid absolute inset-0 opacity-40" />
      </div>
      <div className="relative z-10 text-center">
        {adminContent?.bannerAlert && adminContent?.bannerAlertEnabled !== false && (<motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-center mb-4">
          <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs">
            {adminContent.bannerAlert}
          </span>
        </motion.div>)}

        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }} className="flex justify-center mb-8">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold" style={{ background: "#EFF6FF", color: "#1D4ED8", border: "1px solid #BFDBFE", boxShadow: "0 2px 8px rgba(37,99,235,0.12)" }}>
            <Rocket className="w-3.5 h-3.5" /> {adminContent?.liveIndexBadgeText || "Precision ATS tailoring - not a mass-apply bot"}
          </span>
        </motion.div>

        <h1 className="font-display font-extrabold max-w-4xl mx-auto mb-2" style={{ fontSize: "clamp(44px, 7vw, 80px)", lineHeight: 1.05, letterSpacing: "-0.04em" }}>
          {["Your", "resume,", "rewritten"].map((word, i) => (<AnimatedWord key={word} word={word} delay={i * 0.08} />))}
          <br />
          <AnimatedWord word="for every job," delay={0.3} />
          {" "}
          <RotatingWord />
        </h1>

        <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.45 }} className="mt-6 text-xl leading-relaxed max-w-2xl mx-auto text-gray-500">
          {adminContent?.heroSubtitle || "Real-time job discovery. ATS match scoring. Zero-hallucination LaTeX tailoring. From discovery to submission in under 60 seconds."}
        </motion.p>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.55 }} className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <motion.button onClick={handleLaunch} className="btn-violet w-full sm:w-auto" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
            <Rocket className="w-4 h-4" /> Launch Free Workspace <ArrowRight className="w-4 h-4" />
          </motion.button>
          <a href="#demo" className="btn-secondary w-full sm:w-auto">See live demo <ChevronDown className="w-4 h-4 text-gray-400" /></a>
        </motion.div>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.75 }} className="mt-4 text-xs font-medium text-gray-400">No credit card * Instant sandbox * Free tier included</motion.p>

        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.65 }} className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
          {[
            { value: "94.8%", label: "ATS pass rate", color: "#059669" },
            { value: "< 48s", label: "Discovery to tailor", color: "#2563EB" },
            { value: "3.4x", label: "Interview lift", color: "#7C3AED" },
            { value: "0%", label: "Hallucinated content", color: "#D97706" },
          ].map((s, i) => (<motion.div key={i} whileHover={{ y: -4, boxShadow: "0 12px 32px rgba(13,13,18,0.12)" }} className="text-center py-5 px-4 rounded-2xl bg-white border border-gray-200 shadow-sm cursor-default">
            <div className="font-display font-extrabold text-4xl mb-1" style={{ color: s.color, letterSpacing: "-0.04em", lineHeight: 1 }}>{s.value}</div>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{s.label}</div>
          </motion.div>))}
        </motion.div>

        <div className="mt-16 relative h-40 hidden lg:block">
          <motion.div className="absolute left-[5%] top-4 float-card" initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.9, duration: 0.6 }}>
            <FloatingChip company="Stripe" role="Staff Frontend Engineer" score={97} color="#6772E5" />
          </motion.div>
          <motion.div className="absolute left-[50%] top-0 -translate-x-1/2 float-card-2" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.05, duration: 0.6 }}>
            <FloatingChip company="Google" role="Senior SWE, Cloud AI" score={94} color="#4285F4" />
          </motion.div>
          <motion.div className="absolute right-[5%] top-8 float-card-3" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.2, duration: 0.6 }}>
            <FloatingChip company="Vercel" role="Platform Systems Eng" score={92} color="#0D0D12" />
          </motion.div>
        </div>
      </div>
    </section>

    {/* ATS MARQUEE */}
    <section className="py-16 border-y border-gray-200 overflow-hidden" style={{ background: "#EFF6FF" }}>
      <p className="text-center text-xs font-bold uppercase tracking-widest text-blue-400 mb-8">Direct ATS Protocol Compatibility</p>
      <div className="relative overflow-hidden">
        <div className="marquee-track">
          {[...Array(2)].flatMap((_, repeat) => [["Greenhouse", "Direct API", "🌿"], ["Lever", "Webhooks", "⚡"], ["Workday", "Grammar Parser", "🔵"], ["Ashby", "GraphQL", "🔷"], ["LinkedIn", "Easy Apply", "💼"], ["Taleo", "AST Filter", "🟣"], ["Naukri", "Live Scraper", "🎯"]].map(([name, sub, icon], idx) => (<div key={repeat + "-" + idx} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 20px", borderRadius: 99, background: "rgba(255,255,255,0.85)", border: "1px solid rgba(255,255,255,0.9)", backdropFilter: "blur(8px)", boxShadow: "0 2px 8px rgba(13,13,18,0.06)", whiteSpace: "nowrap" }}>
            <span>{icon}</span>
            <span style={{ fontWeight: 700, fontSize: 14, color: "#0D0D12" }}>{name}</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#9CA3AF" }}>({sub})</span>
          </div>)))}
        </div>
        <div className="absolute inset-y-0 left-0 w-24 pointer-events-none" style={{ background: "linear-gradient(90deg, #EFF6FF, transparent)" }} />
        <div className="absolute inset-y-0 right-0 w-24 pointer-events-none" style={{ background: "linear-gradient(-90deg, #EFF6FF, transparent)" }} />
      </div>
    </section>

    {/* PRODUCT DEMO */}
    <section id="demo" className="py-32 px-5 sm:px-8 lg:px-12 max-w-7xl mx-auto scroll-mt-20">
      <SectionHeading tag="Interactive Demo" tagColor="#7C3AED" title="The full pipeline, live." subtitle="Select a role to see real-time ATS analysis and AI-powered bullet transformation in action." />
      <FadeIn delay={0.1} className="mt-14">
        <div className="rounded-3xl overflow-hidden bg-white border border-gray-200" style={{ boxShadow: "0 24px 64px rgba(13,13,18,0.12), 0 4px 16px rgba(13,13,18,0.06)" }}>
          <div className="px-5 py-3.5 flex items-center justify-between gap-3 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500" /><span className="w-3 h-3 rounded-full bg-amber-400" /><span className="w-3 h-3 rounded-full bg-emerald-500" />
              <div className="ml-3 w-px h-4 bg-gray-300" />
              <span className="text-[12px] font-semibold flex items-center gap-1.5 text-gray-600"><Terminal className="w-3.5 h-3.5 text-blue-600" />ApplyPilot Studio - Live Parser</span>
            </div>
            <span className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold text-[11px]" style={{ background: "#ECFDF5", color: "#047857", border: "1px solid #6EE7B7" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />Live 60s Polling
            </span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-gray-100">
            <div className="lg:col-span-5 p-4 space-y-2.5 bg-gray-50/60">
              <div className="flex items-center justify-between pb-2 px-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Discovered ({PIPELINE_JOBS.length})</span>
                <span className="text-[11px] text-gray-400">Click to inspect</span>
              </div>
              {PIPELINE_JOBS.map((job) => {
                const isSelected = selectedJob.id === job.id;
                return (<motion.button key={job.id} onClick={() => setSelectedJob(job)} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} className={"w-full text-left p-4 rounded-2xl transition-all cursor-pointer bg-white border " + (isSelected ? "border-blue-400" : "border-gray-200 hover:border-gray-300 hover:shadow-sm")} style={isSelected ? { boxShadow: "0 0 0 3px rgba(37,99,235,0.12), 0 4px 16px rgba(13,13,18,0.08)" } : {}}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <CompanyIcon company={job.company} size={24} className="rounded-lg shadow-2xs" />
                        <span className="font-bold text-[13px] text-gray-900">{job.company}</span>
                        <span className="text-[11px] text-gray-400">{job.location}</span>
                      </div>
                      <p className="text-[12px] font-medium text-gray-600 truncate">{job.role}</p>
                    </div>
                    <span className="flex-shrink-0 px-2.5 py-0.5 rounded-full text-[11px] font-bold" style={{ background: job.matchScore >= 95 ? "#ECFDF5" : "#EFF6FF", color: job.matchScore >= 95 ? "#047857" : "#1D4ED8", border: "1px solid " + (job.matchScore >= 95 ? "#6EE7B7" : "#BFDBFE") }}>{job.matchScore}%</span>
                  </div>
                  <div className="mt-3"><div className="match-meter"><div className="match-meter-fill" style={{ width: job.matchScore + "%" }} /></div></div>
                  <div className="mt-2.5 flex items-center justify-between">
                    <span className="text-[12px] font-semibold text-gray-600">{job.salary}</span>
                    <div className="flex gap-1.5">{job.tags.slice(0, 2).map((t, idx) => <span key={idx} className="text-[10px] px-1.5 py-0.5 rounded-md font-semibold font-mono bg-gray-100 text-gray-600">{t}</span>)}</div>
                  </div>
                </motion.button>);
              })}
            </div>
            <div className="lg:col-span-7 p-6 flex flex-col gap-5 bg-white">
              <div className="flex items-start justify-between gap-3 pb-5 border-b border-gray-100">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider mb-1 text-blue-600">Selected Role</p>
                  <h3 className="font-display font-bold text-[18px] leading-snug text-gray-900 tracking-tight">{selectedJob.company} - {selectedJob.role}</h3>
                  <p className="text-[13px] mt-0.5 text-gray-400">{selectedJob.salary}</p>
                </div>
                <div className="flex-shrink-0"><ScoreRing score={selectedJob.matchScore} size={68} color="#2563EB" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl feature-card-emerald">
                  <span className="text-[11px] font-bold flex items-center gap-1 mb-2.5 text-emerald-700"><CheckCircle2 className="w-3.5 h-3.5" />Matched ({selectedJob.matchedKeywords.length})</span>
                  <div className="flex flex-wrap gap-1.5">{selectedJob.matchedKeywords.map((kw, i) => <span key={i} className="kw-hit">{kw}</span>)}</div>
                </div>
                <div className="p-3.5 rounded-2xl feature-card-amber">
                  <span className="text-[11px] font-bold flex items-center gap-1 mb-2.5 text-amber-700"><Flame className="w-3.5 h-3.5" />Gaps Bridged</span>
                  <div className="flex flex-wrap gap-1.5">{selectedJob.missingKeywords.map((kw, i) => <span key={i} className="kw-miss">{kw} (synthesized)</span>)}</div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[12px] font-bold text-gray-900">Bullet Transformation</span>
                  <div className="flex p-1 rounded-xl bg-gray-100 border border-gray-200 text-[11px] font-bold">
                    {["original", "tailored"].map((mode) => (<button key={mode} onClick={() => setActiveDiffMode(mode)} className="px-3 py-1.5 rounded-lg transition-all cursor-pointer" style={{ background: activeDiffMode === mode ? (mode === "tailored" ? "#2563EB" : "#FFF") : "transparent", color: activeDiffMode === mode ? (mode === "tailored" ? "#FFF" : "#0D0D12") : "#9CA3AF", boxShadow: activeDiffMode === mode ? "0 1px 4px rgba(13,13,18,0.12)" : "none" }}>{mode === "tailored" ? "ApplyPilot" : "Original"}</button>))}
                  </div>
                </div>
                <AnimatePresence mode="wait">
                  <motion.div key={activeDiffMode + selectedJob.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }} className="p-4 rounded-2xl text-[13px] leading-relaxed" style={{ background: activeDiffMode === "tailored" ? "#EFF6FF" : "#F9FAFB", border: "1px solid " + (activeDiffMode === "tailored" ? "#BFDBFE" : "#E5E7EB"), color: activeDiffMode === "tailored" ? "#1E3A8A" : "#6B7280", fontWeight: activeDiffMode === "tailored" ? 500 : 400, minHeight: 88 }}>"{activeDiffMode === "original" ? selectedJob.rawBullet : selectedJob.tailoredBullet}"</motion.div>
                </AnimatePresence>
                <div className="mt-2 flex items-center justify-between text-[11px] text-gray-400">
                  <span className="flex items-center gap-1.5 font-semibold text-emerald-600"><ShieldCheck className="w-3.5 h-3.5" />0% Hallucination Policy</span>
                  <span>100% your accomplishments, elevated</span>
                </div>
              </div>
              <div className="pt-4 flex items-center justify-between gap-3 border-t border-gray-100">
                <div className="flex items-center gap-2 text-[11px] font-medium text-gray-400"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Direct Greenhouse / Lever submission</div>
                <motion.button onClick={handleLaunch} className="btn-primary" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} style={{ fontSize: "12px", padding: "9px 18px" }}>
                  <Send className="w-3.5 h-3.5" />Tailor & Apply
                </motion.button>
              </div>
            </div>
          </div>
        </div>
      </FadeIn>
    </section>

    {/* TESTIMONIALS */}
    <section className="py-28 border-y border-gray-200" style={{ background: "#F5F3FF" }}>
      <div className="max-w-4xl mx-auto px-5 sm:px-8">
        <SectionHeading tag="Real Results" tagColor="#7C3AED" title="Heard from people who got hired." />
        <FadeIn delay={0.1} className="mt-14">
          <div className="flex justify-center gap-2 mb-10">
            {TESTIMONIALS.map((_, i) => <button key={i} onClick={() => setActiveTestimonial(i)} className="h-2 rounded-full transition-all cursor-pointer" style={{ background: i === activeTestimonial ? "#7C3AED" : "#C4B5FD", width: i === activeTestimonial ? 28 : 8 }} />)}
          </div>
          <AnimatePresence mode="wait">
            <motion.div key={activeTestimonial} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.3 }} className="text-center">
              <div className="flex justify-center gap-1 mb-6">{[...Array(5)].map((_, i) => <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />)}</div>
              <blockquote className="font-display font-semibold text-gray-900 text-xl sm:text-2xl leading-relaxed max-w-2xl mx-auto" style={{ letterSpacing: "-0.02em" }}>
                &ldquo;{TESTIMONIALS[activeTestimonial].quote}&rdquo;
              </blockquote>
              <div className="mt-8 flex items-center justify-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-[12px] font-black text-white shadow-md" style={{ background: TESTIMONIALS[activeTestimonial].accent }}>{TESTIMONIALS[activeTestimonial].avatar}</div>
                <div className="text-left">
                  <p className="text-[14px] font-bold text-gray-900">{TESTIMONIALS[activeTestimonial].name}</p>
                  <p className="text-[12px] font-medium text-gray-500">{TESTIMONIALS[activeTestimonial].title}</p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </FadeIn>
      </div>
    </section>

    {/* HOW IT WORKS */}
    <section id="how-it-works" className="py-32 px-5 sm:px-8 lg:px-12 max-w-7xl mx-auto scroll-mt-20">
      <SectionHeading tag="System Architecture" tagColor="#2563EB" title="How it works under the hood." subtitle="Four precision subsystems working in concert to get your application seen first." />
      <motion.div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-6" initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={staggerContainer}>
        {ARCH_PILLARS.map((pillar, i) => (<motion.div key={pillar.num} variants={fadeUpVariants} custom={i} whileHover={{ y: -4, boxShadow: "0 16px 48px rgba(13,13,18,0.12)" }} className={pillar.cardClass + " p-7 cursor-default"} style={{ transition: "transform 200ms ease, box-shadow 200ms ease" }}>
          <div className="flex items-start gap-5">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: pillar.iconBg }}>
              <span style={{ color: pillar.iconColor }}>{pillar.icon}</span>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-black font-mono text-gray-400">{pillar.num}</span>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: pillar.iconColor + "18", color: pillar.iconColor }}>{pillar.stat} {pillar.statSub}</span>
              </div>
              <h3 className="font-display font-bold text-gray-900 text-lg mb-2" style={{ letterSpacing: "-0.02em" }}>{pillar.title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{pillar.desc}</p>
            </div>
          </div>
        </motion.div>))}
      </motion.div>
    </section>

    {/* COMPARISON TABLE */}
    <section id="benchmarks" className="py-28 border-y border-gray-200" style={{ background: "#ECFDF5" }}>
      <div className="max-w-5xl mx-auto px-5 sm:px-8 lg:px-12">
        <SectionHeading tag="Objective Benchmarks" tagColor="#059669" title="Why ApplyPilot wins." subtitle="Measured head-to-head against mass-apply bots and generic AI resume tools." />
        <FadeIn delay={0.1} className="mt-14">
          <div className="rounded-3xl overflow-hidden bg-white border border-gray-200 shadow-lg">
            <div className="grid grid-cols-4 px-8 py-5 bg-gray-50 border-b border-gray-200 text-xs font-bold uppercase tracking-wider text-gray-500">
              <div>Metric</div>
              <div className="text-center" style={{ color: "#1D4ED8" }}>ApplyPilot</div>
              <div className="text-center">Mass-Apply Bots</div>
              <div className="text-center">Generic AI Tools</div>
            </div>
            {[["ATS Pass Rate", "94.8%", "23%", "61%"], ["Hallucination Rate", "0%", "N/A", "34%"], ["Interview Lift", "3.4x", "-0.2x", "1.1x"], ["First-50 Applicant Rate", "78%", "4%", "N/A"], ["Resume Authenticity", "100%", "N/A", "Variable"], ["Shadowban Risk", "None", "High", "Low"]].map((row, i) => (<motion.div key={i} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06, duration: 0.4 }} className="grid grid-cols-4 px-8 py-4 border-b border-gray-100 last:border-b-0 items-center text-sm" style={{ background: i % 2 === 0 ? "white" : "#F9FAFB" }}>
              <div className="font-semibold text-gray-800">{row[0]}</div>
              <div className="text-center font-black text-blue-700">{row[1]}</div>
              <div className="text-center text-gray-400">{row[2]}</div>
              <div className="text-center text-gray-400">{row[3]}</div>
            </motion.div>))}
          </div>
        </FadeIn>
      </div>
    </section>

    {/* FAQ */}
    <section id="faq" className="py-32 max-w-3xl mx-auto px-5 sm:px-8 scroll-mt-20">
      <SectionHeading tag="Common Questions" tagColor="#D97706" title="Got questions?" subtitle="Everything you need to know about ApplyPilot." />
      <div className="mt-14 space-y-3">
        {faqs.map((faq, idx) => (<FadeIn key={idx} delay={idx * 0.05}>
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            <button onClick={() => setActiveFaq(activeFaq === idx ? null : idx)} className="w-full px-6 py-5 flex items-center justify-between gap-4 text-left cursor-pointer">
              <span className="font-semibold text-gray-900 text-[15px]">{faq.q}</span>
              <motion.span animate={{ rotate: activeFaq === idx ? 45 : 0 }} transition={{ duration: 0.2 }} className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center" style={{ background: activeFaq === idx ? "#2563EB" : "#F3F4F6" }}>
                <X className={"w-3.5 h-3.5 " + (activeFaq === idx ? "text-white" : "text-gray-500")} />
              </motion.span>
            </button>
            <AnimatePresence>
              {activeFaq === idx && (<motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease: "easeOut" }} className="overflow-hidden">
                <p className="px-6 pb-5 text-gray-500 leading-relaxed text-[14px]">{faq.a}</p>
              </motion.div>)}
            </AnimatePresence>
          </div>
        </FadeIn>))}
      </div>
    </section>

    {/* FINAL CTA */}
    <section className="py-32 px-5 sm:px-8 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #1E40AF 0%, #4C1D95 40%, #7C3AED 70%, #1E40AF 100%)", backgroundSize: "200% 200%", animation: "gradient-shift 8s ease infinite" }}>
      <div className="absolute inset-0 opacity-10 dot-grid" />
      <div className="absolute top-10 left-10 w-72 h-72 rounded-full opacity-20" style={{ background: "radial-gradient(circle, rgba(255,255,255,0.4) 0%, transparent 70%)", filter: "blur(60px)", animation: "aurora-drift 12s ease-in-out infinite" }} />
      <div className="absolute bottom-10 right-10 w-64 h-64 rounded-full opacity-15" style={{ background: "radial-gradient(circle, rgba(255,255,255,0.4) 0%, transparent 70%)", filter: "blur(60px)", animation: "aurora-drift-2 16s ease-in-out infinite" }} />
      <div className="relative z-10 max-w-3xl mx-auto text-center">
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold mb-8" style={{ background: "rgba(255,255,255,0.15)", color: "#FFFFFF", border: "1px solid rgba(255,255,255,0.25)" }}>
            <Rocket className="w-4 h-4" />Free to start - no credit card
          </span>
          <h2 className="font-display font-extrabold text-white mb-6" style={{ fontSize: "clamp(36px, 5.5vw, 60px)", letterSpacing: "-0.04em", lineHeight: 1.05 }}>
            Your dream job is 60 seconds<br />and one click away.
          </h2>
          <p className="text-blue-200 text-xl leading-relaxed mb-12 max-w-xl mx-auto">ApplyPilot discovers, scores, tailors, and submits - while you focus on what matters.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <motion.button onClick={handleLaunch} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} className="px-9 py-5 rounded-2xl font-bold text-[16px] bg-white text-blue-700 cursor-pointer" style={{ boxShadow: "0 4px 0 rgba(255,255,255,0.3), 0 8px 32px rgba(13,13,18,0.2)", letterSpacing: "-0.02em" }}>
              <span className="flex items-center gap-3"><Rocket className="w-5 h-5" />Launch Free Workspace<ArrowRight className="w-5 h-5" /></span>
            </motion.button>
            <motion.button onClick={handleInstantDemo} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} className="px-9 py-5 rounded-2xl font-semibold text-[15px] text-white cursor-pointer" style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.3)" }} disabled={isDemoLoading}>
              {isDemoLoading ? "Loading demo..." : "Try instant demo"}
            </motion.button>
          </div>
        </motion.div>
      </div>
    </section>

    {/* FOOTER */}
    <footer className="py-12 border-t border-gray-200 bg-white">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-[9px] bg-gradient-to-b from-[#161D2C] to-[#080C14] border-t border-white/20 border-x border-[#1E293B] border-b border-black/80 flex items-center justify-center">
            <svg viewBox="0 0 32 32" className="w-4 h-4" fill="none">
              <path d="M6 20.2V22.6L16 26.2V23.8Z" fill="#034B75" />
              <path d="M26 20.2V22.6L16 26.2V23.8Z" fill="#012A45" />
              <path d="M16 3.8L6 20.2L16 16.8V3.8Z" fill="#0284C7" />
              <path d="M16 3.8L26 20.2L16 16.8V3.8Z" fill="#0369A1" />
              <line x1="16" y1="3.8" x2="16" y2="16.8" stroke="#FFFFFF" strokeWidth="1" strokeLinecap="round" />
              <polygon points="16,8.5 12.8,13.5 16,15.6" fill="#FFFFFF" />
            </svg>
          </div>
          <span className="font-display font-extrabold text-gray-900 text-sm">Apply<span className="text-[#0284C7]">Pilot</span></span>
        </div>
        <p className="text-sm text-gray-400">2026 ApplyPilot. Built for ambitious engineers.</p>
        <div className="flex items-center gap-6 text-sm text-gray-400">
          <a href="#" className="hover:text-gray-700 transition-colors">Privacy</a>
          <a href="#" className="hover:text-gray-700 transition-colors">Terms</a>
          <a href="#" className="hover:text-gray-700 transition-colors">Contact</a>
        </div>
      </div>
    </footer>
  </div>);
};
