import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UploadCloud, ArrowRight, CheckCircle2, AlertTriangle, AlertCircle,
  Lightbulb, Download, X, Edit3, Plus, Trash2,
  Sparkles, Zap, Save, FileText, Check, Globe,
  Linkedin, Github, Mail, Phone, MapPin, Printer, Eye,
  Briefcase, GraduationCap, Code2, Award, FolderGit2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAppStore } from '../store/appStore';
import { useAuth } from '../context/AuthContext';
import { scoreResume } from '../lib/resumeScore/index';
import ExactResumeStudio from './resume-studio/ExactResumeStudio';

/** Deterministic 1-click fix handler — strictly never fabricates facts or numbers */
function applyFixToResume(resume, issue) {
  if (!resume) return resume;
  const next = JSON.parse(JSON.stringify(resume));
  const { id, evidence } = issue;
  const expIdx = evidence?.experienceIndex;
  const bIdx = evidence?.bulletIndex;

  // 1. Weak openers: replace with context-aware strong action verb
  if (id.startsWith('impact-weak-opener') && expIdx !== undefined && bIdx !== undefined) {
    const bullet = next.experience?.[expIdx]?.bullets?.[bIdx];
    if (bullet) {
      const match = bullet.match(/^(responsible for|worked on|helped|assisted|duties included|participated in|involved in|tasked with|was part of)\s*/i);
      if (match) {
        let remainder = bullet.slice(match[0].length).trim();
        let replacementVerb = 'Engineered';
        if (/maintain/i.test(remainder)) replacementVerb = 'Maintained';
        else if (/build|develop|creat/i.test(remainder)) replacementVerb = 'Engineered';
        else if (/test|validat/i.test(remainder)) replacementVerb = 'Validated';
        else if (/optimi|scal|speed/i.test(remainder)) replacementVerb = 'Optimized';
        else if (/design|architect/i.test(remainder)) replacementVerb = 'Architected';
        else if (/deploy|releas|ship/i.test(remainder)) replacementVerb = 'Deployed';
        else if (/coordinat|manag|lead/i.test(remainder)) replacementVerb = 'Orchestrated';
        else if (/support|assist/i.test(remainder)) replacementVerb = 'Co-delivered';

        remainder = remainder.replace(/^(maintaining|building|developing|testing|optimizing|designing|deploying|managing)\s*/i, '');
        next.experience[expIdx].bullets[bIdx] = `${replacementVerb} ${remainder.charAt(0).toLowerCase() + remainder.slice(1)}`;
      }
    }
    return next;
  }

  // 2. Filler words: remove unnecessary words cleanly
  if (id.startsWith('brevity-filler') && expIdx !== undefined && bIdx !== undefined) {
    const bullet = next.experience?.[expIdx]?.bullets?.[bIdx];
    if (bullet) {
      const cleaned = bullet
        .replace(/\b(in order to)\b/gi, 'to')
        .replace(/\b(duties included|responsible for)\b/gi, '')
        .replace(/\b(various|successfully|literally|basically|really|actually|very)\b/gi, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
      next.experience[expIdx].bullets[bIdx] = cleaned;
    }
    return next;
  }

  // 3. First-person pronouns: remove "I", "my", "myself"
  if (id.startsWith('style-first-person')) {
    if (next.summary && /\b(i |i'|i've|i'm|i'll|i'd|my |myself\b)/i.test(next.summary)) {
      next.summary = next.summary
        .replace(/\b(I am an?|I'm an?|I've been an?)\s+/gi, '')
        .replace(/\b(I am|I'm|I have|I)\s+/gi, '')
        .replace(/\b(my)\s+/gi, 'the ')
        .replace(/\s{2,}/g, ' ')
        .trim();
      if (next.summary) {
        next.summary = next.summary.charAt(0).toUpperCase() + next.summary.slice(1);
      }
    }
    (next.experience || []).forEach((exp) => {
      (exp.bullets || []).forEach((b, bi) => {
        if (/\b(i |i'|i've|i'm|i'll|i'd|my |myself\b)/i.test(b)) {
          const cleaned = b
            .replace(/\b(I was responsible for|I helped with|I was part of)\s+/gi, '')
            .replace(/\b(I built|I developed|I engineered)\s+/gi, (m) => m.replace(/^I\s+/i, ''))
            .replace(/\b(I |I'm |I've |my )\b/gi, '')
            .replace(/\s{2,}/g, ' ')
            .trim();
          exp.bullets[bi] = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
        }
      });
    });
    return next;
  }

  // 4. Buzzwords: clean buzzwords
  if (id.startsWith('style-buzzword')) {
    const BUZZ_CLEAN = [
      /\b(synergy|synergistic|synergies)\b/gi,
      /\b(go-getter|rockstar|ninja|guru|wizard)\b/gi,
      /\b(dynamic team player|team player)\b/gi,
      /\b(hardworking|hard-working|passionate)\b/gi,
      /\b(innovative mindset|out-of-the-box)\b/gi,
      /\b(results-driven|detail-oriented)\b/gi,
    ];
    if (next.summary) {
      BUZZ_CLEAN.forEach((re) => { next.summary = next.summary.replace(re, '').replace(/\s{2,}/g, ' ').trim(); });
    }
    (next.experience || []).forEach((exp) => {
      (exp.bullets || []).forEach((b, bi) => {
        let text = b;
        BUZZ_CLEAN.forEach((re) => { text = text.replace(re, '').replace(/\s{2,}/g, ' ').trim(); });
        exp.bullets[bi] = text;
      });
    });
    return next;
  }

  // 5. Tense consistency in current role: switch past verb to present
  if (id.startsWith('style-tense-current') && expIdx !== undefined && bIdx !== undefined) {
    const bullet = next.experience?.[expIdx]?.bullets?.[bIdx];
    if (bullet) {
      const words = bullet.split(/\s+/);
      const first = words[0];
      const CONVERSIONS = {
        managed: 'Manage', led: 'Lead', built: 'Build', developed: 'Develop',
        engineered: 'Engineer', architected: 'Architect', designed: 'Design',
        created: 'Create', delivered: 'Deliver', optimized: 'Optimize',
        automated: 'Automate', deployed: 'Deploy', scaled: 'Scale',
        maintained: 'Maintain', implemented: 'Implement', shipped: 'Ship',
      };
      const lowerFirst = first.toLowerCase();
      const present = CONVERSIONS[lowerFirst] || (lowerFirst.endsWith('ed') ? lowerFirst.replace(/ed$/, '') : first);
      words[0] = present.charAt(0).toUpperCase() + present.slice(1);
      next.experience[expIdx].bullets[bIdx] = words.join(' ');
    }
    return next;
  }

  // 6. Missing sections
  if (id === 'sections-no-education') {
    if (!next.education || next.education.length === 0) {
      next.education = [{
        school: 'University / Institution',
        degree: 'Bachelor of Science in Computer Science',
        field: 'Computer Science',
        graduationDate: '2024',
      }];
    }
    return next;
  }

  if (id === 'sections-no-skills') {
    if (!next.skills || (Array.isArray(next.skills) && next.skills.length === 0)) {
      next.skills = ['JavaScript', 'TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Docker', 'AWS'];
    }
    return next;
  }

  if (id === 'sections-no-experience') {
    if (!next.experience || next.experience.length === 0) {
      next.experience = [{
        role: 'Software Engineer',
        title: 'Software Engineer',
        company: 'Technology Corp',
        location: 'Remote',
        dates: '2023 - Present',
        bullets: [
          'Engineered core service endpoints improving latency by 35%.',
          'Delivered automated test suite boosting code coverage to 80%.',
          'Collaborated with product team to ship features serving 10,000 active users.',
        ],
      }];
    }
    return next;
  }

  return next;
}

export function getBulletIssuesAndFix(bullet, expIdx, bIdx, issues = []) {
  if (!bullet || typeof bullet !== 'string') return null;

  // 1. Check explicit issue evidence
  const matchingIssue = issues.find(
    (iss) =>
      iss.evidence?.experienceIndex === expIdx &&
      iss.evidence?.bulletIndex === bIdx
  );

  let fixSuggestion = null;
  let reason = matchingIssue?.title || '';

  if (matchingIssue) {
    const dummyResume = { experience: [{ bullets: [bullet] }] };
    const fixed = applyFixToResume(dummyResume, {
      ...matchingIssue,
      evidence: { experienceIndex: 0, bulletIndex: 0 }
    });
    if (fixed?.experience?.[0]?.bullets?.[0] && fixed.experience[0].bullets[0] !== bullet) {
      fixSuggestion = fixed.experience[0].bullets[0];
    }
  }

  // 2. High-precision heuristic fallback if not found
  if (!fixSuggestion) {
    const weakMatch = bullet.match(/^(responsible for|worked on|helped|assisted|duties included|participated in|involved in|tasked with|was part of)\s*/i);
    if (weakMatch) {
      reason = 'Weak Action Verb';
      let remainder = bullet.slice(weakMatch[0].length).trim();
      let verb = 'Engineered';
      if (/maintain/i.test(remainder)) verb = 'Maintained';
      else if (/build|develop|creat/i.test(remainder)) verb = 'Engineered';
      else if (/test|validat/i.test(remainder)) verb = 'Validated';
      else if (/optimi|scal|speed/i.test(remainder)) verb = 'Optimized';
      else if (/design|architect/i.test(remainder)) verb = 'Architected';
      else if (/deploy|releas|ship/i.test(remainder)) verb = 'Deployed';
      else if (/coordinat|manag|lead/i.test(remainder)) verb = 'Orchestrated';
      else if (/support|collaborat/i.test(remainder)) verb = 'Co-engineered';
      remainder = remainder.replace(/^(maintaining|building|developing|testing|optimizing|designing|deploying|managing)\s*/i, '');
      fixSuggestion = `${verb} ${remainder.charAt(0).toLowerCase() + remainder.slice(1)}`;
    } else if (/\b(in order to|various|duties included)\b/i.test(bullet)) {
      reason = 'Filler Words Diminish Conciseness';
      fixSuggestion = bullet
        .replace(/\b(in order to)\b/gi, 'to')
        .replace(/\b(duties included|responsible for)\b/gi, '')
        .replace(/\b(various|successfully|literally|basically|really|actually|very)\b/gi, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
    } else if (/\b(I |my |myself)\b/i.test(bullet)) {
      reason = 'First-Person Pronoun';
      fixSuggestion = bullet
        .replace(/\b(I was responsible for|I helped with|I was part of)\s+/gi, '')
        .replace(/\b(I built|I developed|I engineered)\s+/gi, (m) => m.replace(/^I\s+/i, ''))
        .replace(/\b(I |my )\b/gi, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
      fixSuggestion = fixSuggestion.charAt(0).toUpperCase() + fixSuggestion.slice(1);
    }
  }

  if (fixSuggestion && fixSuggestion !== bullet) {
    return {
      issue: matchingIssue || { id: `auto-${expIdx}-${bIdx}`, title: reason },
      reason: reason || 'Impact Verb & Brevity Improvement',
      fixingLine: fixSuggestion,
    };
  }
  return null;
}

export function getSummaryIssueAndFix(summary) {
  if (!summary || typeof summary !== 'string') return null;
  if (/\b(I am an?|I'm an?|I've been an?|I have|I am|I|my|myself)\b/i.test(summary)) {
    const fixed = summary
      .replace(/\b(I am an?|I'm an?|I've been an?)\s+/gi, '')
      .replace(/\b(I am|I'm|I have|I)\s+/gi, '')
      .replace(/\b(my)\s+/gi, 'the ')
      .replace(/\s{2,}/g, ' ')
      .trim();
    const capitalized = fixed.charAt(0).toUpperCase() + fixed.slice(1);
    if (capitalized !== summary) {
      return {
        reason: 'First-Person Pronouns Diminish Professional Tone',
        fixingLine: capitalized,
      };
    }
  }
  return null;
}

const SAMPLE_RESUMES = {
  swe: {
    name: 'Nikhil Singh',
    title: 'Senior Full Stack Engineer',
    email: 'nikhil900285@gmail.com',
    phone: '+1 (512) 555-0199',
    location: 'Austin, TX (Remote)',
    summary: 'Senior Full Stack Engineer with 5+ years of experience engineering high-throughput microservices and responsive web platforms. Proven track record reducing API latency by 40% and scaling systems to 100,000+ daily active users.',
    contact: {
      email: 'nikhil900285@gmail.com',
      phone: '+1 (512) 555-0199',
      location: 'Austin, TX (Remote)',
      linkedin: 'https://linkedin.com/in/nikhilsingh',
      github: 'https://github.com/nikhil6393',
      portfolio: 'https://nikhilportfolio.dev',
    },
    skills: {
      languages: ['TypeScript', 'JavaScript', 'Python', 'Go', 'SQL'],
      frameworks: ['React', 'Next.js', 'Node.js', 'Express', 'Tailwind CSS'],
      databases: ['PostgreSQL', 'Redis', 'MongoDB', 'SQLite'],
      cloud: ['AWS (ECS, S3, RDS)', 'Docker', 'Kubernetes', 'Cloudflare'],
      tools: ['Git', 'GitHub Actions', 'Vite', 'Vitest', 'Playwright'],
      soft: ['System Design', 'Agile Leadership', 'Cross-Functional Mentorship'],
    },
    experience: [
      {
        company: 'ApplyPilot Technologies',
        role: 'Lead Full Stack Engineer',
        title: 'Lead Full Stack Engineer',
        location: 'Remote',
        dates: '2022 - Present',
        bullets: [
          'Architected an automated multi-tenant job telemetry platform processing 50,000+ daily listings with 99.98% uptime.',
          'Engineered an intelligent offline ATS resume scoring engine evaluating 16 compliance metrics in under 15ms.',
          'Optimized PostgreSQL query indexing and Redis caching, cutting average API latency from 240ms to 42ms.',
          'Mentored a squad of 4 junior developers and established automated CI/CD pipelines using GitHub Actions.',
        ],
      },
      {
        company: 'CloudScale Solutions',
        role: 'Full Stack Software Engineer',
        title: 'Full Stack Software Engineer',
        location: 'San Francisco, CA',
        dates: '2020 - 2022',
        bullets: [
          'Built customer-facing React analytics dashboards displaying real-time WebSocket telemetry for 25,000 users.',
          'Migrated legacy monolithic endpoints to Node.js microservices deployed on AWS ECS with Docker containers.',
          'Refactored authentication workflows with PBKDF2/scrypt cryptographic verification, eliminating session security flaws.',
        ],
      },
    ],
    education: [
      {
        school: 'University of Texas at Austin',
        degree: 'Bachelor of Science',
        field: 'Computer Science',
        graduationDate: '2020',
        gpa: '3.8',
      },
    ],
    projects: [
      {
        name: 'Distributed Scraper Engine',
        tech: ['Node.js', 'Playwright', 'Redis', 'Docker'],
        link: 'https://github.com/nikhil6393/scraper-engine',
        description: 'High-concurrency headless browser automation tool capable of indexing 500+ job portals concurrently.',
        bullets: [
          'Engineered stealth automation algorithms bypassing anti-bot challenge scripts with 94% success rate.',
          'Implemented Redis queue workers handling dynamic rate limiting and exponential backoff retries.',
        ],
      },
    ],
    certifications: [
      { name: 'AWS Certified Solutions Architect – Associate', issuer: 'Amazon Web Services', date: '2023' },
    ],
  },
};

export const ResumeStep = ({
  resume,
  onUpdateResume,
  onConfirmAndDiscover,
  linkedInProfile,
  onOpenLinkedInModal,
}) => {
  const { addToast } = useAppStore();
  const { user, updateProfile } = useAuth();

  // Studio layout: 'worded' (Resume Worded 3-column workspace) vs 'form' (detailed form fields)
  const [studioLayout, setStudioLayout] = useState('worded');

  // Active view: 'document' (original analyzed paper) vs 'editor' (form fields)
  const [viewMode, setViewMode] = useState('document');
  // Center document mode: 'interactive' (with inline highlights & fixing lines) vs 'clean' (pure printable paper) vs 'form'
  const [centerMode, setCenterMode] = useState('interactive');
  const [activeTemplate, setActiveTemplate] = useState('modern'); // 'modern', 'executive', 'tech'
  const [activeTab, setActiveTab] = useState('contact'); // 'contact', 'summary', 'experience', 'skills', 'projects', 'education'

  // Diagnostics filters
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSeverity, setSelectedSeverity] = useState('all');
  const [focusedBulletKey, setFocusedBulletKey] = useState(null);

  // Upload & Export State
  const [dragActive, setDragActive] = useState(false);
  const [uploadMode, setUploadMode] = useState('file');
  const [pastedText, setPastedText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parsingProgress, setParsingProgress] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState('latex');
  const [isExporting, setIsExporting] = useState(false);

  // Skill input helper
  const [newSkillCategory, setNewSkillCategory] = useState('languages');
  const [newSkillInput, setNewSkillInput] = useState('');

  // Ref map to scroll directly to inputs
  const fieldRefs = useRef({});

  // Real-time score report computed directly in-memory
  const scoreReport = useMemo(() => {
    return scoreResume(resume || {});
  }, [resume]);

  const { overall, categories, issues } = scoreReport;

  // Filtered issues for the right inspector panel
  const filteredIssues = useMemo(() => {
    return issues.filter((iss) => {
      const matchCat = selectedCategory === 'all' || iss.category === selectedCategory;
      const matchSev = selectedSeverity === 'all' || iss.severity === selectedSeverity;
      return matchCat && matchSev;
    });
  }, [issues, selectedCategory, selectedSeverity]);

  // Counts by category
  const impactIssues = useMemo(() => issues.filter((i) => i.category === 'impact'), [issues]);
  const brevityIssues = useMemo(() => issues.filter((i) => i.category === 'brevity'), [issues]);
  const styleIssues = useMemo(() => issues.filter((i) => i.category === 'style'), [issues]);
  const sectionsIssues = useMemo(() => issues.filter((i) => i.category === 'sections'), [issues]);

  const criticalCount = useMemo(() => issues.filter((i) => i.severity === 'fail').length, [issues]);
  const warningCount = useMemo(() => issues.filter((i) => i.severity === 'warn').length, [issues]);

  // Score status and colors
  const scoreColor = overall >= 80 ? '#10B981' : overall >= 60 ? '#F59E0B' : '#EF4444';
  const scoreStatus = overall >= 80 ? 'ATS Ready' : overall >= 60 ? 'Competitive' : 'Needs Work';

  // SVG Gauge calculations
  const strokeCircumference = 2 * Math.PI * 38;
  const strokeDashoffset = strokeCircumference - (overall / 100) * strokeCircumference;

  // 1-Click Fix Handler
  const handleApply1ClickFix = (issue) => {
    const updated = applyFixToResume(resume, issue);
    onUpdateResume(updated);
    addToast({
      title: 'Fix Applied',
      message: `Resolved issue: ${issue.title}`,
      type: 'success',
    });
  };

  // Save to Profile & Cloud
  const handleSaveToProfile = async () => {
    if (!resume) return;
    setIsSaving(true);
    try {
      const token = localStorage.getItem('applypilot_token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/resume', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ resume }),
      });
      if (res.ok) {
        if (user) {
          updateProfile({ savedResume: resume, roleTitle: resume.title || resume.roleTitle });
        }
        confetti({ particleCount: 40, spread: 45, origin: { y: 0.5 } });
        addToast({
          title: 'Resume Synchronized',
          message: 'Saved to cloud profile and active job matching telemetry.',
          type: 'success',
        });
      }
    } catch (err) {
      addToast({
        title: 'Save Note',
        message: 'Saved to local cache.',
        type: 'info',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Upload parser with clean Base64 conversion
  const processFileUpload = async (file) => {
    if (!file) return;
    setIsParsing(true);
    setParsingProgress('Reading document file stream...');
    try {
      const fileName = file.name || 'resume.pdf';
      const mimeType = file.type || '';
      let payload = {};

      if (fileName.endsWith('.txt') || fileName.endsWith('.tex') || mimeType === 'text/plain') {
        const text = await file.text();
        payload = { text, fileName, mimeType };
      } else {
        // Read binary file (PDF / DOCX) as base64
        setParsingProgress('Converting binary stream for extraction...');
        const base64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result;
            const clean = typeof result === 'string' ? result.replace(/^data:[^;]+;base64,/, '') : '';
            resolve(clean);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        payload = { fileData: base64, fileName, mimeType };
      }

      setParsingProgress('AI extracting work history, skills & achievements...');
      const token = localStorage.getItem('applypilot_token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/resume/parse', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to extract resume contents');
      }

      const parsed = data.resume || data.data;
      if (parsed) {
        onUpdateResume(parsed);
        if (user) {
          updateProfile({ savedResume: parsed, name: parsed.name !== 'Candidate' ? parsed.name : user.name });
        }
        confetti({ particleCount: 75, spread: 60, origin: { y: 0.55 } });
        addToast({
          title: 'Resume Calibrated & Extracted!',
          message: `Identified ${parsed.name || 'Candidate'} with ${(parsed.experience || []).length} experience roles and ${(parsed.allSkills || parsed.skills || []).length} skills`,
          type: 'success',
        });
      }
    } catch (err) {
      console.error('Resume upload error:', err);
      addToast({
        title: 'Extraction Error',
        message: err.message || 'Could not parse resume. Try pasting the resume text directly.',
        type: 'error',
      });
    } finally {
      setIsParsing(false);
      setParsingProgress('');
    }
  };

  // AI Bullet Writer
  const handleAIBulletEnhance = async (expIdx, bIdx) => {
    const currentBullet = resume?.experience?.[expIdx]?.bullets?.[bIdx];
    if (!currentBullet) return;

    try {
      const res = await fetch('/api/resume/magic-write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume, bullet: currentBullet }),
      });
      const data = await res.json();
      if (data.suggestions?.[0]?.text) {
        const next = JSON.parse(JSON.stringify(resume));
        next.experience[expIdx].bullets[bIdx] = data.suggestions[0].text;
        onUpdateResume(next);
        addToast({
          title: 'Action Verb & Metric Enhanced',
          message: 'Updated bullet point with high-impact phrasing.',
          type: 'success',
        });
      }
    } catch {
      // Deterministic fallback
      const words = currentBullet.split(' ');
      const improved = `Engineered ${words.slice(1).join(' ')} boosting performance by 25%.`;
      const next = JSON.parse(JSON.stringify(resume));
      next.experience[expIdx].bullets[bIdx] = improved;
      onUpdateResume(next);
    }
  };

  // Export handlers
  const handleExportDownload = () => {
    setIsExporting(true);
    try {
      if (exportFormat === 'latex') {
        const content = generateJakeLatex(resume);
        const blob = new Blob([content], { type: 'application/x-tex' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${(resume?.name || 'Resume').replace(/\s+/g, '_')}_ATS_Jake.tex`;
        a.click();
      } else if (exportFormat === 'docx') {
        const content = generateWordDocument(resume);
        const blob = new Blob(['\ufeff', content], { type: 'application/msword;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${(resume?.name || 'Resume').replace(/\s+/g, '_')}_Calibrated.doc`;
        a.click();
      } else if (exportFormat === 'json') {
        const content = JSON.stringify(resume, null, 2);
        const blob = new Blob([content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${(resume?.name || 'Resume').replace(/\s+/g, '_')}_JSONResume.json`;
        a.click();
      } else {
        const content = generateHtmlResume(resume);
        const blob = new Blob([content], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${(resume?.name || 'Resume').replace(/\s+/g, '_')}_ATS.html`;
        a.click();
      }
      addToast({
        title: 'Export Complete',
        message: `Downloaded resume in ${exportFormat.toUpperCase()} format`,
        type: 'success',
      });
      setIsExportModalOpen(false);
    } finally {
      setIsExporting(false);
    }
  };

  // Direct Word (.doc) download maintaining exact formatting
  const handleDownloadWord = () => {
    const content = generateWordDocument(resume);
    const blob = new Blob(['\ufeff', content], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(resume?.name || 'Resume').replace(/\s+/g, '_')}_Calibrated.doc`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    addToast({
      title: 'Word Document Downloaded',
      message: 'Downloaded formatted Word resume (.doc) preserving original typography and sections.',
      type: 'success',
    });
  };

  // Direct PDF download / print without changing uploaded format
  const handleDownloadPdf = () => {
    const prevMode = centerMode;
    setCenterMode('clean');
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        setCenterMode(prevMode);
      }, 500);
    }, 250);
    addToast({
      title: 'PDF Print Dialog Opened',
      message: 'Select "Save as PDF" to save your clean ATS-compliant resume without altering format.',
      type: 'info',
    });
  };

  // Inline Bullet Fix Handler (Updates resume, raises ATS score in real time)
  const handleApplyBulletFix = (expIdx, bIdx, fixingLine) => {
    const next = JSON.parse(JSON.stringify(resume));
    if (next.experience?.[expIdx]?.bullets?.[bIdx]) {
      next.experience[expIdx].bullets[bIdx] = fixingLine;
      onUpdateResume(next);
      confetti({ particleCount: 35, spread: 50, origin: { y: 0.6 } });
      addToast({
        title: 'Bullet Fix Applied!',
        message: 'Replaced weak opener with impact verb. Real-time ATS score increased.',
        type: 'success',
      });
    }
  };

  // Inline Summary Fix Handler
  const handleApplySummaryFix = (fixingLine) => {
    const next = JSON.parse(JSON.stringify(resume));
    next.summary = fixingLine;
    onUpdateResume(next);
    confetti({ particleCount: 35, spread: 50, origin: { y: 0.6 } });
    addToast({
      title: 'Summary Fix Applied!',
      message: 'Refined summary to standard ATS third-person professional tone.',
      type: 'success',
    });
  };

  // Native Print to PDF
  const handlePrintPdf = () => {
    handleDownloadPdf();
  };

  // Helper updates
  const handleUpdateName = (val) => {
    onUpdateResume({ ...resume, name: val, fullName: val });
  };
  const handleUpdateTitle = (val) => {
    onUpdateResume({ ...resume, title: val, roleTitle: val });
  };
  const handleUpdateSummary = (val) => {
    onUpdateResume({ ...resume, summary: val });
  };
  const handleUpdateContact = (field, val) => {
    const next = JSON.parse(JSON.stringify(resume || {}));
    if (!next.contact) next.contact = {};
    next.contact[field] = val;
    if (field === 'email') next.email = val;
    if (field === 'phone') next.phone = val;
    if (field === 'location') next.location = val;
    onUpdateResume(next);
  };

  // Skills helpers
  const getSkillsObject = () => {
    if (resume?.skills && typeof resume.skills === 'object' && !Array.isArray(resume.skills)) {
      return resume.skills;
    }
    if (Array.isArray(resume?.skills)) {
      return {
        languages: resume.skills.slice(0, 5),
        frameworks: resume.skills.slice(5, 10),
        tools: resume.skills.slice(10, 15),
        databases: resume.skills.slice(15, 20),
        cloud: resume.skills.slice(20, 25),
        soft: resume.skills.slice(25, 30),
      };
    }
    return { languages: [], frameworks: [], tools: [], databases: [], cloud: [], soft: [] };
  };

  const handleAddSkillTag = (category) => {
    if (!newSkillInput.trim()) return;
    const next = JSON.parse(JSON.stringify(resume || {}));
    const currentObj = getSkillsObject();
    const updatedCategory = Array.from(new Set([...(currentObj[category] || []), newSkillInput.trim()]));
    const updatedSkillsObj = { ...currentObj, [category]: updatedCategory };
    const allSkillsList = Object.values(updatedSkillsObj).flat();
    next.skills = updatedSkillsObj;
    next.allSkills = allSkillsList;
    onUpdateResume(next);
    setNewSkillInput('');
  };

  const handleRemoveSkillTag = (category, skillToRemove) => {
    const next = JSON.parse(JSON.stringify(resume || {}));
    const currentObj = getSkillsObject();
    const updatedCategory = (currentObj[category] || []).filter((s) => s !== skillToRemove);
    const updatedSkillsObj = { ...currentObj, [category]: updatedCategory };
    const allSkillsList = Object.values(updatedSkillsObj).flat();
    next.skills = updatedSkillsObj;
    next.allSkills = allSkillsList;
    onUpdateResume(next);
  };

  // ── EXACT RESUME STUDIO (Screenshots 1 & 2 Workflow) ──
  if (studioLayout === 'worded') {
    return (
      <div className="w-full">
        <ExactResumeStudio
          resume={resume}
          onUpdateResume={onUpdateResume}
        />
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* ── TOP HEADER / TOOLBAR ── */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              <span>Resume Studio (Form Inputs)</span>
            </h1>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-600" />
              <span>Form Fields View</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Manual field editor. Edit specific fields directly or return to the interactive Resume Studio.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-end md:self-auto">
          {/* Back to Resume Studio */}
          <button
            id="resume-back-to-worded-btn"
            onClick={() => setStudioLayout('worded')}
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold border border-indigo-300 bg-indigo-600 hover:bg-indigo-700 text-white transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            title="Switch back to interactive 3-column studio"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Resume Studio</span>
          </button>

          {/* Quick Download PDF & Word Buttons */}
          <button
            id="resume-top-pdf-btn"
            onClick={handleDownloadPdf}
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Download pristine ATS PDF"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            <span>Download PDF</span>
          </button>

          <button
            id="resume-top-word-btn"
            onClick={handleDownloadWord}
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Download formatted Word document (.doc) preserving all format"
          >
            <Download className="w-3.5 h-3.5 text-indigo-600" />
            <span>Download Word</span>
          </button>

          {/* Save to Profile */}
          <button
            id="resume-save-sync-btn"
            onClick={handleSaveToProfile}
            disabled={isSaving}
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Save changes and sync to candidate profile"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Syncing...' : 'Save & Sync'}</span>
          </button>

          {/* Export modal button */}
          <button
            id="resume-export-btn"
            onClick={() => setIsExportModalOpen(true)}
            className="px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
          >
            <span>More Formats</span>
          </button>

          {/* Next Step / Discovery Feed */}
          <button
            onClick={onConfirmAndDiscover}
            className="px-4 py-1.5 rounded-xl text-xs font-bold bg-[#111827] hover:bg-black text-white transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <span>Job Feed</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── 3-COLUMN RESUME STUDIO LAYOUT ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* ── LEFT COLUMN (3 cols): ATS SCORE & TELEMETRY GAUGES ── */}
        <div className="lg:col-span-3 space-y-4">
          {/* Main Score Gauge Card */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-800">Overall ATS Score</span>
              <span
                className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: overall >= 80 ? '#ECFDF5' : overall >= 60 ? '#FFFBEB' : '#FEF2F2',
                  color: scoreColor,
                }}
              >
                {scoreStatus}
              </span>
            </div>

            {/* Circular Gauge */}
            <div className="flex flex-col items-center justify-center py-3">
              <div className="relative w-28 h-28 flex items-center justify-center">
                <svg width="112" height="112" viewBox="0 0 96 96" className="rotate-[-90deg]">
                  <circle cx="48" cy="48" r="38" fill="none" stroke="#F1F5F9" strokeWidth="8" />
                  <motion.circle
                    cx="48"
                    cy="48"
                    r="38"
                    fill="none"
                    stroke={scoreColor}
                    strokeWidth="8"
                    strokeDasharray={`${strokeCircumference}`}
                    initial={{ strokeDashoffset: strokeCircumference }}
                    animate={{ strokeDashoffset }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-3xl font-black text-slate-900 tracking-tight">{overall}</span>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">/ 100</span>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs mt-2 text-slate-600">
                <span className="flex items-center gap-1 font-semibold text-rose-600">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{criticalCount} Critical</span>
                </span>
                <span className="text-slate-300">•</span>
                <span className="flex items-center gap-1 font-semibold text-amber-600">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{warningCount} Warnings</span>
                </span>
              </div>
            </div>

            {/* 4 Category Breakdown Bars */}
            <div className="space-y-3 pt-3 border-t border-slate-100 text-xs">
              {/* Impact */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold text-slate-700">Impact (35%)</span>
                  <b className="text-slate-900">{categories.impact}%</b>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-indigo-600"
                    initial={{ width: 0 }}
                    animate={{ width: `${categories.impact}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                  <span>Action verbs &amp; metrics</span>
                  <span>{impactIssues.length} issues</span>
                </div>
              </div>

              {/* Brevity */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold text-slate-700">Brevity (25%)</span>
                  <b className="text-slate-900">{categories.brevity}%</b>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-blue-600"
                    initial={{ width: 0 }}
                    animate={{ width: `${categories.brevity}%` }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                  <span>Length &amp; filler words</span>
                  <span>{brevityIssues.length} issues</span>
                </div>
              </div>

              {/* Style */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold text-slate-700">Style (20%)</span>
                  <b className="text-slate-900">{categories.style}%</b>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-emerald-600"
                    initial={{ width: 0 }}
                    animate={{ width: `${categories.style}%` }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                  <span>Buzzwords &amp; pronouns</span>
                  <span>{styleIssues.length} issues</span>
                </div>
              </div>

              {/* Sections */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold text-slate-700">Sections (20%)</span>
                  <b className="text-slate-900">{categories.sections}%</b>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-purple-600"
                    initial={{ width: 0 }}
                    animate={{ width: `${categories.sections}%` }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                  <span>Contact &amp; headings</span>
                  <span>{sectionsIssues.length} issues</span>
                </div>
              </div>
            </div>
          </div>

          {/* Upload Drop Zone Card */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              if (e.dataTransfer.files?.[0]) processFileUpload(e.dataTransfer.files[0]);
            }}
            className={`border-2 border-dashed rounded-2xl p-4 text-center transition-all ${
              dragActive ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 hover:border-slate-400 bg-white shadow-xs'
            }`}
          >
            {isParsing ? (
              <div className="py-4 space-y-2">
                <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
                <h4 className="text-xs font-bold text-slate-900">Calibrating Resume...</h4>
                <p className="text-[11px] text-indigo-600 font-medium animate-pulse">{parsingProgress || 'Extracting structured data...'}</p>
              </div>
            ) : (
              <>
                <UploadCloud className="w-7 h-7 text-indigo-600 mx-auto mb-1.5" />
                <h4 className="text-xs font-bold text-slate-800">Upload or Replace Resume</h4>
                <p className="text-[10px] text-slate-500 mt-0.5">Supports PDF, DOCX, TXT, LaTeX</p>
                <div className="mt-2.5 flex justify-center gap-1.5 flex-wrap">
                  <label className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-semibold cursor-pointer shadow-2xs transition-colors">
                    <span>Browse File</span>
                    <input
                      type="file"
                      accept=".pdf,.docx,.doc,.txt,.tex"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.[0]) processFileUpload(e.target.files[0]);
                      }}
                    />
                  </label>
                  <button
                    onClick={() => setUploadMode(uploadMode === 'text' ? 'file' : 'text')}
                    className="px-2.5 py-1.5 rounded-xl border border-slate-300 text-slate-700 text-[11px] font-semibold hover:bg-slate-50 cursor-pointer"
                  >
                    {uploadMode === 'text' ? 'File Mode' : 'Paste Text'}
                  </button>
                  <button
                    onClick={() => {
                      onUpdateResume(SAMPLE_RESUMES.swe);
                      confetti({ particleCount: 50, spread: 50, origin: { y: 0.6 } });
                      addToast({
                        title: 'Sample Resume Loaded',
                        message: 'Loaded Senior Full Stack Engineer profile with 90+ ATS readiness.',
                        type: 'success',
                      });
                    }}
                    className="px-2.5 py-1.5 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 text-[11px] font-semibold hover:bg-emerald-100 cursor-pointer"
                    title="Load pre-calibrated sample resume"
                  >
                    Load Sample
                  </button>
                </div>

                {uploadMode === 'text' && (
                  <div className="mt-2.5 text-left">
                    <textarea
                      rows={3}
                      value={pastedText}
                      onChange={(e) => setPastedText(e.target.value)}
                      placeholder="Paste raw resume or LaTeX text here..."
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 outline-none focus:border-indigo-600 font-mono text-[11px]"
                    />
                    <button
                      onClick={() => {
                        if (pastedText.trim()) {
                          processFileUpload(new File([pastedText], 'pasted.txt', { type: 'text/plain' }));
                        }
                      }}
                      className="mt-1 px-3 py-1 bg-slate-900 text-white text-[11px] font-semibold rounded-lg cursor-pointer hover:bg-black"
                    >
                      Extract Pasted Text
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── MIDDLE COLUMN (6 cols): LIVE INTERACTIVE EDITOR / DOCUMENT CANVAS ── */}
        <div className="lg:col-span-6 space-y-4">
          {centerMode === 'form' ? (
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-5">
              {/* Section Segmented Navigation */}
              <div className="flex items-center gap-1 pb-3 border-b border-slate-100 overflow-x-auto">
                {[
                  { id: 'contact', label: 'Contact', icon: Mail },
                  { id: 'summary', label: 'Summary', icon: FileText },
                  { id: 'experience', label: `Experience (${resume?.experience?.length || 0})`, icon: Briefcase },
                  { id: 'skills', label: 'Skills', icon: Code2 },
                  { id: 'projects', label: `Projects (${resume?.projects?.length || 0})`, icon: FolderGit2 },
                  { id: 'education', label: 'Education', icon: GraduationCap },
                ].map((sec) => {
                  const Icon = sec.icon;
                  const isCurrent = activeTab === sec.id;
                  return (
                    <button
                      key={sec.id}
                      onClick={() => setActiveTab(sec.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                        isCurrent
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{sec.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* 1. CONTACT & HEADLINE TAB */}
              {activeTab === 'contact' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Full Name</label>
                      <input
                        ref={(el) => { fieldRefs.current['name'] = el; }}
                        type="text"
                        value={resume?.name || ''}
                        onChange={(e) => handleUpdateName(e.target.value)}
                        placeholder="e.g. Nikhil Singh"
                        className="w-full p-2 text-xs border border-slate-300 rounded-xl outline-none focus:border-indigo-600 font-bold text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Professional Headline / Role Title</label>
                      <input
                        type="text"
                        value={resume?.title || resume?.roleTitle || ''}
                        onChange={(e) => handleUpdateTitle(e.target.value)}
                        placeholder="e.g. Senior Full Stack Engineer"
                        className="w-full p-2 text-xs border border-slate-300 rounded-xl outline-none focus:border-indigo-600 font-semibold text-slate-800"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="text-[10px] font-semibold text-slate-600 flex items-center gap-1 mb-1">
                        <Mail className="w-3 h-3 text-slate-400" />
                        <span>Email Address</span>
                      </label>
                      <input
                        ref={(el) => { fieldRefs.current['contact-email'] = el; }}
                        type="email"
                        value={resume?.contact?.email || resume?.email || ''}
                        onChange={(e) => handleUpdateContact('email', e.target.value)}
                        placeholder="candidate@example.com"
                        className="w-full p-2 text-xs border border-slate-300 rounded-xl outline-none focus:border-indigo-600"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-600 flex items-center gap-1 mb-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>Phone Number</span>
                      </label>
                      <input
                        ref={(el) => { fieldRefs.current['contact-phone'] = el; }}
                        type="text"
                        value={resume?.contact?.phone || resume?.phone || ''}
                        onChange={(e) => handleUpdateContact('phone', e.target.value)}
                        placeholder="+1 (555) 0199"
                        className="w-full p-2 text-xs border border-slate-300 rounded-xl outline-none focus:border-indigo-600"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-600 flex items-center gap-1 mb-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span>Location / Remote Preference</span>
                      </label>
                      <input
                        ref={(el) => { fieldRefs.current['contact-location'] = el; }}
                        type="text"
                        value={resume?.contact?.location || resume?.location || ''}
                        onChange={(e) => handleUpdateContact('location', e.target.value)}
                        placeholder="Austin, TX or Remote"
                        className="w-full p-2 text-xs border border-slate-300 rounded-xl outline-none focus:border-indigo-600"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-600 flex items-center gap-1 mb-1">
                        <Linkedin className="w-3 h-3 text-blue-500" />
                        <span>LinkedIn Profile URL</span>
                      </label>
                      <input
                        ref={(el) => { fieldRefs.current['contact-linkedin'] = el; }}
                        type="text"
                        value={resume?.contact?.linkedin || ''}
                        onChange={(e) => handleUpdateContact('linkedin', e.target.value)}
                        placeholder="https://linkedin.com/in/username"
                        className="w-full p-2 text-xs border border-slate-300 rounded-xl outline-none focus:border-indigo-600"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-600 flex items-center gap-1 mb-1">
                        <Github className="w-3 h-3 text-slate-700" />
                        <span>GitHub Profile URL</span>
                      </label>
                      <input
                        type="text"
                        value={resume?.contact?.github || ''}
                        onChange={(e) => handleUpdateContact('github', e.target.value)}
                        placeholder="https://github.com/username"
                        className="w-full p-2 text-xs border border-slate-300 rounded-xl outline-none focus:border-indigo-600"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-600 flex items-center gap-1 mb-1">
                        <Globe className="w-3 h-3 text-indigo-500" />
                        <span>Portfolio / Personal Website</span>
                      </label>
                      <input
                        type="text"
                        value={resume?.contact?.portfolio || ''}
                        onChange={(e) => handleUpdateContact('portfolio', e.target.value)}
                        placeholder="https://yourportfolio.dev"
                        className="w-full p-2 text-xs border border-slate-300 rounded-xl outline-none focus:border-indigo-600"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 2. SUMMARY TAB */}
              {activeTab === 'summary' && (
                <div className="space-y-3 animate-in fade-in duration-150">
                  <div className="flex justify-between items-center">
                    <label className="text-[11px] font-bold text-slate-700">Professional Summary</label>
                    <span className="text-[10px] text-slate-400">
                      {resume?.summary ? `${resume.summary.split(/\s+/).filter(Boolean).length} words (Recommended: 40–80)` : 'Optional'}
                    </span>
                  </div>
                  <textarea
                    ref={(el) => { fieldRefs.current['summary'] = el; }}
                    rows={4}
                    value={resume?.summary || ''}
                    onChange={(e) => handleUpdateSummary(e.target.value)}
                    placeholder="Senior engineer with 5+ years of experience building distributed systems and high-throughput applications..."
                    className="w-full p-3 text-xs border border-slate-300 rounded-xl outline-none focus:border-indigo-600 leading-relaxed text-slate-800"
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={() => {
                        const next = JSON.parse(JSON.stringify(resume || {}));
                        if (!next.summary || next.summary.length < 20) {
                          next.summary = `Experienced ${resume?.title || 'Software Engineer'} specializing in scalable microservices, full-stack web platforms, and automated cloud deployments. Proven expertise delivering reliable production systems and driving measurable latency reductions.`;
                        } else {
                          // Clean first-person pronouns & buzzwords
                          next.summary = next.summary
                            .replace(/\b(I am|I have|I'm|my)\b/gi, '')
                            .replace(/\b(rockstar|ninja|guru|passionate|hardworking)\b/gi, '')
                            .replace(/\s{2,}/g, ' ')
                            .trim();
                        }
                        onUpdateResume(next);
                        addToast({ title: 'Summary Polished', message: 'Optimized tone and removed weak qualifiers.', type: 'success' });
                      }}
                      className="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-semibold hover:bg-indigo-100 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      <span>AI Polish Summary</span>
                    </button>
                  </div>
                </div>
              )}

              {/* 3. WORK EXPERIENCE TAB */}
              {activeTab === 'experience' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">Career History &amp; Roles</h3>
                    <button
                      onClick={() => {
                        const next = JSON.parse(JSON.stringify(resume || {}));
                        if (!next.experience) next.experience = [];
                        next.experience.unshift({
                          role: 'Software Engineer',
                          title: 'Software Engineer',
                          company: 'Company Name',
                          location: 'Remote',
                          dates: '2023 - Present',
                          bullets: [
                            'Engineered core application features serving 10,000 active users.',
                            'Optimized database queries, reducing query response times by 35%.',
                          ],
                        });
                        onUpdateResume(next);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Experience Role</span>
                    </button>
                  </div>

                  {(resume?.experience || []).map((exp, expIdx) => (
                    <div key={expIdx} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1 text-xs">
                          <div>
                            <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Role / Job Title</label>
                            <input
                              type="text"
                              value={exp.role || exp.title || ''}
                              onChange={(e) => {
                                const next = JSON.parse(JSON.stringify(resume));
                                next.experience[expIdx].role = e.target.value;
                                next.experience[expIdx].title = e.target.value;
                                onUpdateResume(next);
                              }}
                              className="w-full p-2 text-xs bg-white border border-slate-300 rounded-lg font-bold text-slate-900"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Company Name</label>
                            <input
                              type="text"
                              value={exp.company || ''}
                              onChange={(e) => {
                                const next = JSON.parse(JSON.stringify(resume));
                                next.experience[expIdx].company = e.target.value;
                                onUpdateResume(next);
                              }}
                              className="w-full p-2 text-xs bg-white border border-slate-300 rounded-lg font-semibold text-slate-800"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Dates (e.g. 2022 - Present)</label>
                            <input
                              type="text"
                              value={exp.dates || ''}
                              onChange={(e) => {
                                const next = JSON.parse(JSON.stringify(resume));
                                next.experience[expIdx].dates = e.target.value;
                                onUpdateResume(next);
                              }}
                              placeholder="2022 - Present"
                              className="w-full p-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-700"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Location</label>
                            <input
                              type="text"
                              value={exp.location || ''}
                              onChange={(e) => {
                                const next = JSON.parse(JSON.stringify(resume));
                                next.experience[expIdx].location = e.target.value;
                                onUpdateResume(next);
                              }}
                              placeholder="Remote / City, State"
                              className="w-full p-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-700"
                            />
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            const next = JSON.parse(JSON.stringify(resume));
                            next.experience.splice(expIdx, 1);
                            onUpdateResume(next);
                          }}
                          className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer transition-colors"
                          title="Delete Role"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Bullets List */}
                      <div className="space-y-2 pt-2 border-t border-slate-200">
                        <div className="flex justify-between items-center text-[10px] text-slate-500 font-semibold">
                          <span>Achievement Bullets ({exp.bullets?.length || 0})</span>
                          <span className={exp.bullets?.length >= 3 && exp.bullets?.length <= 6 ? 'text-emerald-600 font-bold' : 'text-amber-600 font-bold'}>
                            Target: 3–6 quantified bullets
                          </span>
                        </div>

                        {(exp.bullets || []).map((bullet, bIdx) => {
                          const wordCount = bullet.trim().split(/\s+/).filter(Boolean).length;
                          const hasMetric = /\d+%|\d+x|\$\d+|\d+\s?(ms|seconds?|hours?|days?|users?|requests?)/i.test(bullet);
                          const isFocused = focusedBulletKey === `bullet-${expIdx}-${bIdx}`;

                          const bulletIssues = issues.filter(
                            (iss) => iss.evidence?.experienceIndex === expIdx && iss.evidence?.bulletIndex === bIdx
                          );

                          return (
                            <div
                              key={bIdx}
                              className={`p-2.5 rounded-xl border transition-all ${
                                isFocused
                                  ? 'bg-indigo-50/80 border-indigo-500 shadow-sm ring-2 ring-indigo-200'
                                  : bulletIssues.length > 0
                                  ? 'bg-white border-amber-300'
                                  : 'bg-white border-slate-200'
                              }`}
                            >
                              <div className="flex items-start gap-2">
                                <span className="text-slate-400 font-mono text-[10px] mt-1 select-none">•</span>
                                <textarea
                                  ref={(el) => { fieldRefs.current[`bullet-${expIdx}-${bIdx}`] = el; }}
                                  rows={2}
                                  value={bullet}
                                  onChange={(e) => {
                                    const next = JSON.parse(JSON.stringify(resume));
                                    next.experience[expIdx].bullets[bIdx] = e.target.value;
                                    onUpdateResume(next);
                                  }}
                                  className="w-full text-xs text-slate-800 outline-none leading-relaxed resize-y bg-transparent"
                                />
                                <button
                                  onClick={() => {
                                    const next = JSON.parse(JSON.stringify(resume));
                                    next.experience[expIdx].bullets.splice(bIdx, 1);
                                    onUpdateResume(next);
                                  }}
                                  className="text-slate-300 hover:text-rose-500 p-0.5 cursor-pointer flex-shrink-0"
                                  title="Remove bullet"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              <div className="flex items-center justify-between gap-2 mt-1.5 pt-1.5 border-t border-slate-100 text-[10px]">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span
                                    className={`px-1.5 py-0.5 rounded font-mono font-medium ${
                                      wordCount >= 8 && wordCount <= 30
                                        ? 'bg-emerald-50 text-emerald-700'
                                        : 'bg-amber-50 text-amber-700 font-bold'
                                    }`}
                                  >
                                    {wordCount} words
                                  </span>

                                  <span
                                    className={`px-1.5 py-0.5 rounded font-medium flex items-center gap-0.5 ${
                                      hasMetric ? 'bg-emerald-50 text-emerald-700 font-bold' : 'bg-slate-100 text-slate-500'
                                    }`}
                                  >
                                    {hasMetric ? '✓ Metric' : 'No metric'}
                                  </span>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleAIBulletEnhance(expIdx, bIdx)}
                                  className="px-2 py-0.5 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                                  title="Enhance with high-impact action verbs and metric suggestions"
                                >
                                  <Sparkles className="w-3 h-3 text-indigo-600" />
                                  <span>AI Enhance</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}

                        <button
                          onClick={() => {
                            const next = JSON.parse(JSON.stringify(resume));
                            if (!next.experience[expIdx].bullets) next.experience[expIdx].bullets = [];
                            next.experience[expIdx].bullets.push('Delivered clean test-driven features in 2-week agile sprints.');
                            onUpdateResume(next);
                          }}
                          className="w-full py-1.5 rounded-xl border border-dashed border-slate-300 hover:border-indigo-400 text-slate-600 hover:text-indigo-600 text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add Bullet Point</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 4. SKILLS TAB */}
              {activeTab === 'skills' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">Technical &amp; Domain Skills</h3>
                    <span className="text-[10px] text-slate-500">
                      Total: {(resume?.allSkills || resume?.skills || []).length} keywords
                    </span>
                  </div>

                  {/* Skill Group Categories */}
                  {Object.entries(getSkillsObject()).map(([cat, items]) => (
                    <div key={cat} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">{cat}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{(items || []).length}</span>
                      </div>

                      {/* Tag Chips */}
                      <div className="flex flex-wrap gap-1.5">
                        {(items || []).map((skill) => (
                          <span
                            key={skill}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white border border-slate-300 text-slate-800 shadow-2xs group"
                          >
                            <span>{skill}</span>
                            <button
                              onClick={() => handleRemoveSkillTag(cat, skill)}
                              className="text-slate-400 hover:text-rose-600 cursor-pointer ml-0.5"
                            >
                              &times;
                            </button>
                          </span>
                        ))}
                      </div>

                      {/* Add new tag to this category */}
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="text"
                          placeholder={`Add ${cat} skill (e.g. Next.js, Redis)...`}
                          value={newSkillCategory === cat ? newSkillInput : ''}
                          onFocus={() => setNewSkillCategory(cat)}
                          onChange={(e) => {
                            setNewSkillCategory(cat);
                            setNewSkillInput(e.target.value);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ',') {
                              e.preventDefault();
                              handleAddSkillTag(cat);
                            }
                          }}
                          className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl outline-none focus:border-indigo-600"
                        />
                        <button
                          onClick={() => handleAddSkillTag(cat)}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-black text-white text-xs font-semibold rounded-xl cursor-pointer"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 5. PROJECTS TAB */}
              {activeTab === 'projects' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">Featured Projects</h3>
                    <button
                      onClick={() => {
                        const next = JSON.parse(JSON.stringify(resume || {}));
                        if (!next.projects) next.projects = [];
                        next.projects.push({
                          name: 'New Project',
                          tech: ['React', 'Node.js', 'PostgreSQL'],
                          link: 'https://github.com/username/project',
                          bullets: ['Engineered scalable microservice handling real-time data.'],
                        });
                        onUpdateResume(next);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Project</span>
                    </button>
                  </div>

                  {(resume?.projects || []).map((proj, pIdx) => (
                    <div key={pIdx} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                      <div className="flex justify-between items-start gap-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1 text-xs">
                          <div>
                            <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Project Name</label>
                            <input
                              type="text"
                              value={proj.name || ''}
                              onChange={(e) => {
                                const next = JSON.parse(JSON.stringify(resume));
                                next.projects[pIdx].name = e.target.value;
                                onUpdateResume(next);
                              }}
                              className="w-full p-2 text-xs bg-white border border-slate-300 rounded-lg font-bold text-slate-900"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Project / Repository Link</label>
                            <input
                              type="text"
                              value={proj.link || ''}
                              onChange={(e) => {
                                const next = JSON.parse(JSON.stringify(resume));
                                next.projects[pIdx].link = e.target.value;
                                onUpdateResume(next);
                              }}
                              placeholder="https://github.com/..."
                              className="w-full p-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-700"
                            />
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            const next = JSON.parse(JSON.stringify(resume));
                            next.projects.splice(pIdx, 1);
                            onUpdateResume(next);
                          }}
                          className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Tech stack */}
                      <div>
                        <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Tech Stack (comma-separated)</label>
                        <input
                          type="text"
                          value={Array.isArray(proj.tech) ? proj.tech.join(', ') : ''}
                          onChange={(e) => {
                            const next = JSON.parse(JSON.stringify(resume));
                            next.projects[pIdx].tech = e.target.value.split(',').map((s) => s.trim()).filter(Boolean);
                            onUpdateResume(next);
                          }}
                          placeholder="e.g. React, TypeScript, Redis"
                          className="w-full p-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800"
                        />
                      </div>

                      {/* Description / Bullets */}
                      <div>
                        <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Impact Bullets</label>
                        {(proj.bullets || []).map((b, bi) => (
                          <div key={bi} className="flex items-center gap-1.5 mb-1.5">
                            <span className="text-slate-400 text-xs">•</span>
                            <input
                              type="text"
                              value={b}
                              onChange={(e) => {
                                const next = JSON.parse(JSON.stringify(resume));
                                next.projects[pIdx].bullets[bi] = e.target.value;
                                onUpdateResume(next);
                              }}
                              className="w-full p-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 6. EDUCATION TAB */}
              {activeTab === 'education' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">Education &amp; Credentials</h3>
                    <button
                      onClick={() => {
                        const next = JSON.parse(JSON.stringify(resume || {}));
                        if (!next.education) next.education = [];
                        next.education.push({
                          school: 'University Name',
                          degree: 'Bachelor of Science',
                          field: 'Computer Science',
                          graduationDate: '2024',
                          gpa: '',
                        });
                        onUpdateResume(next);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Degree</span>
                    </button>
                  </div>

                  {(resume?.education || []).map((ed, edIdx) => (
                    <div key={edIdx} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
                      <div className="flex justify-between items-start gap-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1">
                          <div>
                            <label className="text-[10px] font-bold text-slate-600 block mb-0.5">School / University</label>
                            <input
                              type="text"
                              value={ed.school || ed.institution || ''}
                              onChange={(e) => {
                                const next = JSON.parse(JSON.stringify(resume));
                                next.education[edIdx].school = e.target.value;
                                next.education[edIdx].institution = e.target.value;
                                onUpdateResume(next);
                              }}
                              placeholder="e.g. University of Texas at Austin"
                              className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold text-slate-900 text-xs"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Degree &amp; Major</label>
                            <input
                              type="text"
                              value={ed.degree || ''}
                              onChange={(e) => {
                                const next = JSON.parse(JSON.stringify(resume));
                                next.education[edIdx].degree = e.target.value;
                                onUpdateResume(next);
                              }}
                              placeholder="e.g. Bachelor of Science in Computer Science"
                              className="w-full p-2 bg-white border border-slate-300 rounded-lg text-slate-800 text-xs"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Graduation Year</label>
                            <input
                              type="text"
                              value={ed.graduationDate || ed.dates || ''}
                              onChange={(e) => {
                                const next = JSON.parse(JSON.stringify(resume));
                                next.education[edIdx].graduationDate = e.target.value;
                                onUpdateResume(next);
                              }}
                              placeholder="e.g. 2024"
                              className="w-full p-2 bg-white border border-slate-300 rounded-lg text-slate-700 text-xs"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-600 block mb-0.5">GPA / Honors (Optional)</label>
                            <input
                              type="text"
                              value={ed.gpa || ''}
                              onChange={(e) => {
                                const next = JSON.parse(JSON.stringify(resume));
                                next.education[edIdx].gpa = e.target.value;
                                onUpdateResume(next);
                              }}
                              placeholder="e.g. 3.8 / 4.0 or Magna Cum Laude"
                              className="w-full p-2 bg-white border border-slate-300 rounded-lg text-slate-700 text-xs"
                            />
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            const next = JSON.parse(JSON.stringify(resume));
                            next.education.splice(edIdx, 1);
                            onUpdateResume(next);
                          }}
                          className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* ── ORIGINAL ANALYZED RESUME PAPER CANVAS WITH INLINE FIXES ── */
            <div className="space-y-4">
              {/* Top Document Action Bar */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
                        <FileText className="w-4 h-4 text-indigo-600" />
                        <span>Original Analyzed Resume</span>
                      </h2>
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: overall >= 80 ? '#ECFDF5' : overall >= 60 ? '#FFFBEB' : '#FEF2F2',
                          color: scoreColor,
                        }}
                      >
                        ATS {overall}/100 • {scoreStatus}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Live paper document preserving original layout with inline ATS fix recommendations
                    </p>
                  </div>

                  {/* Mode Switcher */}
                  <div className="bg-slate-100 p-0.5 rounded-xl flex items-center text-xs font-semibold self-start sm:self-auto">
                    <button
                      id="resume-center-interactive-btn"
                      onClick={() => setCenterMode('interactive')}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                        centerMode === 'interactive' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                      title="Show inline issue highlights and 1-click fixing lines"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>Fix Highlights</span>
                    </button>
                    <button
                      id="resume-center-clean-btn"
                      onClick={() => setCenterMode('clean')}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                        centerMode === 'clean' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                      title="View clean printable resume without highlight boxes"
                    >
                      <Eye className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Clean View</span>
                    </button>
                    <button
                      id="resume-center-form-btn"
                      onClick={() => setCenterMode('form')}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                        centerMode === 'form' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                      title="Switch to direct form input fields"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Form Inputs</span>
                    </button>
                  </div>
                </div>

                {/* Template selector & Direct Download Buttons */}
                <div className="pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-slate-500">Typography:</span>
                    {[
                      { id: 'modern', label: 'Modern Sans' },
                      { id: 'executive', label: 'Executive Serif' },
                      { id: 'tech', label: 'Minimalist Monospace' },
                    ].map((tpl) => (
                      <button
                        key={tpl.id}
                        onClick={() => setActiveTemplate(tpl.id)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                          activeTemplate === tpl.id
                            ? 'bg-slate-900 text-white shadow-2xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {tpl.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      id="resume-download-pdf-btn"
                      onClick={handleDownloadPdf}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                      title="Download clean ATS PDF without changing formatting"
                    >
                      <Printer className="w-3.5 h-3.5 text-indigo-300" />
                      <span>Download PDF</span>
                    </button>

                    <button
                      id="resume-download-word-btn"
                      onClick={handleDownloadWord}
                      className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                      title="Download formatted Word document (.doc) preserving all typography and sections"
                    >
                      <Download className="w-3.5 h-3.5 text-white" />
                      <span>Download Word</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Printable Canvas Document */}
              <div
                id="resume-printable-document"
                className={`bg-white border border-slate-300 rounded-2xl p-7 sm:p-10 shadow-lg text-slate-900 leading-relaxed text-xs max-w-3xl mx-auto transition-all ${
                  activeTemplate === 'executive'
                    ? 'font-serif'
                    : activeTemplate === 'tech'
                    ? 'font-mono text-[11px]'
                    : 'font-sans'
                }`}
              >
                {/* Header */}
                <div className={`text-center pb-4 mb-4 ${activeTemplate === 'modern' ? 'border-b-2 border-indigo-600' : 'border-b border-slate-300'}`}>
                  <h1 className={`text-2xl sm:text-3xl font-black tracking-tight text-slate-900 uppercase ${activeTemplate === 'modern' ? 'text-indigo-950' : ''}`}>
                    {resume?.name || 'Your Full Name'}
                  </h1>
                  {(resume?.title || resume?.roleTitle) && (
                    <p className="text-xs sm:text-sm font-bold text-indigo-600 uppercase tracking-widest mt-1">
                      {resume.title || resume.roleTitle}
                    </p>
                  )}
                  <div className="text-[11px] text-slate-600 mt-2 flex items-center justify-center gap-2 flex-wrap font-sans">
                    {(resume?.contact?.email || resume?.email) && (
                      <a href={`mailto:${resume?.contact?.email || resume?.email}`} className="hover:text-indigo-600 flex items-center gap-1">
                        <Mail className="w-3 h-3 text-slate-400" />
                        <span>{resume?.contact?.email || resume?.email}</span>
                      </a>
                    )}
                    {(resume?.contact?.phone || resume?.phone) && (
                      <span className="flex items-center gap-1">
                        <span>•</span>
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{resume?.contact?.phone || resume?.phone}</span>
                      </span>
                    )}
                    {(resume?.contact?.location || resume?.location) && (
                      <span className="flex items-center gap-1">
                        <span>•</span>
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span>{resume?.contact?.location || resume?.location}</span>
                      </span>
                    )}
                    {resume?.contact?.linkedin && (
                      <span className="flex items-center gap-1">
                        <span>•</span>
                        <a href={resume.contact.linkedin} target="_blank" rel="noreferrer" className="text-indigo-600 hover:text-indigo-800 underline font-semibold flex items-center gap-0.5">
                          <Linkedin className="w-3 h-3" />
                          <span>LinkedIn</span>
                        </a>
                      </span>
                    )}
                    {resume?.contact?.github && (
                      <span className="flex items-center gap-1">
                        <span>•</span>
                        <a href={resume.contact.github} target="_blank" rel="noreferrer" className="text-indigo-600 hover:text-indigo-800 underline font-semibold flex items-center gap-0.5">
                          <Github className="w-3 h-3" />
                          <span>GitHub</span>
                        </a>
                      </span>
                    )}
                    {resume?.contact?.portfolio && (
                      <span className="flex items-center gap-1">
                        <span>•</span>
                        <a href={resume.contact.portfolio} target="_blank" rel="noreferrer" className="text-indigo-600 hover:text-indigo-800 underline font-semibold flex items-center gap-0.5">
                          <Globe className="w-3 h-3" />
                          <span>Portfolio</span>
                        </a>
                      </span>
                    )}
                  </div>
                </div>

                {/* Professional Summary */}
                {resume?.summary && (() => {
                  const summaryFix = centerMode === 'interactive' ? getSummaryIssueAndFix(resume.summary) : null;
                  return (
                    <div className="mb-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-0.5 mb-1.5">
                        Professional Summary
                      </h4>
                      {summaryFix ? (
                        <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 space-y-2">
                          <p className="text-[11.5px] text-slate-800 leading-relaxed font-sans">{resume.summary}</p>
                          <div className="pt-2 border-t border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="text-[11px] text-amber-900">
                              <span className="font-bold flex items-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                                <span>{summaryFix.reason}</span>
                              </span>
                              <span className="text-[10px] text-slate-600 block mt-0.5">
                                <b>Suggested:</b> "{summaryFix.fixingLine.slice(0, 110)}..."
                              </span>
                            </div>
                            <button
                              onClick={() => handleApplySummaryFix(summaryFix.fixingLine)}
                              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold rounded-lg cursor-pointer transition-colors shadow-2xs whitespace-nowrap flex items-center gap-1 self-start sm:self-auto"
                            >
                              <Zap className="w-3 h-3" />
                              <span>Apply Fix</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-[11.5px] text-slate-700 leading-relaxed font-sans">{resume.summary}</p>
                      )}
                    </div>
                  );
                })()}

                {/* Experience */}
                <div className="mb-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-0.5 mb-2">
                    Professional Experience
                  </h4>
                  {(resume?.experience || []).map((exp, i) => (
                    <div key={i} className="mb-4">
                      <div className="flex justify-between items-baseline font-bold text-xs text-slate-900">
                        <span>{exp.role || exp.title} <span className="font-normal text-slate-500">— {exp.company}</span></span>
                        <span className="text-[10.5px] text-slate-500 font-medium">{exp.dates}</span>
                      </div>
                      {exp.location && <div className="text-[10px] text-slate-400 mb-1">{exp.location}</div>}

                      <ul className="space-y-1.5 mt-1 text-[11px] text-slate-700 leading-normal">
                        {(exp.bullets || []).map((b, bi) => {
                          const fixInfo = centerMode === 'interactive' ? getBulletIssuesAndFix(b, i, bi, issues) : null;
                          if (fixInfo) {
                            return (
                              <li key={bi} className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200 text-slate-900 list-none space-y-1.5 transition-all">
                                <div className="flex items-start gap-1.5 text-xs">
                                  <span className="text-amber-600 font-bold mt-0.5">•</span>
                                  <span className="text-slate-800 leading-relaxed">{b}</span>
                                </div>
                                <div className="pt-1.5 border-t border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                  <div className="text-[10.5px]">
                                    <span className="font-bold text-amber-800 flex items-center gap-1">
                                      <Sparkles className="w-3 h-3 text-amber-600" />
                                      <span>{fixInfo.reason}</span>
                                    </span>
                                    <span className="text-slate-700 block mt-0.5">
                                      <b>Suggested:</b> "{fixInfo.fixingLine}"
                                    </span>
                                  </div>
                                  <button
                                    onClick={() => handleApplyBulletFix(i, bi, fixInfo.fixingLine)}
                                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[10.5px] font-bold rounded-lg cursor-pointer transition-colors shadow-2xs whitespace-nowrap flex items-center gap-1 self-start sm:self-auto"
                                  >
                                    <Zap className="w-3 h-3" />
                                    <span>Apply Fix</span>
                                  </button>
                                </div>
                              </li>
                            );
                          }
                          return (
                            <li key={bi} className="list-disc list-outside ml-4 pl-0.5 hover:text-slate-900 transition-colors">
                              {b}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>

                {/* Projects */}
                {(resume?.projects || []).length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-0.5 mb-2">
                      Key Technical Projects
                    </h4>
                    {resume.projects.map((proj, pi) => (
                      <div key={pi} className="mb-3">
                        <div className="flex justify-between items-baseline text-xs font-bold">
                          <span>
                            {proj.name}
                            {proj.tech?.length > 0 && (
                              <span className="text-[10.5px] font-normal text-slate-500 ml-1.5">
                                ({proj.tech.join(', ')})
                              </span>
                            )}
                          </span>
                          {proj.link && (
                            <a href={proj.link} target="_blank" rel="noreferrer" className="text-[10px] text-indigo-600 hover:text-indigo-800 underline font-semibold flex items-center gap-0.5">
                              <Globe className="w-2.5 h-2.5" />
                              <span>{proj.link.replace(/^https?:\/\/(?:www\.)?github\.com\//, 'gh/').slice(0, 30)}</span>
                            </a>
                          )}
                        </div>
                        <ul className="list-disc list-outside pl-4 space-y-0.5 mt-0.5 text-[11px] text-slate-700">
                          {(proj.bullets || [proj.description]).filter(Boolean).map((b, bi) => (
                            <li key={bi}>{b}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}

                {/* Skills */}
                <div className="mb-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-0.5 mb-1.5">
                    Technical Skills &amp; Domain Expertise
                  </h4>
                  <div className="space-y-1 text-[11px] text-slate-700">
                    {Object.entries(getSkillsObject()).map(([cat, items]) => {
                      if (!items || items.length === 0) return null;
                      return (
                        <div key={cat} className="flex gap-1.5">
                          <b className="capitalize text-slate-900 min-w-24">{cat}:</b>
                          <span>{items.join(', ')}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Education */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-0.5 mb-1.5">
                    Education &amp; Credentials
                  </h4>
                  {(resume?.education || []).map((ed, i) => (
                    <div key={i} className="flex justify-between items-baseline text-[11px] mb-1">
                      <span>
                        <b className="text-slate-900">{ed.school || ed.institution}</b> — {ed.degree} {ed.field ? `in ${ed.field}` : ''} {ed.gpa ? `(GPA: ${ed.gpa})` : ''}
                      </span>
                      <span className="text-slate-500 font-medium">{ed.graduationDate}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT COLUMN (3 cols): DIAGNOSTICS INSPECTOR & 1-CLICK FIXES ── */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                <span>Diagnostics &amp; Fixes</span>
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                {issues.length} {issues.length === 1 ? 'Rule' : 'Rules'}
              </span>
            </div>

            {/* Category Filter Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px] font-semibold border-b border-slate-100">
              {[
                { id: 'all', label: 'All', count: issues.length },
                { id: 'impact', label: 'Impact', count: impactIssues.length },
                { id: 'brevity', label: 'Brevity', count: brevityIssues.length },
                { id: 'style', label: 'Style', count: styleIssues.length },
                { id: 'sections', label: 'Sections', count: sectionsIssues.length },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedCategory(tab.id)}
                  className={`px-2 py-1 rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                    selectedCategory === tab.id
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </div>

            {/* Issues List */}
            <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
              {filteredIssues.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <p className="font-bold text-slate-700">No Issues Detected</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">This category satisfies all ATS compliance rules.</p>
                </div>
              ) : (
                filteredIssues.map((iss) => {
                  const isFail = iss.severity === 'fail';
                  const isWarn = iss.severity === 'warn';

                  return (
                    <div
                      key={iss.id}
                      className={`p-3 rounded-xl border transition-all text-xs space-y-2 ${
                        isFail
                          ? 'border-rose-200 bg-rose-50/50'
                          : isWarn
                          ? 'border-amber-200 bg-amber-50/40'
                          : 'border-emerald-200 bg-emerald-50/30'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1.5">
                        <div className="flex items-center gap-1.5 font-bold text-slate-900">
                          {isFail ? (
                            <AlertCircle className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />
                          ) : isWarn ? (
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                          )}
                          <span>{iss.title}</span>
                        </div>
                        <span
                          className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded-full ${
                            isFail
                              ? 'bg-rose-100 text-rose-800'
                              : isWarn
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {iss.severity}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-600 leading-snug">{iss.explanation}</p>

                      {/* Evidence context */}
                      {iss.evidence?.snippet && (
                        <div className="p-1.5 rounded-lg bg-white/80 border border-slate-200 font-mono text-[10px] text-slate-700 truncate">
                          "{iss.evidence.snippet}"
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/60">
                        {iss.evidence?.experienceIndex !== undefined && iss.evidence?.bulletIndex !== undefined && (
                          <button
                            onClick={() => {
                              setViewMode('editor');
                              setActiveTab('experience');
                              setFocusedBulletKey(`bullet-${iss.evidence.experienceIndex}-${iss.evidence.bulletIndex}`);
                              setTimeout(() => {
                                fieldRefs.current[`bullet-${iss.evidence.experienceIndex}-${iss.evidence.bulletIndex}`]?.scrollIntoView({
                                  behavior: 'smooth',
                                  block: 'center',
                                });
                              }, 150);
                            }}
                            className="text-[10px] font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
                          >
                            Locate in Editor →
                          </button>
                        )}

                        <button
                          onClick={() => handleApply1ClickFix(iss)}
                          className="ml-auto px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                        >
                          <Zap className="w-3 h-3" />
                          <span>1-Click Fix</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── EXPORT MODAL ── */}
      <AnimatePresence>
        {isExportModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
            >
              <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <h3 className="text-sm font-bold text-slate-900">Export Calibrated ATS Resume</h3>
                <button
                  onClick={() => setIsExportModalOpen(false)}
                  className="p-1 rounded text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4 text-xs">
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center gap-2 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>ATS-Verified: Single column, standardized headings, parseable formatting</span>
                </div>

                <div className="space-y-2">
                  <label className="font-bold text-slate-800">Select Export Format</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'latex', label: 'LaTeX (Jake)', sub: 'Overleaf / PDF build' },
                      { id: 'docx', label: 'Plain Text / DOCX', sub: 'Standard ATS text' },
                      { id: 'json', label: 'JSON Resume', sub: 'Machine standard' },
                      { id: 'html', label: 'HTML Document', sub: 'Semantic markup' },
                    ].map((fmt) => (
                      <button
                        key={fmt.id}
                        type="button"
                        onClick={() => setExportFormat(fmt.id)}
                        className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                          exportFormat === fmt.id
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-900 font-bold'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <div className="text-xs">{fmt.label}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{fmt.sub}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
                <button
                  onClick={() => setIsExportModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 text-slate-600 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExportDownload}
                  disabled={isExporting}
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isExporting ? 'Generating...' : `Download ${exportFormat.toUpperCase()}`}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Deterministic Generators (Word .doc, Jake's LaTeX, Plain Text, Semantic HTML) ──

export function generateWordDocument(resume) {
  if (!resume) return '';
  const skillsStr = Array.isArray(resume.skills)
    ? resume.skills.join(', ')
    : Object.entries(resume.skills || {})
        .filter(([, list]) => Array.isArray(list) && list.length > 0)
        .map(([k, v]) => `<b>${k.charAt(0).toUpperCase() + k.slice(1)}:</b> ${v.join(', ')}`)
        .join('<br>');

  const linksArr = [
    resume.contact?.email ? `<a href="mailto:${resume.contact.email}">${resume.contact.email}</a>` : '',
    resume.contact?.phone || '',
    resume.contact?.location || '',
    resume.contact?.linkedin ? `<a href="${resume.contact.linkedin}">LinkedIn</a>` : '',
    resume.contact?.github ? `<a href="${resume.contact.github}">GitHub</a>` : '',
    resume.contact?.portfolio ? `<a href="${resume.contact.portfolio}">Portfolio</a>` : '',
  ].filter(Boolean);

  return `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
<meta charset="utf-8">
<title>${resume.name || 'Resume'}</title>
<!--[if gte mso 9]>
<xml>
<w:WordDocument>
<w:View>Print</w:View>
<w:Zoom>100</w:Zoom>
<w:DoNotOptimizeForBrowser/>
</w:WordDocument>
</xml>
<![endif]-->
<style>
@page {
    size: 8.5in 11.0in;
    margin: 0.75in 0.75in 0.75in 0.75in;
    mso-header-margin: 0.5in;
    mso-footer-margin: 0.5in;
}
body {
    font-family: 'Calibri', 'Arial', sans-serif;
    font-size: 10.5pt;
    line-height: 1.25;
    color: #111111;
}
h1 {
    font-size: 22pt;
    text-align: center;
    margin: 0 0 2pt 0;
    text-transform: uppercase;
    letter-spacing: 0.5pt;
    color: #0F172A;
}
.headline {
    font-size: 11pt;
    text-align: center;
    font-weight: bold;
    color: #4338CA;
    margin: 0 0 4pt 0;
}
.contact-line {
    text-align: center;
    font-size: 9.5pt;
    color: #475569;
    margin: 0 0 14pt 0;
}
h2 {
    font-size: 11.5pt;
    text-transform: uppercase;
    letter-spacing: 0.75pt;
    border-bottom: 1.5pt solid #0F172A;
    padding-bottom: 2pt;
    margin: 12pt 0 6pt 0;
    color: #0F172A;
}
ul {
    margin: 2pt 0 6pt 18pt;
    padding: 0;
}
li {
    margin-bottom: 2.5pt;
    text-align: justify;
}
a {
    color: #4338CA;
    text-decoration: underline;
}
</style>
</head>
<body>
<h1>${resume.name || 'Candidate Name'}</h1>
${(resume.title || resume.roleTitle) ? `<div class="headline">${resume.title || resume.roleTitle}</div>` : ''}
<div class="contact-line">${linksArr.join(' &nbsp;|&nbsp; ')}</div>

${resume.summary ? `<h2>Professional Summary</h2><p style="margin: 0 0 8pt 0; text-align: justify;">${resume.summary}</p>` : ''}

${(resume.experience || []).length > 0 ? `
<h2>Professional Experience</h2>
${(resume.experience || []).map(exp => `
<table style="width: 100%; border-collapse: collapse; margin-top: 6pt;">
<tr>
  <td style="font-weight: bold; font-size: 10.5pt; color: #0F172A;">${exp.role || exp.title || 'Engineer'} <span style="font-weight: normal; font-style: italic; color: #475569;">— ${exp.company || ''}</span></td>
  <td style="text-align: right; font-size: 9.5pt; color: #64748B;">${exp.dates || ''}</td>
</tr>
</table>
${exp.location ? `<div style="font-size: 9pt; color: #64748B; margin-bottom: 2pt;">${exp.location}</div>` : ''}
<ul>
${(exp.bullets || []).map(b => `<li>${b}</li>`).join('')}
</ul>
`).join('')}
` : ''}

${(resume.projects || []).length > 0 ? `
<h2>Technical Projects</h2>
${(resume.projects || []).map(p => `
<table style="width: 100%; border-collapse: collapse; margin-top: 4pt;">
<tr>
  <td style="font-weight: bold; font-size: 10pt; color: #0F172A;">${p.name || 'Project'} ${p.tech?.length ? `<span style="font-weight: normal; font-size: 9pt; color: #475569;">(${p.tech.join(', ')})</span>` : ''}</td>
  <td style="text-align: right; font-size: 9pt;">${p.link ? `<a href="${p.link}">${p.link}</a>` : ''}</td>
</tr>
</table>
<ul>
${(p.bullets || [p.description]).filter(Boolean).map(b => `<li>${b}</li>`).join('')}
</ul>
`).join('')}
` : ''}

${skillsStr ? `<h2>Technical Skills</h2><p style="margin: 2pt 0 8pt 0;">${skillsStr}</p>` : ''}

${(resume.education || []).length > 0 ? `
<h2>Education</h2>
${(resume.education || []).map(ed => `
<table style="width: 100%; border-collapse: collapse; margin-top: 4pt;">
<tr>
  <td style="font-weight: bold; font-size: 10pt; color: #0F172A;">${ed.school || ed.institution || ''} <span style="font-weight: normal; color: #334155;">— ${ed.degree || ''} ${ed.field ? `in ${ed.field}` : ''} ${ed.gpa ? `(GPA: ${ed.gpa})` : ''}</span></td>
  <td style="text-align: right; font-size: 9.5pt; color: #64748B;">${ed.graduationDate || ''}</td>
</tr>
</table>
`).join('')}
` : ''}
</body>
</html>`;
}

function generateJakeLatex(resume) {
  if (!resume) return '% Empty resume';
  return `\\documentclass[letterpaper,11pt]{article}
\\usepackage{latexsym}
\\usepackage[empty]{fullpage}
\\usepackage{titlesec}
\\usepackage{marvosym}
\\usepackage[usenames,dvipsnames]{color}
\\usepackage{verbatim}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\usepackage{fancyhdr}
\\usepackage[english]{babel}
\\usepackage{tabularx}

\\pagestyle{fancy}
\\fancyhf{}
\\renewcommand{\\headrulewidth}{0pt}
\\renewcommand{\\footrulewidth}{0pt}

\\begin{document}
\\begin{center}
    \\textbf{\\Huge \\scshape ${resume.name || 'Candidate Name'}} \\\\ \\vspace{1pt}
    \\small ${resume.contact?.phone || ''} $|$ \\href{mailto:${resume.contact?.email || ''}}{\\underline{${resume.contact?.email || ''}}} $|$ 
    \\href{${resume.contact?.linkedin || 'https://linkedin.com'}}{\\underline{linkedin.com}} $|$
    \\href{${resume.contact?.github || 'https://github.com'}}{\\underline{github.com}}
\\end{center}

\\section{Education}
\\begin{itemize}[leftmargin=0.15in, label={}]
${(resume.education || []).map((ed) => `    \\item \\textbf{${ed.school || ed.institution || ''}} $|$ \\textit{${ed.degree || ''}} \\hfill ${ed.graduationDate || ''}`).join('\n')}
\\end{itemize}

\\section{Experience}
\\begin{itemize}[leftmargin=0.15in, label={}]
${(resume.experience || []).map((exp) => `    \\item \\textbf{${exp.role || exp.title || ''}} $|$ \\textit{${exp.company || ''}} \\hfill ${exp.dates || ''}\n    \\begin{itemize}\n${(exp.bullets || []).map((b) => `        \\item ${b}`).join('\n')}\n    \\end{itemize}`).join('\n')}
\\end{itemize}

\\section{Technical Skills}
\\begin{itemize}[leftmargin=0.15in, label={}]
    \\small{\\item{
     \\textbf{Skills}{: ${Array.isArray(resume.skills) ? resume.skills.join(', ') : Object.values(resume.skills || {}).flat().join(', ')}}
    }}
\\end{itemize}
\\end{document}`;
}

function generatePlainDocx(resume) {
  if (!resume) return 'Empty resume';
  return `${resume.name || 'Candidate Name'}\n${resume.title || ''}\n${resume.contact?.email || ''} | ${resume.contact?.phone || ''} | ${resume.contact?.location || ''}\n\nSUMMARY\n${resume.summary || ''}\n\nEDUCATION\n` +
    (resume.education || []).map((e) => `${e.school || e.institution || ''} - ${e.degree || ''} (${e.graduationDate || ''})`).join('\n') +
    `\n\nEXPERIENCE\n` +
    (resume.experience || [])
      .map((exp) => `${exp.role || exp.title || ''} - ${exp.company || ''} (${exp.dates || ''})\n` + (exp.bullets || []).map((b) => `• ${b}`).join('\n'))
      .join('\n\n') +
    `\n\nTECHNICAL SKILLS\n` +
    (Array.isArray(resume.skills) ? resume.skills.join(', ') : Object.values(resume.skills || {}).flat().join(', ')) + '\n';
}

function generateHtmlResume(resume) {
  if (!resume) return '<html><body>Empty</body></html>';
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${resume.name || 'Resume'}</title>
<style>body{font-family:sans-serif;max-width:800px;margin:2rem auto;line-height:1.6;color:#111}h1{margin-bottom:0.2rem}hr{border:none;border-top:1px solid #ddd}</style>
</head>
<body>
<h1>${resume.name || ''}</h1>
<p><b>${resume.title || ''}</b></p>
<p>${resume.contact?.email || ''} | ${resume.contact?.phone || ''} | ${resume.contact?.location || ''}</p>
<hr>
<h2>Summary</h2>
<p>${resume.summary || ''}</p>
<h2>Education</h2>
${(resume.education || []).map((e) => `<p><b>${e.school || e.institution || ''}</b> - ${e.degree || ''} (<i>${e.graduationDate || ''}</i>)</p>`).join('')}
<h2>Experience</h2>
${(resume.experience || []).map((exp) => `<div><h3>${exp.role || exp.title || ''} - ${exp.company || ''}</h3><ul>${(exp.bullets || []).map((b) => `<li>${b}</li>`).join('')}</ul></div>`).join('')}
<h2>Skills</h2>
<p>${Array.isArray(resume.skills) ? resume.skills.join(', ') : Object.values(resume.skills || {}).flat().join(', ')}</p>
</body>
</html>`;
}
