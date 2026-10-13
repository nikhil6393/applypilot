import React, { useState, useMemo, useEffect } from 'react';
import './SkillGapExact.css';
import { useAppStore } from '../store/appStore';
import { CompanyIcon, FirstAlphabetLogo } from './CompanyIcon';

function renderCompanyLogo(company, size = 28) {
  if (!company) return null;
  if (company.logo) {
    return <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{company.logo}</div>;
  }
  return <CompanyIcon company={company.name || company.id} logoUrl={company.logoUrl} size={size} />;
}

export const COMPANIES_DATA = [
  {
    id: 'google',
    name: 'Google',
    industry: 'Internet Services & Software',
    salary: '₹12L – ₹45L',
    matchPct: 72,
    gapPct: 28,
    matchedCount: 23,
    missingCount: 9,
    totalSkills: 32,
    missingSkills: ['System Design', 'Data Structures', 'Algorithms', 'Distributed Systems', 'GCP', 'Kubernetes'],
    keySkillsToLearn: [
      { name: 'System Design', color: '#db2777', icon: 'target' },
      { name: 'Data Structures', color: '#2563eb', icon: 'box' },
      { name: 'Algorithms', color: '#d97706', icon: 'code' },
      { name: 'Kubernetes', color: '#16a34a', icon: 'shield' },
      { name: 'GCP', color: '#2563eb', icon: 'globe' },
      { name: 'Machine Learning', color: '#db2777', icon: 'sparkle' },
    ],
    categories: [
      { name: 'Programming Languages', pct: 20, delta: '+1.2K', gradient: 'linear-gradient(90deg, #f87171, #fb923c)' },
      { name: 'Frameworks & Libraries', pct: 35, delta: '', gradient: 'linear-gradient(90deg, #fbbf24, #f59e0b)' },
      { name: 'Cloud & DevOps', pct: 40, delta: '', gradient: 'linear-gradient(90deg, #fbbf24, #fb923c)' },
      { name: 'Data & Databases', pct: 25, delta: '', gradient: 'linear-gradient(90deg, #a78bfa, #8b5cf6)' },
      { name: 'System Design', pct: 50, delta: '', gradient: 'linear-gradient(90deg, #8b5cf6, #7c3aed)' },
      { name: 'Tools & Others', pct: 30, delta: '', gradient: 'linear-gradient(90deg, #34d399, #22c55e)' },
    ],
    topPick: true,
    logo: (
      <svg width="30" height="30" viewBox="0 0 48 48">
        <path fill="#4285F4" d="M45.1 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h11.8c-.5 2.8-2.1 5.1-4.4 6.7v5.5h7.1c4.2-3.9 6.6-9.6 6.6-16.2z"/>
        <path fill="#34A853" d="M24 46c6 0 11-2 14.5-5.3l-7.1-5.5c-2 1.3-4.5 2.1-7.4 2.1-5.7 0-10.5-3.8-12.2-9H4.5v5.7C8.1 41.2 15.4 46 24 46z"/>
        <path fill="#FBBC05" d="M11.8 28.3c-.4-1.3-.7-2.8-.7-4.3s.3-3 .7-4.3V14H4.5A21.9 21.9 0 0 0 2 24c0 3.6.9 6.9 2.5 10z"/>
        <path fill="#EA4335" d="M24 10.8c3.2 0 6.1 1.1 8.4 3.3l6.3-6.3C35 4.2 30 2 24 2 15.4 2 8.1 6.8 4.5 14l7.3 5.7c1.7-5.2 6.5-8.9 12.2-8.9z"/>
      </svg>
    )
  },
  {
    id: 'amazon',
    name: 'Amazon',
    industry: 'E-commerce & Cloud',
    salary: '₹10L – ₹40L',
    matchPct: 68,
    gapPct: 32,
    matchedCount: 21,
    missingCount: 10,
    totalSkills: 31,
    missingSkills: ['Python', 'System Design', 'AWS', 'DynamoDB', 'Microservices'],
    keySkillsToLearn: [
      { name: 'AWS Cloud', color: '#d97706', icon: 'globe' },
      { name: 'System Design', color: '#db2777', icon: 'target' },
      { name: 'Python', color: '#2563eb', icon: 'code' },
      { name: 'DynamoDB', color: '#16a34a', icon: 'box' },
      { name: 'CI/CD Pipelines', color: '#8b5cf6', icon: 'shield' },
    ],
    categories: [
      { name: 'Programming Languages', pct: 25, delta: '+900', gradient: 'linear-gradient(90deg, #f87171, #fb923c)' },
      { name: 'Frameworks & Libraries', pct: 30, delta: '', gradient: 'linear-gradient(90deg, #fbbf24, #f59e0b)' },
      { name: 'Cloud & DevOps', pct: 45, delta: '', gradient: 'linear-gradient(90deg, #fbbf24, #fb923c)' },
      { name: 'Data & Databases', pct: 30, delta: '', gradient: 'linear-gradient(90deg, #a78bfa, #8b5cf6)' },
      { name: 'System Design', pct: 45, delta: '', gradient: 'linear-gradient(90deg, #8b5cf6, #7c3aed)' },
      { name: 'Tools & Others', pct: 20, delta: '', gradient: 'linear-gradient(90deg, #34d399, #22c55e)' },
    ],
    topPick: false,
    logoStyle: { background: '#232f3e', borderColor: '#232f3e' },
    logo: (
      <svg width="32" height="28" viewBox="0 0 32 32">
        <text x="16" y="21" textAnchor="middle" fontSize="15" fontWeight="800" fill="#fff" fontFamily="Inter, sans-serif">a</text>
        <path d="M6 23.5c3.2 2.5 7.4 3.9 11 3.9 4.1 0 8-1.5 11-3.7" fill="none" stroke="#FF9900" strokeWidth="2" strokeLinecap="round"/>
        <path d="M25.8 22.8l1.8 1.1-.4 2" fill="none" stroke="#FF9900" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    )
  },
  {
    id: 'microsoft',
    name: 'Microsoft',
    industry: 'Software & Cloud',
    salary: '₹10L – ₹38L',
    matchPct: 64,
    gapPct: 36,
    matchedCount: 20,
    missingCount: 11,
    totalSkills: 31,
    missingSkills: ['Azure', 'System Design', '.NET', 'C#', 'SQL Server'],
    keySkillsToLearn: [
      { name: 'Azure Cloud', color: '#2563eb', icon: 'globe' },
      { name: 'System Design', color: '#db2777', icon: 'target' },
      { name: 'C# / .NET', color: '#8b5cf6', icon: 'code' },
      { name: 'CosmosDB', color: '#16a34a', icon: 'box' },
      { name: 'Enterprise Architecture', color: '#d97706', icon: 'sparkle' },
    ],
    categories: [
      { name: 'Programming Languages', pct: 30, delta: '+850', gradient: 'linear-gradient(90deg, #f87171, #fb923c)' },
      { name: 'Frameworks & Libraries', pct: 40, delta: '', gradient: 'linear-gradient(90deg, #fbbf24, #f59e0b)' },
      { name: 'Cloud & DevOps', pct: 38, delta: '', gradient: 'linear-gradient(90deg, #fbbf24, #fb923c)' },
      { name: 'Data & Databases', pct: 28, delta: '', gradient: 'linear-gradient(90deg, #a78bfa, #8b5cf6)' },
      { name: 'System Design', pct: 52, delta: '', gradient: 'linear-gradient(90deg, #8b5cf6, #7c3aed)' },
      { name: 'Tools & Others', pct: 25, delta: '', gradient: 'linear-gradient(90deg, #34d399, #22c55e)' },
    ],
    topPick: false,
    logo: (
      <svg width="26" height="26" viewBox="0 0 24 24">
        <rect x="2" y="2" width="9.2" height="9.2" fill="#F25022"/>
        <rect x="12.8" y="2" width="9.2" height="9.2" fill="#7FBA00"/>
        <rect x="2" y="12.8" width="9.2" height="9.2" fill="#00A4EF"/>
        <rect x="12.8" y="12.8" width="9.2" height="9.2" fill="#FFB900"/>
      </svg>
    )
  },
  {
    id: 'tcs',
    name: 'TCS',
    industry: 'IT Services & Consulting',
    salary: '₹4L – ₹12L',
    matchPct: 71,
    gapPct: 29,
    matchedCount: 22,
    missingCount: 9,
    totalSkills: 31,
    missingSkills: ['Java', 'Spring Boot', 'SQL', 'Hibernate', 'REST APIs'],
    keySkillsToLearn: [
      { name: 'Java Enterprise', color: '#ef4444', icon: 'code' },
      { name: 'Spring Boot', color: '#16a34a', icon: 'box' },
      { name: 'SQL Query Optimization', color: '#2563eb', icon: 'shield' },
      { name: 'Agile & JIRA', color: '#d97706', icon: 'sparkle' },
    ],
    categories: [
      { name: 'Programming Languages', pct: 18, delta: '+600', gradient: 'linear-gradient(90deg, #f87171, #fb923c)' },
      { name: 'Frameworks & Libraries', pct: 32, delta: '', gradient: 'linear-gradient(90deg, #fbbf24, #f59e0b)' },
      { name: 'Cloud & DevOps', pct: 35, delta: '', gradient: 'linear-gradient(90deg, #fbbf24, #fb923c)' },
      { name: 'Data & Databases', pct: 20, delta: '', gradient: 'linear-gradient(90deg, #a78bfa, #8b5cf6)' },
      { name: 'System Design', pct: 40, delta: '', gradient: 'linear-gradient(90deg, #8b5cf6, #7c3aed)' },
      { name: 'Tools & Others', pct: 28, delta: '', gradient: 'linear-gradient(90deg, #34d399, #22c55e)' },
    ],
    topPick: false,
    logo: (
      <svg width="40" height="26" viewBox="0 0 40 24">
        <text x="20" y="18" textAnchor="middle" fontFamily="Georgia, serif" fontSize="16" fontStyle="italic" fontWeight="700" fill="#e63946">tcs</text>
      </svg>
    )
  },
  {
    id: 'infosys',
    name: 'Infosys',
    industry: 'IT Services & Consulting',
    salary: '₹4L – ₹12L',
    matchPct: 67,
    gapPct: 33,
    matchedCount: 20,
    missingCount: 10,
    totalSkills: 30,
    missingSkills: ['JavaScript', 'React', 'Node.js', 'MongoDB', 'Angular'],
    keySkillsToLearn: [
      { name: 'React.js', color: '#0866ff', icon: 'code' },
      { name: 'Node.js Backend', color: '#16a34a', icon: 'box' },
      { name: 'TypeScript', color: '#2563eb', icon: 'shield' },
      { name: 'Full-Stack Architecture', color: '#db2777', icon: 'target' },
    ],
    categories: [
      { name: 'Programming Languages', pct: 22, delta: '+720', gradient: 'linear-gradient(90deg, #f87171, #fb923c)' },
      { name: 'Frameworks & Libraries', pct: 38, delta: '', gradient: 'linear-gradient(90deg, #fbbf24, #f59e0b)' },
      { name: 'Cloud & DevOps', pct: 36, delta: '', gradient: 'linear-gradient(90deg, #fbbf24, #fb923c)' },
      { name: 'Data & Databases', pct: 24, delta: '', gradient: 'linear-gradient(90deg, #a78bfa, #8b5cf6)' },
      { name: 'System Design', pct: 44, delta: '', gradient: 'linear-gradient(90deg, #8b5cf6, #7c3aed)' },
      { name: 'Tools & Others', pct: 26, delta: '', gradient: 'linear-gradient(90deg, #34d399, #22c55e)' },
    ],
    topPick: false,
    logo: <span style={{ color: '#007cc3', fontWeight: 700, fontSize: 13 }}>Infosys</span>
  },
  {
    id: 'meta',
    name: 'Meta',
    industry: 'Social Media & Technology',
    salary: '₹15L – ₹60L',
    matchPct: 59,
    gapPct: 41,
    matchedCount: 18,
    missingCount: 13,
    totalSkills: 31,
    missingSkills: ['React', 'System Design', 'GraphQL', 'Relay', 'Large Scale Storage'],
    keySkillsToLearn: [
      { name: 'GraphQL / Relay', color: '#ec4899', icon: 'sparkle' },
      { name: 'Distributed Caching', color: '#8b5cf6', icon: 'shield' },
      { name: 'High-Concurrency Systems', color: '#db2777', icon: 'target' },
      { name: 'React Internals', color: '#0866ff', icon: 'code' },
    ],
    categories: [
      { name: 'Programming Languages', pct: 28, delta: '+1.5K', gradient: 'linear-gradient(90deg, #f87171, #fb923c)' },
      { name: 'Frameworks & Libraries', pct: 42, delta: '', gradient: 'linear-gradient(90deg, #fbbf24, #f59e0b)' },
      { name: 'Cloud & DevOps', pct: 46, delta: '', gradient: 'linear-gradient(90deg, #fbbf24, #fb923c)' },
      { name: 'Data & Databases', pct: 34, delta: '', gradient: 'linear-gradient(90deg, #a78bfa, #8b5cf6)' },
      { name: 'System Design', pct: 58, delta: '', gradient: 'linear-gradient(90deg, #8b5cf6, #7c3aed)' },
      { name: 'Tools & Others', pct: 32, delta: '', gradient: 'linear-gradient(90deg, #34d399, #22c55e)' },
    ],
    topPick: false,
    logo: (
      <svg width="30" height="30" viewBox="0 0 48 48" fill="none" stroke="#0668E1" strokeWidth="4.6" strokeLinecap="round">
        <path d="M6 32c0-11 4.5-17 8.5-17S21 22 24 28s6 13 10 13c3.4 0 8-6 8-17 0-6-1.5-9-4-9-2.9 0-6.3 4.6-14 17"/>
      </svg>
    )
  },
  {
    id: 'apple',
    name: 'Apple',
    industry: 'Consumer Electronics & Software',
    salary: '₹12L – ₹50L',
    matchPct: 56,
    gapPct: 44,
    matchedCount: 17,
    missingCount: 14,
    totalSkills: 31,
    missingSkills: ['Swift', 'iOS Development', 'DSA', 'Objective-C', 'Metal'],
    keySkillsToLearn: [
      { name: 'Swift & SwiftUI', color: '#f97316', icon: 'code' },
      { name: 'iOS Architecture (MVVM)', color: '#2563eb', icon: 'shield' },
      { name: 'Memory Management (ARC)', color: '#db2777', icon: 'target' },
      { name: 'CoreData & Concurrency', color: '#16a34a', icon: 'box' },
    ],
    categories: [
      { name: 'Programming Languages', pct: 34, delta: '+1.1K', gradient: 'linear-gradient(90deg, #f87171, #fb923c)' },
      { name: 'Frameworks & Libraries', pct: 45, delta: '', gradient: 'linear-gradient(90deg, #fbbf24, #f59e0b)' },
      { name: 'Cloud & DevOps', pct: 38, delta: '', gradient: 'linear-gradient(90deg, #fbbf24, #fb923c)' },
      { name: 'Data & Databases', pct: 30, delta: '', gradient: 'linear-gradient(90deg, #a78bfa, #8b5cf6)' },
      { name: 'System Design', pct: 54, delta: '', gradient: 'linear-gradient(90deg, #8b5cf6, #7c3aed)' },
      { name: 'Tools & Others', pct: 35, delta: '', gradient: 'linear-gradient(90deg, #34d399, #22c55e)' },
    ],
    topPick: false,
    logo: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="#111">
        <path d="M16.6 12.9c0-2.4 2-3.6 2.1-3.7-1.1-1.7-2.9-1.9-3.5-1.9-1.5-.2-2.9.9-3.7.9-.8 0-2-.9-3.2-.9-1.7 0-3.2 1-4 2.5-1.7 3-.4 7.4 1.2 9.8.8 1.2 1.8 2.5 3 2.4 1.2 0 1.7-.8 3.1-.8s1.9.8 3.2.8c1.3 0 2.2-1.2 3-2.4.9-1.4 1.3-2.7 1.3-2.8-.1 0-2.5-1-2.5-3.9zM14.2 5.4c.7-.8 1.1-1.9 1-3-1 0-2.1.7-2.8 1.5-.6.7-1.2 1.9-1 3 1.1.1 2.2-.6 2.8-1.5z"/>
      </svg>
    )
  }
];

export function SkillGapExact({ onNavigateToFeed }) {
  const { addToast } = useAppStore();
  const [companies, setCompanies] = useState(COMPANIES_DATA);
  const [selectedCompanyId, setSelectedCompanyId] = useState(COMPANIES_DATA[0].id);
  const [activeTab, setActiveTab] = useState('company');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState('all');
  const [selectedRole, setSelectedRole] = useState('all');
  const [sortBy, setSortBy] = useState('highest_gap');
  const [isLiveLoaded, setIsLiveLoaded] = useState(false);

  // Fetch real scraped companies from high-speed cached endpoint
  useEffect(() => {
    let active = true;
    fetch('/api/jobs/companies-skill-gap')
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        if (data && data.success && Array.isArray(data.companies) && data.companies.length > 0) {
          setCompanies(data.companies);
          setIsLiveLoaded(true);
          setSelectedCompanyId((prev) => {
            const exists = data.companies.some((c) => c.id === prev);
            return exists ? prev : data.companies[0].id;
          });
        }
      })
      .catch((err) => {
        console.warn('[SkillGapExact] API fallback:', err);
      });
    return () => {
      active = false;
    };
  }, []);

  const industries = useMemo(() => {
    const list = new Set();
    companies.forEach((c) => {
      if (c.industry) list.add(c.industry);
    });
    return ['all', ...Array.from(list)];
  }, [companies]);

  const selectedCompany = useMemo(() => {
    return companies.find((c) => c.id === selectedCompanyId) || companies[0] || COMPANIES_DATA[0];
  }, [companies, selectedCompanyId]);

  const filteredCompanies = useMemo(() => {
    let list = [...companies];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.industry && c.industry.toLowerCase().includes(q)) ||
          (c.missingSkills && c.missingSkills.some((s) => s.toLowerCase().includes(q)))
      );
    }
    if (selectedIndustry !== 'all') {
      list = list.filter((c) => c.industry === selectedIndustry);
    }
    if (selectedRole !== 'all') {
      list = list.filter((c) =>
        c.missingSkills && c.missingSkills.some((s) => s.toLowerCase().includes(selectedRole.toLowerCase()))
      );
    }
    if (sortBy === 'highest_gap') {
      list.sort((a, b) => b.gapPct - a.gapPct);
    } else if (sortBy === 'highest_match') {
      list.sort((a, b) => b.matchPct - a.matchPct);
    } else if (sortBy === 'most_jobs') {
      list.sort((a, b) => (b.openJobsCount || 0) - (a.openJobsCount || 0));
    }
    return list;
  }, [companies, searchQuery, selectedIndustry, selectedRole, sortBy]);

  const handleViewJobs = (companyName) => {
    if (onNavigateToFeed) {
      onNavigateToFeed(companyName);
    } else {
      addToast({
        type: 'success',
        title: `Viewing ${companyName} Openings`,
        message: `Redirecting to live job feed filtered for ${companyName}.`,
      });
    }
  };

  const handleExploreLearning = () => {
    const missing = selectedCompany.missingSkills || [];
    addToast({
      type: 'success',
      title: 'Personalized Roadmap Ready',
      message: `Generated custom curriculum covering: ${missing.slice(0, 3).join(', ')}.`,
    });
  };

  return (
    <div className="skillgap-content">
      {/* ===== CENTER COLUMN ===== */}
      <div>
        {/* HERO SECTION */}
        <section className="hero">
          <span className="hbadge">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round">
              <path d="M3 21h18M5 21V8l7-5 7 5v13M9 21v-4h6v4" />
            </svg>
            Company Wise
          </span>
          <h1>Skill Gap Analysis</h1>
          <p className="sub2">
            Discover the skills top companies are looking for
            <br />
            and see where you stand. Bridge the gap and stay ahead!
          </p>
          <svg className="hero-art" viewBox="0 0 380 150">
            {/* dotted connectors */}
            <path
              d="M60 60 C 90 30, 120 40, 150 30 M 150 30 C 180 55, 200 40, 225 42 M 225 42 C 250 30, 262 40, 285 32"
              stroke="#c3b6f2"
              strokeWidth="1.6"
              strokeDasharray="1.5 5"
              fill="none"
              strokeLinecap="round"
            />
            {/* Microsoft logo tile */}
            <rect x="42" y="52" width="48" height="48" rx="12" fill="#fff" style={{ filter: 'drop-shadow(0 3px 6px rgba(91,77,240,.12))' }} />
            <g transform="translate(54,64)">
              <svg width="24" height="24" viewBox="0 0 24 24">
                <rect x="2" y="2" width="9.2" height="9.2" fill="#F25022" />
                <rect x="12.8" y="2" width="9.2" height="9.2" fill="#7FBA00" />
                <rect x="2" y="12.8" width="9.2" height="9.2" fill="#00A4EF" />
                <rect x="12.8" y="12.8" width="9.2" height="9.2" fill="#FFB900" />
              </svg>
            </g>
            {/* Google logo tile */}
            <rect x="106" y="16" width="50" height="50" rx="12" fill="#fff" style={{ filter: 'drop-shadow(0 3px 6px rgba(91,77,240,.12))' }} />
            <g transform="translate(119,29)">
              <svg width="24" height="24" viewBox="0 0 48 48">
                <path fill="#4285F4" d="M45.1 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h11.8c-.5 2.8-2.1 5.1-4.4 6.7v5.5h7.1c4.2-3.9 6.6-9.6 6.6-16.2z" />
                <path fill="#34A853" d="M24 46c6 0 11-2 14.5-5.3l-7.1-5.5c-2 1.3-4.5 2.1-7.4 2.1-5.7 0-10.5-3.8-12.2-9H4.5v5.7C8.1 41.2 15.4 46 24 46z" />
                <path fill="#FBBC05" d="M11.8 28.3c-.4-1.3-.7-2.8-.7-4.3s.3-3 .7-4.3V14H4.5A21.9 21.9 0 0 0 2 24c0 3.6.9 6.9 2.5 10z" />
                <path fill="#EA4335" d="M24 10.8c3.2 0 6.1 1.1 8.4 3.3l6.3-6.3C35 4.2 30 2 24 2 15.4 2 8.1 6.8 4.5 14l7.3 5.7c1.7-5.2 6.5-8.9 12.2-8.9z" />
              </svg>
            </g>
            {/* Amazon tile */}
            <rect x="158" y="52" width="46" height="46" rx="12" fill="#fff" style={{ filter: 'drop-shadow(0 3px 6px rgba(91,77,240,.12))' }} />
            <text x="181" y="84" textAnchor="middle" fontFamily="Inter,sans-serif" fontWeight="800" fontSize="26" fill="#16183d">
              a
            </text>
            {/* Meta tile */}
            <rect x="216" y="22" width="46" height="46" rx="12" fill="#fff" style={{ filter: 'drop-shadow(0 3px 6px rgba(91,77,240,.12))' }} />
            <path d="M232 45c0-9 5.4-14.5 12-14.5 6.9 0 11.8 5.6 11.8 14.5 0 .9-4.6 3.4-11.8 3.4S232 45.9 232 45z" fill="none" stroke="#0866ff" strokeWidth="2.6" strokeLinecap="round" />
            <path d="M240 30.5c1.8-2 4-2.4 5.5-1.5" stroke="#0866ff" strokeWidth="2.6" fill="none" strokeLinecap="round" />
            {/* Learn & Grow bubble */}
            <rect x="268" y="34" width="58" height="52" rx="12" fill="#c9b8f7" opacity=".92" />
            <text x="297" y="54" textAnchor="middle" fontFamily="Caveat,cursive" fontSize="13" fontWeight="700" fill="#fff">
              Learn
            </text>
            <text x="297" y="67" textAnchor="middle" fontFamily="Caveat,cursive" fontSize="13" fontWeight="700" fill="#fff">
              &amp; Grow
            </text>
            {/* person + laptop illustration */}
            <rect x="250" y="106" width="130" height="10" rx="5" fill="#c5d2f4" />
            <circle cx="322" cy="62" r="12" fill="#f0b489" />
            <path d="M311 59c2-10 20-9.5 21 0 .7 4.5-1.4 7.5-1.4 7.5-6.5-4.6-15-4-19.6-3.7z" fill="#2b2f45" />
            <path d="M310 88c0-12 7-19 14.5-19 9.5 0 14.5 6 16.5 14l2 8-9 3-2.5-9-1 20h-10.5l.5-17z" fill="#6a5af5" />
            <path d="M290 116c0-4 3-7 7-7h40c4 0 7 3 7 7v3c0 4-3 7-7 7h-40c-4 0-7-3-7-7z" fill="#7c6cf6" />
            <rect x="272" y="88" width="62" height="34" rx="5" fill="#fff" />
            <rect x="278" y="95" width="30" height="4" rx="2" fill="#c9d6f6" />
            <rect x="278" y="103" width="44" height="3" rx="1.5" fill="#dde5f8" />
            <rect x="278" y="110" width="36" height="3" rx="1.5" fill="#dde5f8" />
            <path d="M270 132l4 4-4 4-4-4z" fill="#8b7cf6" />
            <path d="M366 30l1.6 3.4 3.4 1.6-3.4 1.6-1.6 3.4-1.6-3.4-3.4-1.6 3.4-1.6z" fill="#fff" opacity=".9" />
          </svg>
        </section>

        {/* TABS */}
        <div className="card tabs">
          <button
            className={`tab ${activeTab === 'company' ? 'on' : ''}`}
            onClick={() => setActiveTab('company')}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round">
              <path d="M3 21h18M5 21V8l7-5 7 5v13M9 21v-4h6v4" />
            </svg>
            Company Wise
          </button>
          <button
            className={`tab ${activeTab === 'industry' ? 'on' : ''}`}
            onClick={() => setActiveTab('industry')}
          >
            Industry Wise
          </button>
          <button
            className={`tab ${activeTab === 'role' ? 'on' : ''}`}
            onClick={() => setActiveTab('role')}
          >
            Role Wise
          </button>
          <button
            className={`tab ${activeTab === 'trending' ? 'on' : ''}`}
            onClick={() => setActiveTab('trending')}
          >
            Trending Skills
          </button>
        </div>

        {/* FILTER ROW */}
        <div className="frow">
          <div className="fsearch">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.8-3.8" />
            </svg>
            <input
              placeholder="Search companies, tech or skills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="fdrop">
            <select
              value={selectedIndustry}
              onChange={(e) => setSelectedIndustry(e.target.value)}
              style={{ border: 0, outline: 0, background: 'transparent', font: 'inherit', color: 'inherit', fontWeight: 600, cursor: 'pointer' }}
            >
              <option value="all">All Industries</option>
              {industries.filter((i) => i !== 'all').map((ind) => (
                <option key={ind} value={ind}>{ind}</option>
              ))}
            </select>
          </div>
          <div className="fdrop">
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              style={{ border: 0, outline: 0, background: 'transparent', font: 'inherit', color: 'inherit', fontWeight: 600, cursor: 'pointer' }}
            >
              <option value="all">All Job Roles</option>
              <option value="frontend">Frontend / React</option>
              <option value="backend">Backend / Node / Python</option>
              <option value="cloud">Cloud / DevOps</option>
              <option value="full stack">Full Stack</option>
              <option value="system">System Design</option>
            </select>
          </div>
          <div className="fdrop">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{ border: 0, outline: 0, background: 'transparent', font: 'inherit', color: 'inherit', fontWeight: 600, cursor: 'pointer' }}
            >
              <option value="highest_gap">Highest Gap</option>
              <option value="highest_match">Highest Match</option>
              <option value="most_jobs">Most Openings</option>
            </select>
          </div>
          <button
            className="reset"
            onClick={() => {
              setSearchQuery('');
              setSelectedIndustry('all');
              setSelectedRole('all');
              setSortBy('highest_gap');
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 1 1-2.6-6.4" />
              <path d="M21 3v5h-5" />
            </svg>
            Reset
          </button>
        </div>

        {/* COMPANIES SECTION */}
        <section className="csec">
          <div className="chead">
            <div>
              <h2>Top Companies &amp; Your Skill Gaps</h2>
              <div className="csub">
                {isLiveLoaded ? 'Real-time verified companies and live job counts from active scraping feeds.' : 'Explore companies and see what skills you need to strengthen to get hired.'}
              </div>
            </div>
            <div className="cright">
              <span className="showing">Showing {filteredCompanies.length} companies</span>
              <div
                className="sort"
                onClick={() => setSortBy((prev) => (prev === 'highest_gap' ? 'highest_match' : 'highest_gap'))}
                title="Click to toggle sorting"
              >
                <span className="sl">Sort by:</span>
                <b>{sortBy === 'highest_gap' ? 'Highest Gap' : sortBy === 'highest_match' ? 'Highest Match' : 'Most Openings'}</b>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#8a8fa8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </div>
            </div>
          </div>

          <div className="clist">
            {filteredCompanies.map((c) => {
              const isSelected = selectedCompanyId === c.id;
              const ringBackground = `conic-gradient(#22c55e 0 ${c.matchPct}%, #d3f2dc ${c.matchPct}% 100%)`;

              return (
                <div
                  key={c.id}
                  className={`crow ${isSelected ? 'sel' : ''}`}
                  onClick={() => setSelectedCompanyId(c.id)}
                >
                  <div className="clogo" style={c.logoStyle || {}}>
                    {renderCompanyLogo(c, 28)}
                  </div>
                  <div className="cinfo">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <b>{c.name}</b>
                      {c.openJobsCount ? (
                        <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 7px', borderRadius: 10, background: '#dcfce7', color: '#15803d' }}>
                          ● {c.openJobsCount} Open Jobs
                        </span>
                      ) : null}
                    </div>
                    <div className="cs">{c.industry}</div>
                    <div className="sal">
                      Avg. Salary: <b>{c.salary}</b>
                    </div>
                  </div>
                  <div className="mstat">
                    <div className="ring" style={{ background: ringBackground }}>
                      <span className="n">{c.matchPct}</span>
                    </div>
                    <div className="ms">
                      <div className="pct">
                        {c.matchPct}
                        <sup>%</sup>
                      </div>
                      <div className="cap">Skill Match</div>
                    </div>
                  </div>
                  <div className="mstat">
                    <div className="gc">{c.gapPct}</div>
                    <div className="ms">
                      <div className="pct" style={{ color: '#db2777' }}>
                        {c.gapPct}
                        <sup>%</sup>
                      </div>
                      <div className="cap">Skill Gap</div>
                    </div>
                  </div>
                  <div className="msk">
                    <h5>Top Missing Skills</h5>
                    <div className="sk">
                      {(c.missingSkills || []).slice(0, 3).map((sk) => (
                        <span key={sk}>{sk}</span>
                      ))}
                      {(c.missingSkills || []).length > 3 && (
                        <span className="more">+{(c.missingSkills || []).length - 3} more</span>
                      )}
                    </div>
                  </div>
                  <svg
                    className="chev"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m9 6 6 6-6 6" />
                  </svg>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* ===== RIGHT RAIL ===== */}
      <aside className="rail">
        {/* Selected Company Header Card */}
        <div className="card rc">
          <div className="gh">
            <div className="gl" style={selectedCompany.logoStyle || {}}>
              {renderCompanyLogo(selectedCompany, 32)}
            </div>
            <div>
              <b>{selectedCompany.name}</b>
              <small>
                {selectedCompany.industry}
                {selectedCompany.openJobsCount ? ` • ${selectedCompany.openJobsCount} Openings` : ''}
              </small>
            </div>
            {selectedCompany.topPick && <span className="toppick">Top Pick</span>}
            <button
              className="vjobs"
              onClick={() => handleViewJobs(selectedCompany.name)}
            >
              View Jobs
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12h15M13 6l6 6-6 6" />
              </svg>
            </button>
          </div>
        </div>

        {/* Your Skill Match Gauge */}
        <div className="hcard">
          <div className="hcard-head">
            <b>Your Skill Match</b>
            <button className="mini" title="Collapse">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M5 12h14" />
              </svg>
            </button>
          </div>
          <div className="sm">
            <div
              className="sgd"
              style={{
                background: `conic-gradient(var(--green) 0 ${selectedCompany.matchPct}%, #e9edf5 ${selectedCompany.matchPct}% 100%)`,
              }}
            >
              <span className="pct">{selectedCompany.matchPct}%</span>
            </div>
            <div className="sm-txt">
              <div className="row">
                <span>Skills Matched</span>
                <b className="g">
                  {selectedCompany.matchedCount} / {selectedCompany.totalSkills}
                </b>
              </div>
              <div className="row" style={{ marginTop: 6 }}>
                <span>Skills Missing</span>
                <b className="r">
                  {selectedCompany.missingCount} / {selectedCompany.totalSkills}
                </b>
              </div>
            </div>
          </div>
        </div>

        {/* Key Skills You Need to Learn */}
        <div className="keycard">
          <div className="keyhead">
            <h3>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#f43f5e">
                <path d="M12 2l1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8zM19 14l.9 2.6 2.6.9-2.6.9L19 21l-.9-2.6-2.6-.9 2.6-.9z" />
              </svg>
              Key Skills You Need to Learn
            </h3>
            <span
              className="link"
              style={{ color: 'var(--primary)', fontWeight: 600, fontSize: '11.5px', cursor: 'pointer' }}
              onClick={handleExploreLearning}
            >
              View All
            </span>
          </div>
          <div className="kchips">
            {(selectedCompany.keySkillsToLearn || []).map((k) => (
              <span key={k.name} className="kchip">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={k.color} strokeWidth="1.8" strokeLinecap="round">
                  {k.icon === 'target' && (
                    <>
                      <circle cx="12" cy="12" r="8.5" />
                      <circle cx="12" cy="12" r="4" />
                    </>
                  )}
                  {k.icon === 'box' && (
                    <>
                      <rect x="3" y="4" width="18" height="16" rx="3" />
                      <path d="M3 10h18" />
                    </>
                  )}
                  {k.icon === 'code' && (
                    <>
                      <path d="M9 3h6M9 21h6M10 3c0 5-4 6-4 10a6 6 0 0 0 12 0c0-4-4-5-4-10" />
                    </>
                  )}
                  {k.icon === 'shield' && (
                    <>
                      <path d="M21 16V8l-9-5-9 5v8l9 5z" />
                      <circle cx="12" cy="12" r="2.5" />
                    </>
                  )}
                  {k.icon === 'globe' && (
                    <>
                      <circle cx="12" cy="12" r="8.5" />
                      <path d="M3 12h18M12 3c3 3.5 3 14 0 18M12 3c-3 3.5-3 14 0 18" />
                    </>
                  )}
                  {k.icon === 'sparkle' && (
                    <>
                      <circle cx="12" cy="12" r="8.5" />
                      <path d="M12 3v18M8 7l8 10" />
                    </>
                  )}
                </svg>
                {k.name}
              </span>
            ))}
          </div>
        </div>

        {/* Skill Gap by Category */}
        <div className="card rc cats">
          <h3>Skill Gap by Category</h3>
          {(selectedCompany.categories || []).map((cat) => (
            <div key={cat.name} className="cat">
              <div className="t">
                <span>{cat.name}</span>
                <span>{cat.pct}%</span>
              </div>
              {cat.delta && <div className="delta">{cat.delta}</div>}
              <div className="track">
                <i style={{ width: `${cat.pct}%`, background: cat.gradient }} />
              </div>
            </div>
          ))}
        </div>

        {/* Personalized Learning Path */}
        <div className="lpath">
          <div className="lhead">
            <span className="ic">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5.5C10 3.8 7.3 3 4 3v15c3.3 0 6 .8 8 2.5 2-1.7 4.7-2.5 8-2.5V3c-3.3 0-6 .8-8 2.5z" />
                <path d="M12 5.5V20" />
              </svg>
            </span>
            <b>Personalized Learning Path</b>
          </div>
          <p>Get a step-by-step plan to bridge your skill gaps and match your target company.</p>
          <button className="vlp" onClick={handleExploreLearning}>
            View Learning Path
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12h15M13 6l6 6-6 6" />
            </svg>
          </button>
        </div>
      </aside>
    </div>
  );
}

export default SkillGapExact;
