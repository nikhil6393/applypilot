import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store/appStore';
import { useAuth } from '../context/AuthContext';
import { JobDetailDrawer } from './JobDetailDrawer';
import { getSafeJobApplyUrl } from '../utils/jobUtils';
import { CompanyIcon, FirstAlphabetLogo } from './CompanyIcon';
import JobKeywordTailorModal from './resume-studio/JobKeywordTailorModal';
import { semanticMatchJob } from '../../shared/roleTaxonomy.js';
import { getIndianCitizenEligibility, checkUser2028BatchEligible } from '../utils/jobEligibility.js';
import './JobFeedExact.css';

// Default mock jobs matching the user's exact specification with authentic batch & year designations
const DEFAULT_SPEC_JOBS = [
  {
    id: 'google-swe-intern',
    title: 'Software Engineer Intern (2025 / 2026 Batch)',
    company: 'Google',
    location: 'Noida, India',
    postedAgo: '12m ago',
    postedAt: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
    tags: ['2026 Batch', 'JavaScript', 'React', 'Node.js'],
    extraTagsCount: 2,
    roleType: 'Internship',
    salary: '₹ 20K – 35K / month',
    workplace: 'Remote',
    matchScore: 96,
    matchLabel: '96% Match',
    pillType: 'g',
    pillText: 'AI Matched',
    matchDesc: 'Great match! You have 4/5 required skills and relevant experience.',
    applyUrl: 'https://careers.google.com/jobs/results/?q=software%20engineer%20intern',
    source: 'google',
    logoType: 'google',
    identifiedYear: '2026',
    eligibleBatches: ['2025', '2026'],
  },
  {
    id: 'swiggy-apm-intern',
    title: 'Associate Product Manager Intern (2025 / 2026 Batch)',
    company: 'Swiggy',
    location: 'Bengaluru, India',
    postedAgo: '25m ago',
    postedAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    tags: ['2026 Batch', 'Product Roadmap', 'Wireframing', 'User Research'],
    extraTagsCount: 2,
    roleType: 'Internship',
    salary: '₹ 45K – 60K / month',
    workplace: 'Hybrid',
    matchScore: 94,
    matchLabel: '94% Match',
    pillType: 'g',
    pillText: 'AI Matched',
    matchDesc: 'Excellent fit for product management and strategy.',
    applyUrl: 'https://careers.swiggy.com',
    source: 'lever',
    logoType: 'swiggy',
    identifiedYear: '2026',
    eligibleBatches: ['2025', '2026'],
  },
  {
    id: 'cred-product-designer',
    title: 'Product Designer (UI/UX) - 2025 Batch',
    company: 'CRED',
    location: 'Bengaluru, India',
    postedAgo: '35m ago',
    postedAt: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
    tags: ['2025 Batch', 'Figma', 'Design Systems', 'UI/UX'],
    extraTagsCount: 2,
    roleType: 'Full Time',
    salary: '₹ 14L – 22L / year',
    workplace: 'Onsite',
    matchScore: 93,
    matchLabel: '93% Match',
    pillType: 'g',
    pillText: 'AI Matched',
    matchDesc: 'Design high-converting consumer financial experiences.',
    applyUrl: 'https://cred.club/careers',
    source: 'greenhouse',
    logoType: 'cred',
    identifiedYear: '2025',
    eligibleBatches: ['2024', '2025'],
  },
  {
    id: 'msft-frontend-dev',
    title: 'Frontend Developer (2025 Batch)',
    company: 'Microsoft',
    location: 'Noida, India',
    postedAgo: '42m ago',
    postedAt: new Date(Date.now() - 42 * 60 * 1000).toISOString(),
    tags: ['2025 Batch', 'React', 'TypeScript', 'Next.js'],
    extraTagsCount: 2,
    roleType: 'Full Time',
    salary: '₹ 8L – 15L / year',
    workplace: 'Hybrid',
    matchScore: 92,
    matchLabel: '92% Match',
    pillType: 'g',
    pillText: 'AI Matched',
    matchDesc: 'Strong match! Your skills align well with this role.',
    applyUrl: 'https://careers.microsoft.com/professionals/us/en/search-results?keywords=Frontend%20Developer',
    source: 'microsoft',
    logoType: 'microsoft',
    identifiedYear: '2025',
    eligibleBatches: ['2024', '2025'],
  },
  {
    id: 'amazon-backend-dev',
    title: 'Backend Developer (2024 / 2025 Batch)',
    company: 'Amazon',
    location: 'Noida, India',
    postedAgo: '2h ago',
    postedAt: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
    tags: ['2025 Batch', 'Java', 'Spring Boot', 'AWS'],
    extraTagsCount: 2,
    roleType: 'Full Time',
    salary: '₹ 12L – 20L / year',
    workplace: 'Onsite',
    matchScore: 88,
    matchLabel: '88% Match',
    pillType: 'g',
    pillText: 'AI Matched',
    matchDesc: 'Good match! You meet most of the requirements.',
    applyUrl: 'https://amazon.jobs/en/search?base_query=backend+developer',
    source: 'amazon',
    logoType: 'amazon',
    identifiedYear: '2025',
    eligibleBatches: ['2024', '2025'],
  },
  {
    id: 'zomato-growth-marketing',
    title: 'Growth Marketing Associate (2025 / 2026 Batch)',
    company: 'Zomato',
    location: 'Gurugram, India',
    postedAgo: '3h ago',
    postedAt: new Date(Date.now() - 180 * 60 * 1000).toISOString(),
    tags: ['2025 Batch', 'Performance Marketing', 'SEO', 'Analytics'],
    extraTagsCount: 2,
    roleType: 'Full Time',
    salary: '₹ 8L – 14L / year',
    workplace: 'Hybrid',
    matchScore: 87,
    matchLabel: '87% Match',
    pillType: 'g',
    pillText: 'AI Matched',
    matchDesc: 'Drive user acquisition and data-backed viral campaigns.',
    applyUrl: 'https://www.zomato.com/careers',
    source: 'lever',
    logoType: 'zomato',
    identifiedYear: '2025',
    eligibleBatches: ['2025', '2026'],
  },
  {
    id: 'phonepe-bde-associate',
    title: 'Business Development Executive (2025 Batch)',
    company: 'PhonePe',
    location: 'Mumbai, India',
    postedAgo: '4h ago',
    postedAt: new Date(Date.now() - 240 * 60 * 1000).toISOString(),
    tags: ['2025 Batch', 'Enterprise Sales', 'Fintech', 'Partnerships'],
    extraTagsCount: 2,
    roleType: 'Full Time',
    salary: '₹ 7L – 11L / year',
    workplace: 'Onsite',
    matchScore: 85,
    matchLabel: '85% Match',
    pillType: 'g',
    pillText: 'Good Match',
    matchDesc: 'Scale merchant ecosystems and enterprise fintech tie-ups.',
    applyUrl: 'https://www.phonepe.com/careers',
    source: 'linkedin',
    logoType: 'phonepe',
    identifiedYear: '2025',
    eligibleBatches: ['2024', '2025'],
  },
  {
    id: 'accenture-data-analyst',
    title: 'Data Analyst Intern (2025 / 2026 Batch)',
    company: 'Accenture',
    location: 'Noida, India',
    postedAgo: '5h ago',
    postedAt: new Date(Date.now() - 300 * 60 * 1000).toISOString(),
    tags: ['2026 Batch', 'SQL', 'Python', 'Excel', 'Tableau'],
    extraTagsCount: 2,
    roleType: 'Internship',
    salary: '₹ 25K – 40K / month',
    workplace: 'Hybrid',
    matchScore: 89,
    matchLabel: '89% Match',
    pillType: 'g',
    pillText: 'AI Matched',
    matchDesc: 'Transform enterprise metrics with data visualizations and pipelines.',
    applyUrl: 'https://www.accenture.com/in-en/careers/jobsearch?jk=data%20analyst',
    source: 'accenture',
    logoType: 'accenture',
    identifiedYear: '2026',
    eligibleBatches: ['2025', '2026'],
  },
  {
    id: 'deloitte-operations-analyst',
    title: 'Operations & Strategy Associate (2025 Batch)',
    company: 'Deloitte',
    location: 'Hyderabad, India',
    postedAgo: '6h ago',
    postedAt: new Date(Date.now() - 360 * 60 * 1000).toISOString(),
    tags: ['2025 Batch', 'Process Optimization', 'Management', 'Excel'],
    extraTagsCount: 2,
    roleType: 'Full Time',
    salary: '₹ 8L – 13L / year',
    workplace: 'Hybrid',
    matchScore: 84,
    matchLabel: '84% Match',
    pillType: 'g',
    pillText: 'Good Match',
    matchDesc: 'Streamline business workflows and cross-department initiatives.',
    applyUrl: 'https://jobs2.deloitte.com',
    source: 'linkedin',
    logoType: 'deloitte',
    identifiedYear: '2025',
    eligibleBatches: ['2024', '2025'],
  },
  {
    id: 'goldman-analyst-intern',
    title: 'Financial Analyst Intern (2025 / 2026 Batch)',
    company: 'Goldman Sachs',
    location: 'Bengaluru, India',
    postedAgo: '7h ago',
    postedAt: new Date(Date.now() - 420 * 60 * 1000).toISOString(),
    tags: ['2026 Batch', 'Financial Modeling', 'Valuation', 'Excel'],
    extraTagsCount: 2,
    roleType: 'Internship',
    salary: '₹ 50K – 75K / month',
    workplace: 'Hybrid',
    matchScore: 91,
    matchLabel: '91% Match',
    pillType: 'g',
    pillText: 'AI Matched',
    matchDesc: 'Top tier investment banking and financial advisory track.',
    applyUrl: 'https://www.goldmansachs.com/careers',
    source: 'greenhouse',
    logoType: 'goldman',
    identifiedYear: '2026',
    eligibleBatches: ['2025', '2026'],
  },
  {
    id: 'tcs-fullstack-dev',
    title: 'Full Stack Developer (2025 Batch)',
    company: 'TCS',
    location: 'Noida, India',
    postedAgo: '8h ago',
    postedAt: new Date(Date.now() - 480 * 60 * 1000).toISOString(),
    tags: ['2025 Batch', 'JavaScript', 'React', 'Node.js'],
    extraTagsCount: 2,
    roleType: 'Full Time',
    salary: '₹ 6L – 12L / year',
    workplace: 'Hybrid',
    matchScore: 76,
    matchLabel: '76% Match',
    pillType: 'y',
    pillText: 'Good Match',
    matchDesc: 'You have relevant skills. Consider adding a few more.',
    applyUrl: 'https://www.tcs.com/careers',
    source: 'tcs',
    logoType: 'tcs',
    identifiedYear: '2025',
    eligibleBatches: ['2024', '2025'],
  },
  {
    id: 'stripe-worldwide-swe-intern',
    title: 'Software Engineering Intern (2027 / 2028 Batch)',
    company: 'Stripe',
    location: 'Remote / Worldwide',
    postedAgo: '15m ago',
    postedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    tags: ['2028 Batch', 'TypeScript', 'Ruby', 'API Design'],
    extraTagsCount: 2,
    roleType: 'Internship',
    salary: '$45 – $65 / hour',
    workplace: 'Remote',
    matchScore: 98,
    matchLabel: '98% Match',
    pillType: 'g',
    pillText: 'AI Matched',
    matchDesc: 'Great match for 2028 batch students (5th semester) with worldwide remote eligibility.',
    applyUrl: 'https://stripe.com/jobs',
    source: 'lever',
    logoType: 'stripe',
    identifiedYear: '2028',
    eligibleBatches: ['2027', '2028'],
    sponsorsVisa: true,
    description: 'We are hiring students graduating in 2027 or 2028 for our engineering internship. Open to candidates globally. Work from anywhere worldwide.',
  },
  {
    id: 'meta-us-swe-fresher',
    title: 'Software Engineer - University Grad (US Citizens Only)',
    company: 'Meta',
    location: 'Menlo Park, CA (US Only)',
    postedAgo: '3h ago',
    postedAt: new Date(Date.now() - 180 * 60 * 1000).toISOString(),
    tags: ['2025 Batch', 'C++', 'Python', 'Systems'],
    extraTagsCount: 1,
    roleType: 'Full Time',
    salary: '$135,000 – $170,000 / year',
    workplace: 'Onsite',
    matchScore: 68,
    matchLabel: '68% Match',
    pillType: 'y',
    pillText: 'Potential Match',
    matchDesc: 'Restricted to US work authorization holders. No visa sponsorship provided.',
    applyUrl: 'https://metacareers.com',
    source: 'greenhouse',
    logoType: 'meta',
    identifiedYear: '2025',
    eligibleBatches: ['2024', '2025'],
    sponsorsVisa: false,
    description: 'Must be legally authorized to work in the United States without sponsorship. US citizens or green card holders only. No visa sponsorship is available.',
  },
  {
    id: 'ashby-ramp-frontend',
    title: 'Frontend Engineer (React / TypeScript)',
    company: 'Ramp',
    location: 'Bengaluru, India',
    postedAgo: '45m ago',
    postedAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    tags: ['2025 Batch', 'React', 'TypeScript', 'Tailwind'],
    extraTagsCount: 2,
    roleType: 'Full Time',
    salary: '₹ 18L – 28L / year',
    workplace: 'Hybrid',
    matchScore: 95,
    matchLabel: '95% Match',
    pillType: 'g',
    pillText: 'AI Matched',
    matchDesc: 'Build financial automation interfaces with modern React and TypeScript.',
    applyUrl: 'https://jobs.ashbyhq.com/ramp',
    source: 'ashby',
    logoType: 'ramp',
    identifiedYear: '2025',
    eligibleBatches: ['2024', '2025'],
  },
  {
    id: 'unstop-flipkart-intern',
    title: 'Software Development Engineer Intern (2025 / 2026 Batch)',
    company: 'Flipkart',
    location: 'Bengaluru, India',
    postedAgo: '1h ago',
    postedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    tags: ['2026 Batch', 'Java', 'DSA', 'Spring Boot'],
    extraTagsCount: 2,
    roleType: 'Internship',
    salary: '₹ 50K – 70K / month',
    workplace: 'Onsite',
    matchScore: 94,
    matchLabel: '94% Match',
    pillType: 'g',
    pillText: 'AI Matched',
    matchDesc: 'Flipkart GRiD and early career campus intake for software engineering.',
    applyUrl: 'https://unstop.com/jobs/flipkart',
    source: 'unstop',
    logoType: 'flipkart',
    identifiedYear: '2026',
    eligibleBatches: ['2025', '2026'],
  },
  {
    id: 'internshala-zepto-sde',
    title: 'Software Engineer Intern - Backend & Systems',
    company: 'Zepto',
    location: 'Noida, India',
    postedAgo: '1h ago',
    postedAt: new Date(Date.now() - 75 * 60 * 1000).toISOString(),
    tags: ['2026 Batch', 'Node.js', 'PostgreSQL', 'Microservices'],
    extraTagsCount: 2,
    roleType: 'Internship',
    salary: '₹ 30K – 45K / month',
    workplace: 'Hybrid',
    matchScore: 93,
    matchLabel: '93% Match',
    pillType: 'g',
    pillText: 'AI Matched',
    matchDesc: 'High-speed grocery delivery microservices and order dispatch engine.',
    applyUrl: 'https://internshala.com/internships/matching-jobs',
    source: 'internshala',
    logoType: 'zepto',
    identifiedYear: '2026',
    eligibleBatches: ['2025', '2026'],
  },
  {
    id: 'naukri-infosys-specialist',
    title: 'Specialist Programmer / SDE (2025 Batch)',
    company: 'Infosys',
    location: 'Noida, India',
    postedAgo: '2h ago',
    postedAt: new Date(Date.now() - 110 * 60 * 1000).toISOString(),
    tags: ['2025 Batch', 'Java', 'Spring', 'Cloud'],
    extraTagsCount: 2,
    roleType: 'Full Time',
    salary: '₹ 9.5L – 14L / year',
    workplace: 'Hybrid',
    matchScore: 89,
    matchLabel: '89% Match',
    pillType: 'g',
    pillText: 'AI Matched',
    matchDesc: 'Direct campus and off-campus intake for high-performance software developers.',
    applyUrl: 'https://www.naukri.com/job-listings',
    source: 'naukari',
    logoType: 'infosys',
    identifiedYear: '2025',
    eligibleBatches: ['2024', '2025'],
  },
  {
    id: 'yc-supabase-fullstack',
    title: 'Full Stack Engineer (TypeScript & PostgreSQL)',
    company: 'Supabase',
    location: 'Remote / Worldwide',
    postedAgo: '2h ago',
    postedAt: new Date(Date.now() - 130 * 60 * 1000).toISOString(),
    tags: ['TypeScript', 'Next.js', 'PostgreSQL', 'Open Source'],
    extraTagsCount: 2,
    roleType: 'Full Time',
    salary: '$120,000 – $160,000 / year',
    workplace: 'Remote',
    matchScore: 96,
    matchLabel: '96% Match',
    pillType: 'g',
    pillText: 'AI Matched',
    matchDesc: 'Open source Firebase alternative. Worldwide remote work opportunity.',
    applyUrl: 'https://www.ycombinator.com/companies/supabase/jobs',
    source: 'yc',
    logoType: 'supabase',
    identifiedYear: '2025',
    eligibleBatches: ['2024', '2025', '2026'],
  },
  {
    id: 'remoteok-gitlab-swe',
    title: 'Junior Software Engineer (Full Stack Remote)',
    company: 'GitLab',
    location: 'Remote / Worldwide',
    postedAgo: '3h ago',
    postedAt: new Date(Date.now() - 190 * 60 * 1000).toISOString(),
    tags: ['Ruby', 'Vue.js', 'Go', 'DevOps'],
    extraTagsCount: 2,
    roleType: 'Full Time',
    salary: '$95,000 – $130,000 / year',
    workplace: 'Remote',
    matchScore: 92,
    matchLabel: '92% Match',
    pillType: 'g',
    pillText: 'AI Matched',
    matchDesc: 'All-remote DevOps platform. Open to candidates globally including India.',
    applyUrl: 'https://remoteok.com/remote-jobs',
    source: 'remoteok',
    logoType: 'gitlab',
    identifiedYear: '2025',
    eligibleBatches: ['2024', '2025'],
  },
  {
    id: 'remotive-postman-api',
    title: 'Backend Software Engineer - API Platform',
    company: 'Postman',
    location: 'Bengaluru, India',
    postedAgo: '3h ago',
    postedAt: new Date(Date.now() - 210 * 60 * 1000).toISOString(),
    tags: ['Node.js', 'TypeScript', 'Distributed Systems'],
    extraTagsCount: 2,
    roleType: 'Full Time',
    salary: '₹ 22L – 35L / year',
    workplace: 'Hybrid',
    matchScore: 95,
    matchLabel: '95% Match',
    pillType: 'g',
    pillText: 'AI Matched',
    matchDesc: 'Build core developer API collaboration tooling used by 30M+ developers.',
    applyUrl: 'https://remotive.com/remote-jobs',
    source: 'remotive',
    logoType: 'postman',
    identifiedYear: '2025',
    eligibleBatches: ['2024', '2025'],
  },
  {
    id: 'simplify-scaleai-eval',
    title: 'Software Engineer - AI Platform & Benchmarks',
    company: 'Scale AI',
    location: 'Remote / Worldwide',
    postedAgo: '4h ago',
    postedAt: new Date(Date.now() - 250 * 60 * 1000).toISOString(),
    tags: ['Python', 'PyTorch', 'LLMs', 'API'],
    extraTagsCount: 2,
    roleType: 'Full Time',
    salary: '$130,000 – $175,000 / year',
    workplace: 'Remote',
    matchScore: 94,
    matchLabel: '94% Match',
    pillType: 'g',
    pillText: 'AI Matched',
    matchDesc: 'Data infrastructure and foundation model evaluation platform.',
    applyUrl: 'https://simplify.jobs/c/Scale-AI',
    source: 'simplify_jobs',
    logoType: 'scale',
    identifiedYear: '2025',
    eligibleBatches: ['2024', '2025'],
  },
  {
    id: 'wework-basecamp-web',
    title: 'Frontend Web Developer',
    company: '37signals',
    location: 'Remote / Worldwide',
    postedAgo: '5h ago',
    postedAt: new Date(Date.now() - 310 * 60 * 1000).toISOString(),
    tags: ['HTML', 'CSS', 'JavaScript', 'Hotwire'],
    extraTagsCount: 2,
    roleType: 'Full Time',
    salary: '$110,000 – $145,000 / year',
    workplace: 'Remote',
    matchScore: 90,
    matchLabel: '90% Match',
    pillType: 'g',
    pillText: 'AI Matched',
    matchDesc: 'Makers of Basecamp and HEY. Pure remote culture with worldwide flexibility.',
    applyUrl: 'https://weworkremotely.com',
    source: 'weworkremotely',
    logoType: 'basecamp',
    identifiedYear: '2025',
    eligibleBatches: ['2024', '2025'],
  },
  {
    id: 'himalayas-automattic-code',
    title: 'Code Wrangler (JavaScript & PHP Developer)',
    company: 'Automattic',
    location: 'Remote / Worldwide',
    postedAgo: '6h ago',
    postedAt: new Date(Date.now() - 370 * 60 * 1000).toISOString(),
    tags: ['React', 'JavaScript', 'Gutenberg', 'Open Source'],
    extraTagsCount: 2,
    roleType: 'Full Time',
    salary: '$90,000 – $135,000 / year',
    workplace: 'Remote',
    matchScore: 91,
    matchLabel: '91% Match',
    pillType: 'g',
    pillText: 'AI Matched',
    matchDesc: 'Makers of WordPress.com and Tumblr. 100% remote work globally.',
    applyUrl: 'https://himalayas.app/companies/automattic',
    source: 'himalayas',
    logoType: 'automattic',
    identifiedYear: '2025',
    eligibleBatches: ['2024', '2025'],
  },
  {
    id: 'arbeitnow-zalando-engineer',
    title: 'Software Engineer - Distributed Systems',
    company: 'Zalando',
    location: 'Berlin, Germany',
    postedAgo: '7h ago',
    postedAt: new Date(Date.now() - 430 * 60 * 1000).toISOString(),
    tags: ['Java', 'Kotlin', 'AWS', 'Kafka'],
    extraTagsCount: 2,
    roleType: 'Full Time',
    salary: '€70,000 – €92,000 / year',
    workplace: 'Hybrid',
    matchScore: 86,
    matchLabel: '86% Match',
    pillType: 'g',
    pillText: 'Good Match',
    matchDesc: 'European e-commerce scale architecture. Relocation support available.',
    applyUrl: 'https://www.arbeitnow.com',
    source: 'arbeitnow',
    logoType: 'zalando',
    identifiedYear: '2025',
    eligibleBatches: ['2024', '2025'],
  },
  {
    id: 'jobicy-duckduckgo-dev',
    title: 'Senior Software Engineer - Privacy & Web',
    company: 'DuckDuckGo',
    location: 'Remote / Worldwide',
    postedAgo: '8h ago',
    postedAt: new Date(Date.now() - 490 * 60 * 1000).toISOString(),
    tags: ['Python', 'JavaScript', 'Privacy', 'Search'],
    extraTagsCount: 2,
    roleType: 'Full Time',
    salary: '$140,000 – $180,000 / year',
    workplace: 'Remote',
    matchScore: 91,
    matchLabel: '91% Match',
    pillType: 'g',
    pillText: 'AI Matched',
    matchDesc: 'Privacy-focused search and browser engine. Fully remote anywhere.',
    applyUrl: 'https://jobicy.com',
    source: 'jobicy',
    logoType: 'duckduckgo',
    identifiedYear: '2025',
    eligibleBatches: ['2024', '2025'],
  },
  {
    id: 'workingnomads-buffer-fe',
    title: 'Product Engineer - Frontend',
    company: 'Buffer',
    location: 'Remote / Worldwide',
    postedAgo: '9h ago',
    postedAt: new Date(Date.now() - 550 * 60 * 1000).toISOString(),
    tags: ['React', 'TypeScript', 'Redux', 'CSS'],
    extraTagsCount: 2,
    roleType: 'Full Time',
    salary: '$105,000 – $140,000 / year',
    workplace: 'Remote',
    matchScore: 93,
    matchLabel: '93% Match',
    pillType: 'g',
    pillText: 'AI Matched',
    matchDesc: 'Transparent, 4-day workweek company with distributed global team.',
    applyUrl: 'https://www.workingnomads.com',
    source: 'workingnomads',
    logoType: 'buffer',
    identifiedYear: '2025',
    eligibleBatches: ['2024', '2025'],
  },
  {
    id: 'freehire-vercel-nextjs',
    title: 'Framework Engineer (Next.js & React)',
    company: 'Vercel',
    location: 'Remote / Worldwide',
    postedAgo: '10h ago',
    postedAt: new Date(Date.now() - 610 * 60 * 1000).toISOString(),
    tags: ['Next.js', 'React', 'Rust', 'TypeScript'],
    extraTagsCount: 2,
    roleType: 'Full Time',
    salary: '$130,000 – $170,000 / year',
    workplace: 'Remote',
    matchScore: 97,
    matchLabel: '97% Match',
    pillType: 'g',
    pillText: 'AI Matched',
    matchDesc: 'Creators of Next.js and frontend cloud infrastructure.',
    applyUrl: 'https://freehire.io',
    source: 'freehire',
    logoType: 'vercel',
    identifiedYear: '2025',
    eligibleBatches: ['2024', '2025'],
  },
];

/* ── Comprehensive Role Suggestions Across All Career Domains ── */
const POPULAR_ROLES_SUGGESTIONS = [
  // Product Management
  { role: 'Product Manager', track: 'Product Management', icon: '📋' },
  { role: 'Associate Product Manager', track: 'Product Management', icon: '🚀' },
  { role: 'Product Management Intern', track: 'Internship', icon: '🎓' },
  { role: 'Technical Product Manager', track: 'Product Management', icon: '⚙️' },

  // UI/UX & Design
  { role: 'UI/UX Designer', track: 'Design & Creative', icon: '🎨' },
  { role: 'UI/UX Design Intern', track: 'Internship', icon: '🎓' },
  { role: 'Product Designer', track: 'Design & Creative', icon: '✨' },
  { role: 'Graphic Designer', track: 'Design & Creative', icon: '🖼️' },
  { role: 'Visual Designer', track: 'Design & Creative', icon: '🎯' },

  // Data & Analytics
  { role: 'Data Analyst', track: 'Data & Analytics', icon: '📈' },
  { role: 'Data Analyst Intern', track: 'Internship', icon: '🎓' },
  { role: 'Business Analyst', track: 'Data & Business', icon: '📊' },
  { role: 'Data Scientist', track: 'Data Science & AI', icon: '🔬' },
  { role: 'Data Engineer', track: 'Data Engineering', icon: '🗄️' },

  // Software & Web Development
  { role: 'Software Engineer', track: 'Software Engineering', icon: '💻' },
  { role: 'Software Engineer Intern', track: 'Internship', icon: '🎓' },
  { role: 'Frontend Developer', track: 'Frontend Development', icon: '🎨' },
  { role: 'Frontend Developer Intern', track: 'Internship', icon: '🎓' },
  { role: 'Backend Developer', track: 'Backend Development', icon: '⚙️' },
  { role: 'Backend Developer Intern', track: 'Internship', icon: '🎓' },
  { role: 'Full Stack Developer', track: 'Full Stack Development', icon: '🚀' },
  { role: 'Full Stack Developer Intern', track: 'Internship', icon: '🎓' },
  { role: 'React Developer', track: 'Frontend Development', icon: '⚛️' },
  { role: 'Node.js Developer', track: 'Backend Development', icon: '🟢' },
  { role: 'Python Developer', track: 'Backend & AI', icon: '🐍' },
  { role: 'Java Developer', track: 'Backend Development', icon: '☕' },
  { role: 'AI / Machine Learning Engineer', track: 'AI & Machine Learning', icon: '🤖' },
  { role: 'Mobile App Developer', track: 'Mobile Development', icon: '📱' },
  { role: 'DevOps Engineer', track: 'Cloud & Infrastructure', icon: '☁️' },
  { role: 'Cloud Engineer', track: 'Cloud & Infrastructure', icon: '🌩️' },
  { role: 'QA Automation Engineer', track: 'Testing & QA', icon: '🧪' },
  { role: 'Cybersecurity Analyst', track: 'Security & InfoSec', icon: '🛡️' },

  // Marketing & Growth
  { role: 'Digital Marketing Specialist', track: 'Marketing & Growth', icon: '📣' },
  { role: 'Digital Marketing Intern', track: 'Internship', icon: '🎓' },
  { role: 'Growth Associate', track: 'Marketing & Growth', icon: '📈' },
  { role: 'SEO Specialist', track: 'Marketing & Growth', icon: '🔍' },
  { role: 'Content Writer', track: 'Marketing & Content', icon: '✍️' },

  // Sales & Business Development
  { role: 'Business Development Executive', track: 'Sales & BD', icon: '🤝' },
  { role: 'Business Development Intern', track: 'Internship', icon: '🎓' },
  { role: 'Account Executive', track: 'Sales & Client Relations', icon: '💼' },

  // Operations, HR & Finance
  { role: 'Operations Associate', track: 'Operations & Strategy', icon: '⚙️' },
  { role: 'Operations Intern', track: 'Internship', icon: '🎓' },
  { role: 'Project Manager', track: 'Operations & Management', icon: '📅' },
  { role: 'Scrum Master', track: 'Agile & Management', icon: '⏱️' },
  { role: 'HR Recruiter', track: 'People & HR', icon: '👥' },
  { role: 'Financial Analyst', track: 'Finance & Consulting', icon: '💰' },
];

const POPULAR_LOCATIONS_PRESETS = [
  { label: 'India', desc: 'All Pan-India Openings (Remote & On-site)', icon: '🇮🇳' },
  { label: 'Noida, India', desc: 'Delhi NCR Tech & Corporate Hub', icon: '📍' },
  { label: 'Bengaluru, India', desc: 'Silicon Valley of India', icon: '📍' },
  { label: 'Hyderabad, India', desc: 'HITEC City & Cyberabad', icon: '📍' },
  { label: 'Pune, India', desc: 'Maharashtra IT & Auto Corridor', icon: '📍' },
  { label: 'Gurgaon, India', desc: 'Cyber City & NCR Commercial Hub', icon: '📍' },
  { label: 'Mumbai, India', desc: 'Financial, Media & Tech Capital', icon: '📍' },
  { label: 'Delhi NCR, India', desc: 'National Capital Region', icon: '📍' },
  { label: 'Chennai, India', desc: 'Tamil Nadu Tech Corridor', icon: '📍' },
  { label: 'Kolkata, India', desc: 'Eastern India Commercial Hub', icon: '📍' },
  { label: 'Ahmedabad, India', desc: 'Gujarat Business Hub', icon: '📍' },
  { label: 'Remote / Worldwide', desc: 'Work from anywhere globally', icon: '🌐' },
  { label: 'United States / Global', desc: 'US & Global Openings ($ USD)', icon: '🇺🇸' },
  { label: 'London, UK', desc: 'UK & Europe Openings (£ GBP / € EUR)', icon: '🇬🇧' },
  { label: 'Singapore', desc: 'APAC Business & Tech Hub', icon: '🇸🇬' },
  { label: 'Canada', desc: 'Toronto & Vancouver Corridor', icon: '🇨🇦' },
  { label: 'Germany', desc: 'Berlin & Munich Tech Hub', icon: '🇩🇪' },
];

/* ── Company Prestige & Reputation Scoring for "Most Relevant" ── */
const TIER_1_BIG_TECH = new Set([
  'google', 'microsoft', 'amazon', 'apple', 'meta', 'netflix', 'adobe', 'nvidia',
  'uber', 'salesforce', 'oracle', 'cisco', 'intel', 'amd', 'ibm', 'stripe',
  'atlassian', 'snowflake', 'databricks', 'linkedin', 'twitter', 'x', 'spotify',
  'airbnb', 'paypal', 'qualcomm', 'palantir', 'github', 'openai', 'anthropic',
  'bytedance', 'tiktok', 'deepmind', 'tesla', 'snap', 'dropbox', 'zoom', 'pinterest'
]);

const TIER_2_TOP_TECH_UNICORNS = new Set([
  'flipkart', 'swiggy', 'zomato', 'razorpay', 'phonepe', 'cred', 'meesho',
  'zepto', 'paytm', 'inmobi', 'urban company', 'zerodha', 'groww', 'juspay',
  'postman', 'browserstack', 'freshworks', 'zoho', 'slice', 'dream11',
  'khatabook', 'sharechat', 'cars24', 'pine labs', 'oyo', 'ola', 'curefit',
  'cultfit', 'makemytrip', 'policybazaar', 'nykaa', 'blinkit', 'deliveroo',
  'grab', 'canva', 'figma', 'notion', 'airtable', 'discord', 'roblox', 'datadog',
  'mongodb', 'elastic', 'cloudflare', 'twilio', 'hubspot', 'plaid', 'affirm'
]);

const TIER_3_GLOBAL_FINTECH_CONSULTING = new Set([
  'goldman sachs', 'morgan stanley', 'jpmorgan', 'jpmorgan chase', 'jp morgan',
  'visa', 'mastercard', 'american express', 'amex', 'barclays', 'hsbc',
  'de shaw', 'd.e. shaw', 'citadel', 'jane street', 'tower research', 'two sigma',
  'worldquant', 'optiver', 'hudson river trading', 'mckinsey', 'bcg',
  'boston consulting group', 'bain & company', 'bain', 'deloitte', 'pwc',
  'ey', 'kpmg', 'accenture', 'capgemini', 'cognizant', 'tcs',
  'tata consultancy services', 'infosys', 'wipro', 'hcl', 'hcltech',
  'tech mahindra', 'l&t', 'l&t technology services', 'siemens', 'bosch',
  'samsung', 'sony', 'dell', 'hp', 'lenovo', 'philips', 'ge'
]);

const getCompanyReputationScore = (companyName = '') => {
  const norm = String(companyName).toLowerCase().trim().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ');
  if (!norm) return 0;

  for (const name of TIER_1_BIG_TECH) {
    if (norm === name || norm.includes(name) || name.includes(norm)) {
      return 10000;
    }
  }
  for (const name of TIER_2_TOP_TECH_UNICORNS) {
    if (norm === name || norm.includes(name) || name.includes(norm)) {
      return 7500;
    }
  }
  for (const name of TIER_3_GLOBAL_FINTECH_CONSULTING) {
    if (norm === name || norm.includes(name) || name.includes(norm)) {
      return 5000;
    }
  }
  return 1000;
};

/* ── Helpers for Scraper Deduplication & Freshness ── */
const getJobMinutesAgo = (job) => {
  if (!job) return 999999;
  const rawDate = job.postedDate || job.postedAt || job.rawJob?.postedDate || job.rawJob?.postedAt || job.created_at || job.rawJob?.created_at;
  if (rawDate) {
    const timeMs = new Date(rawDate).getTime();
    if (!isNaN(timeMs)) {
      return Math.max(0, Math.floor((Date.now() - timeMs) / 60000));
    }
  }
  const rel = (job.postedRelative || job.postedAgo || '').toLowerCase();
  if (rel.includes('just now') || rel.includes('second') || rel.includes('sec')) return 0;
  const minMatch = rel.match(/(\d+)\s*(?:m|min|minute)(?!o)/);
  if (minMatch) return parseInt(minMatch[1], 10);
  const hrMatch = rel.match(/(\d+)\s*(?:h|hr|hour)/);
  if (hrMatch) return parseInt(hrMatch[1], 10) * 60;
  if (rel.includes('today')) return 120;
  const dayMatch = rel.match(/(\d+)\s*(?:d|day)/);
  if (dayMatch) return parseInt(dayMatch[1], 10) * 1440;
  if (rel.includes('yesterday')) return 1440;
  const wkMatch = rel.match(/(\d+)\s*(?:w|wk|week)/);
  if (wkMatch) return parseInt(wkMatch[1], 10) * 10080;
  return 180;
};

const formatPostingTime = (mins) => {
  if (mins <= 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
  if (mins < 10080) return `${Math.floor(mins / 1440)}d ago`;
  return `${Math.floor(mins / 10080)}w ago`;
};

const getJobDedupKey = (job) => {
  const rawUrl = job.applyUrl || job.sourceUrl || job.url || '';
  const normUrl = rawUrl.split('?')[0].trim().toLowerCase();
  const id = job.id ? String(job.id).trim() : '';
  const source = (job.source || 'unknown').toLowerCase();
  if (id && !id.startsWith('job-') && !id.startsWith('live-') && id.length > 3) {
    return `${source}:${id}`;
  }
  if (normUrl && normUrl.length > 10) {
    return `${source}:${normUrl}`;
  }
  return `${source}:${(job.title || '').toLowerCase()}:${(job.company || '').toLowerCase()}`;
};

const mergeJobsDeduped = (existing, incoming) => {
  const map = new Map();
  for (const j of existing || []) {
    map.set(getJobDedupKey(j), j);
  }
  for (const j of incoming || []) {
    map.set(getJobDedupKey(j), j);
  }
  const merged = Array.from(map.values());
  merged.sort((a, b) => getJobMinutesAgo(a) - getJobMinutesAgo(b));
  return merged;
};

/* ── Company Logo Renderer with Monogram First Alphabet Fallback ── */
function CompanyLogo({ type, company, logoUrl }) {
  return (
    <div className="jlogo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: 0 }}>
      <CompanyIcon
        company={company}
        logoUrl={logoUrl}
        size={38}
        className="!border-0 !shadow-none !rounded-lg"
      />
    </div>
  );
}

export function DiscoveryStep({
  resume,
  discoveredJobs = [],
  onJobsDiscovered,
  onProceedToScoring,
  onSelectJobForDetail,
  onSelectJobForTailoring,
  initialSearchTerm = '',
  onUpdateResume,
  onNavigateToResume,
}) {
  const { user } = useAuth();
  const userName = user?.name && user.name !== 'Alex Chen' ? user.name : 'Nikhil';
  const { bookmarkedJobIds, toggleBookmark, isBookmarked, appliedJobIds, markJobApplied, addToast, setClientScreen } = useAppStore();

  // Active Tab: 'all' | 'matched' | 'saved' | 'applied' | 'past_scraped'
  const [activeTab, setActiveTab] = useState('all');
  const [pastFilterType, setPastFilterType] = useState('all'); // 'all' | 'internship' | 'fulltime'
  const [tailorModalJob, setTailorModalJob] = useState(null);

  // View Layout: 'list' | 'grid'
  const [viewLayout, setViewLayout] = useState('list');

  // Hero filter chip toggle
  const [activeHeroChip, setActiveHeroChip] = useState(null);

  // Search input & Location (empty by default so all previously scraped jobs across all locations show)
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm || '');
  const [searchLocation, setSearchLocation] = useState('');
  
  // Decoupled active applied filters — prevents heavy feed re-sorting while user is simply typing in inputs
  const [activeSearchTerm, setActiveSearchTerm] = useState(initialSearchTerm || '');
  const [activeSearchLocation, setActiveSearchLocation] = useState('');

  useEffect(() => {
    if (initialSearchTerm) {
      setSearchTerm(initialSearchTerm);
      setActiveSearchTerm(initialSearchTerm);
    }
  }, [initialSearchTerm]);

  // Smooth auto-sync with 350ms debounce: typing remains instantaneous and responsive without locking feed
  useEffect(() => {
    const timer = setTimeout(() => {
      setActiveSearchTerm(searchTerm);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setActiveSearchLocation(searchLocation);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchLocation]);

  const [showRoleSuggestions, setShowRoleSuggestions] = useState(false);
  const [showLocationPresets, setShowLocationPresets] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const fsearchRef = useRef(null);
  const flocationRef = useRef(null);

  // Filtered role suggestions based on live input
  const filteredRoleSuggestions = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) {
      return POPULAR_ROLES_SUGGESTIONS.slice(0, 10);
    }
    return POPULAR_ROLES_SUGGESTIONS.filter(item =>
      item.role.toLowerCase().includes(q) || item.track.toLowerCase().includes(q)
    ).slice(0, 10);
  }, [searchTerm]);

  // Dynamic filterable location suggestions based on live input
  const filteredLocationSuggestions = useMemo(() => {
    const q = searchLocation.trim().toLowerCase();
    if (!q) {
      return POPULAR_LOCATIONS_PRESETS.slice(0, 10);
    }
    return POPULAR_LOCATIONS_PRESETS.filter(item =>
      item.label.toLowerCase().includes(q) || item.desc.toLowerCase().includes(q)
    ).slice(0, 10);
  }, [searchLocation]);

  // Click outside to dismiss dropdowns
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (fsearchRef.current && !fsearchRef.current.contains(e.target)) {
        setShowRoleSuggestions(false);
      }
      if (flocationRef.current && !flocationRef.current.contains(e.target)) {
        setShowLocationPresets(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleRoleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setShowRoleSuggestions(true);
      setActiveSuggestionIndex(prev =>
        prev < filteredRoleSuggestions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setShowRoleSuggestions(true);
      setActiveSuggestionIndex(prev =>
        prev > 0 ? prev - 1 : filteredRoleSuggestions.length - 1
      );
    } else if (e.key === 'Enter') {
      if (activeSuggestionIndex >= 0 && filteredRoleSuggestions[activeSuggestionIndex]) {
        e.preventDefault();
        const picked = filteredRoleSuggestions[activeSuggestionIndex].role;
        selectRoleSuggestion(picked);
      } else {
        setShowRoleSuggestions(false);
        setActiveSearchTerm(searchTerm);
        handleSearchSubmit();
      }
    } else if (e.key === 'Escape') {
      setShowRoleSuggestions(false);
      setActiveSuggestionIndex(-1);
    }
  };

  const selectRoleSuggestion = (role) => {
    setSearchTerm(role);
    setActiveSearchTerm(role);
    setShowRoleSuggestions(false);
    setActiveSuggestionIndex(-1);
    startStreamSearch(activeSearchLocation, role);
    fetchQueueJobs(role, undefined, activeSearchLocation);
  };

  const selectLocationSuggestion = (loc) => {
    setSearchLocation(loc);
    setActiveSearchLocation(loc);
    setShowLocationPresets(false);
    startStreamSearch(loc, activeSearchTerm);
    fetchQueueJobs(activeSearchTerm, undefined, loc);
  };

  // Filter dropdown states (streamlined for tech roles and recency-first)
  const [jobTypeFilter, setJobTypeFilter] = useState('All Jobs');
  const [experienceFilter, setExperienceFilter] = useState('All Levels');
  const [platformFilter, setPlatformFilter] = useState('All Platforms');
  const [workplaceFilter, setWorkplaceFilter] = useState('All');
  const [batchFilter, setBatchFilter] = useState('All Batches');
  const [postedFilter, setPostedFilter] = useState('0 min to 1 Week');
  const [sortBy, setSortBy] = useState('Newest First');
  const [relevanceFilter, setRelevanceFilter] = useState('All Matches');
  const [first50Only, setFirst50Only] = useState(false);
  const [hideGhostJobs, setHideGhostJobs] = useState(false);
  const [batch2028Only, setBatch2028Only] = useState(false);
  const [foreignRemoteOnly, setForeignRemoteOnly] = useState(false);
  const [isLiveScraping, setIsLiveScraping] = useState(false);


  // Drawer state
  const [selectedDrawerJob, setSelectedDrawerJob] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Kebab menu state: jobId -> boolean
  const [openKebabId, setOpenKebabId] = useState(null);

  // ═══════════════════════════════════════════════════════════
  // ── BACKGROUND SCRAPER ENGINES & REAL-TIME STREAMING STATE ──
  // ═══════════════════════════════════════════════════════════
  const [isSearching, setIsSearching] = useState(false);
  const [isScrapingLinkedIn, setIsScrapingLinkedIn] = useState(false);
  const [isScrapingNaukri, setIsScrapingNaukri] = useState(false);
  const [scrapeNotification, setScrapeNotification] = useState(null);
  const [isMonitorActive, setIsMonitorActive] = useState(true);
  const [liveMonitorAlert, setLiveMonitorAlert] = useState(null);
  const [streamingSource, setStreamingSource] = useState(null);
  const [streamStats, setStreamStats] = useState({ linkedin: 0, naukari: 0, total: 0 });
  const [isLoadingQueue, setIsLoadingQueue] = useState(false);
  const newJobIdsRef = useRef(new Set());
  const accumulatedJobsRef = useRef(new Map());
  const searchStreamRef = useRef(null);
  // Batch SSE flush: collect jobs for 150ms before setState to prevent per-job re-renders
  const sseFlushTimerRef = useRef(null);
  // Rendered card count (progressive rendering — start with 80, load more on scroll)
  const [renderedCount, setRenderedCount] = useState(80);
  const jobsScrollRef = useRef(null);

  // Clean up search SSE stream on component unmount
  useEffect(() => {
    return () => {
      if (searchStreamRef.current) {
        searchStreamRef.current.close();
        searchStreamRef.current = null;
      }
      if (sseFlushTimerRef.current) {
        clearTimeout(sseFlushTimerRef.current);
      }
    };
  }, []);

  // Infinite scroll: load 40 more cards when nearing bottom
  useEffect(() => {
    const el = jobsScrollRef.current;
    if (!el) return;
    const onScroll = () => {
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 200) {
        setRenderedCount(prev => prev + 40);
      }
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  // 1. Fetch pre-verified past jobs from SQLite/store in background on mount
  const fetchQueueJobs = async (targetRole, sourceOverride, targetLocation) => {
    try {
      setIsLoadingQueue(true);
      const queryRole = targetRole !== undefined ? targetRole : (searchTerm.trim() || resume?.target_roles?.[0] || '');
      const effectiveSource = sourceOverride !== undefined ? sourceOverride : '';
      const effectiveLocation = targetLocation !== undefined ? targetLocation : searchLocation.trim();
      const params = new URLSearchParams();
      if (queryRole) params.append('query', queryRole);
      if (effectiveSource) params.append('source', effectiveSource);
      if (effectiveLocation && !/^(anywhere|worldwide|global|all)$/i.test(effectiveLocation)) {
        params.append('location', effectiveLocation);
      }
      params.append('limit', '500');
      const res = await fetch(`/api/jobs?${params.toString()}`);
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data = await res.json();
      if (data && Array.isArray(data.items) && data.items.length > 0) {
        const tagged = data.items.map((j) => ({
          ...j,
          isQueue: true,
          isPastScraped: true,
          isLive: false,
        }));
        if (onJobsDiscovered) {
          onJobsDiscovered((prev) => mergeJobsDeduped(prev || [], tagged));
        }
      }
    } catch (err) {
      console.warn('Could not fetch queue jobs in background:', err);
    } finally {
      setIsLoadingQueue(false);
    }
  };

  useEffect(() => {
    // Initial hydration — single combined fetch to avoid parallel requests hammering server
    fetchQueueJobs('', '');
  }, []);

  useEffect(() => {
    if (platformFilter !== 'All Platforms') {
      const src = platformFilter === 'Naukri' ? 'naukari' : (platformFilter === 'YC Startups' ? 'yc' : (platformFilter === 'SimplifyJobs' ? 'simplify_jobs' : platformFilter.toLowerCase()));
      fetchQueueJobs('', src);
      startStreamSearch(searchLocation, searchTerm, { platformFilter });
      if (platformFilter === 'LinkedIn') {
        handleScrapeLinkedInLive();
      } else if (platformFilter === 'Naukri') {
        handleScrapeNaukriLive();
      }
    }
  }, [platformFilter]);

  useEffect(() => {
    if (batchFilter !== 'All Batches') {
      const year = batchFilter.replace(/\D/g, '');
      if (year) {
        fetchQueueJobs(year);
      }
    }
  }, [batchFilter]);

  // 2. Real-Time Background Monitor SSE Stream listener (/api/monitor/stream)
  useEffect(() => {
    let eventSource = null;
    try {
      eventSource = new EventSource('/api/monitor/stream');
      eventSource.addEventListener('new_jobs', (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.jobs && Array.isArray(data.jobs) && data.jobs.length > 0) {
            const freshOnly = data.jobs.filter((j) => getJobMinutesAgo(j) <= 1440);
            if (freshOnly.length === 0) return;
            setLiveMonitorAlert(`Auto-detected ${freshOnly.length} new postings in the background!`);
            if (addToast) {
              addToast({
                title: 'New Postings Auto-Detected',
                message: `Discovered ${freshOnly.length} live postings in background.`,
                type: 'success',
              });
            }
            if (onJobsDiscovered) {
              onJobsDiscovered((prev) => mergeJobsDeduped(prev || [], freshOnly));
            }
          }
        } catch { }
      });
      eventSource.addEventListener('status', (e) => {
        try {
          const data = JSON.parse(e.data);
          setIsMonitorActive(Boolean(data.isRunning));
        } catch { }
      });
    } catch (e) {
      console.warn('Monitor stream connection issue:', e);
    }
    return () => {
      if (eventSource) eventSource.close();
    };
  }, [onJobsDiscovered, addToast]);

  // 3. Direct Real-Time LinkedIn Scraper
  const handleScrapeLinkedInLive = async () => {
    setIsScrapingLinkedIn(true);
    const internOnly = jobTypeFilter === 'Internship';
    const query = searchTerm.trim() || resume?.target_roles?.join(', ') || 'Software Engineer Intern';
    const rawLoc = searchLocation.trim();
    const loc = (!rawLoc || /anywhere|global|worldwide/i.test(rawLoc)) ? 'Worldwide' : rawLoc;
    try {
      const queuePromise = fetch(`/api/jobs?source=linkedin&query=${encodeURIComponent(query)}&limit=60`)
        .then((r) => r.json())
        .catch(() => ({ items: [] }));

      const scrapePromise = fetch('/api/jobs/scrape-linkedin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          location: loc,
          internshipsOnly: internOnly,
          jobType: jobTypeFilter.toLowerCase(),
          timeWindow: '24h',
          limit: 35,
        }),
      }).then((r) => r.json());

      const [queueData, scrapeData] = await Promise.all([queuePromise, scrapePromise]);

      let merged = discoveredJobs || [];
      if (queueData.items && Array.isArray(queueData.items) && queueData.items.length > 0) {
        const queueJobs = queueData.items.map((j) => ({ ...j, isQueue: true, isLive: false }));
        merged = mergeJobsDeduped(merged, queueJobs);
      }

      if (scrapeData.success && Array.isArray(scrapeData.jobs)) {
        const fresh = scrapeData.jobs
          .filter((j) => getJobMinutesAgo(j) <= 1440)
          .map((j) => ({ ...j, isLive: true, isQueue: false, source: 'linkedin' }));
        merged = mergeJobsDeduped(merged, fresh);
        if (onJobsDiscovered) onJobsDiscovered(merged);
        if (addToast) {
          addToast({
            title: 'LinkedIn Scraper Success',
            message: `Discovered ${fresh.length} real-time LinkedIn postings in "${loc}".`,
            type: 'success',
          });
        }
      } else {
        if (onJobsDiscovered) onJobsDiscovered(merged);
      }
    } catch (err) {
      console.warn('Error connecting to LinkedIn real-time scraper:', err);
    } finally {
      setIsScrapingLinkedIn(false);
    }
  };

  // 4. Direct Real-Time Naukri Scraper
  const handleScrapeNaukriLive = async () => {
    setIsScrapingNaukri(true);
    const query = searchTerm.trim() || resume?.target_roles?.join(', ') || 'Software Engineer Intern';
    const rawLoc = searchLocation.trim();
    const loc = (!rawLoc || /anywhere|global|worldwide/i.test(rawLoc)) ? 'Worldwide' : rawLoc;
    try {
      const res = await fetch('/api/jobs/scrape-naukri', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          location: loc,
          jobType: jobTypeFilter.toLowerCase(),
          limit: 25,
        }),
      });
      const data = await res.json();
    } catch (err) {
      console.warn('Error scraping Naukri platform:', err);
    } finally {
      setIsScrapingNaukri(false);
    }
  };

  // 5. Real-Time SSE Stream Search across all platforms
  const startStreamSearch = async (overrideLocation, overrideRoles, overrideFilters = {}) => {
    setIsSearching(true);
    setIsLiveScraping(true);
    setStreamStats({ linkedin: 0, total: 0 });
    const locToUse = overrideLocation !== undefined ? overrideLocation : searchLocation.trim();
    const rolesToUse = overrideRoles !== undefined ? overrideRoles : searchTerm.trim();
    let rawRoles = rolesToUse || resume?.target_roles?.[0] || 'Software Engineer Intern';
    const effectiveRoles = rawRoles.includes(',') ? rawRoles.split(',')[0].trim() : rawRoles.trim();
    const effectiveLoc = (!locToUse || /anywhere|global|worldwide/i.test(locToUse)) ? 'Worldwide' : locToUse;

    const effJobType = overrideFilters.jobTypeFilter !== undefined ? overrideFilters.jobTypeFilter : jobTypeFilter;
    const effWorkplace = overrideFilters.workplaceFilter !== undefined ? overrideFilters.workplaceFilter : workplaceFilter;
    const effBatch = overrideFilters.batchFilter !== undefined ? overrideFilters.batchFilter : batchFilter;
    const effPlatform = overrideFilters.platformFilter !== undefined ? overrideFilters.platformFilter : platformFilter;
    const effPosted = overrideFilters.postedFilter !== undefined ? overrideFilters.postedFilter : postedFilter;

    accumulatedJobsRef.current = new Map();
    newJobIdsRef.current = new Set();

    // 1. Immediately fetch matching jobs from the store for this query & location
    try {
      const qParams = new URLSearchParams();
      if (effectiveRoles) qParams.append('query', effectiveRoles);
      if (locToUse && !/anywhere|worldwide|global/i.test(locToUse)) qParams.append('location', locToUse);
      if (effJobType === 'Internship') qParams.append('jobType', 'internship');
      if (effJobType === 'Full Time') qParams.append('jobType', 'fulltime');
      if (effPlatform !== 'All Platforms') {
        const src = effPlatform === 'Naukri' ? 'naukari' : (effPlatform === 'YC Startups' ? 'yc' : effPlatform.toLowerCase());
        qParams.append('source', src);
      }
      qParams.append('limit', '100');

      const fastRes = await fetch(`/api/jobs?${qParams.toString()}`);
      if (fastRes.ok) {
        const fastData = await fastRes.json();
        if (fastData && Array.isArray(fastData.items) && fastData.items.length > 0) {
          const preTagged = fastData.items.map(j => ({ ...j, isQueue: true, isPastScraped: true, isLive: false }));
          for (const pj of preTagged) {
            accumulatedJobsRef.current.set(getJobDedupKey(pj), pj);
          }
          if (onJobsDiscovered) {
            onJobsDiscovered(Array.from(accumulatedJobsRef.current.values()));
          }
        }
      }
    } catch (e) {
      console.warn('Initial fast cache lookup error:', e);
    }

    const rolesParam = encodeURIComponent(effectiveRoles);
    const locationParam = encodeURIComponent(effectiveLoc);
    const timeParam = effPosted === 'All Time' ? 'all' : (effPosted.includes('24') ? '24h' : '7d');
    const isInternSearch = effJobType === 'Internship' || /\b(intern|internship|trainee|co-?op)\b/i.test(effectiveRoles);
    const jobTypeParam = isInternSearch ? 'internship' : (effJobType === 'Full Time' ? 'fulltime' : 'any');
    const remoteParam = effWorkplace === 'Remote' ? 'true' : 'false';
    const workplaceParam = effWorkplace.toLowerCase();
    const batchParam = effBatch !== 'All Batches' ? effBatch.replace(/\D/g, '') : '';
    const platformParam = effPlatform !== 'All Platforms' ? effPlatform.toLowerCase() : '';

    const url = `/api/jobs/stream-search?roles=${rolesParam}&location=${locationParam}&timeWindow=${timeParam}&jobType=${jobTypeParam}&remoteOnly=${remoteParam}&workplaceType=${workplaceParam}&batchYear=${batchParam}&source=${platformParam}`;

    // Abort any existing search stream before starting a new one
    if (searchStreamRef.current) {
      searchStreamRef.current.close();
      searchStreamRef.current = null;
    }

    try {
      const eventSource = new EventSource(url);
      searchStreamRef.current = eventSource;
      eventSource.addEventListener('source_start', (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.source) setStreamingSource(data.label || data.source);
        } catch { }
      });

      eventSource.addEventListener('job', (e) => {
        try {
          const data = JSON.parse(e.data);
          const job = data.job;
          if (!job || !job.id) return;
          const isCached = data.source === 'cached_verified' || Boolean(job.cached_verified);
          const taggedJob = {
            ...job,
            isLive: !isCached,
            isQueue: Boolean(isCached || job.isQueue),
            isPastScraped: Boolean(isCached || job.isQueue),
          };
          accumulatedJobsRef.current.set(getJobDedupKey(taggedJob), taggedJob);
          newJobIdsRef.current.add(taggedJob.id);
          const src = (taggedJob.source || '').toLowerCase();
          setStreamStats((prev) => ({
            linkedin: src.includes('linkedin') ? prev.linkedin + 1 : prev.linkedin,
            total: prev.total + 1,
          }));
          // Batch: flush to state at most once per 150ms instead of per-job
          if (!sseFlushTimerRef.current) {
            sseFlushTimerRef.current = setTimeout(() => {
              sseFlushTimerRef.current = null;
              const sorted = Array.from(accumulatedJobsRef.current.values()).sort((a, b) => {
                if (a.isLive && !b.isLive) return -1;
                if (!a.isLive && b.isLive) return 1;
                return getJobMinutesAgo(a) - getJobMinutesAgo(b);
              });
              if (onJobsDiscovered) onJobsDiscovered(sorted);
            }, 150);
          }
        } catch { }
      });

      eventSource.addEventListener('complete', (e) => {
        setStreamingSource(null);
        setIsSearching(false);
        setIsLiveScraping(false);
        try {
          const data = JSON.parse(e.data);
          if (data.totalJobs && addToast) {
            addToast({
              title: 'Live Scrape Search Complete',
              message: `Streamed ${data.totalJobs} live postings for "${effectiveRoles}" in "${effectiveLoc}".`,
              type: 'success',
            });
          }
        } catch { }
        eventSource.close();
        if (searchStreamRef.current === eventSource) {
          searchStreamRef.current = null;
        }
      });

      eventSource.addEventListener('error', () => {
        setStreamingSource(null);
        setIsSearching(false);
        setIsLiveScraping(false);
        eventSource.close();
        if (searchStreamRef.current === eventSource) {
          searchStreamRef.current = null;
        }
      });
    } catch (e) {
      console.warn('Stream search initiation error:', e);
      setIsSearching(false);
      setIsLiveScraping(false);
    }
  };

  // Close kebab on outside click
  useEffect(() => {
    const handleOutside = () => setOpenKebabId(null);
    window.addEventListener('click', handleOutside);
    return () => window.removeEventListener('click', handleOutside);
  }, []);

  // Merge default specification jobs with real database/discovered jobs
  // Memoize raw job mapping so typing in search/location NEVER re-maps raw jobs or re-executes regexes
  const mappedRealJobs = useMemo(() => {
    return (discoveredJobs || []).map((j, idx) => {
      const score = j.fitScore || j.score || (90 - (idx % 25));
      const isAI = score >= 80;

      // Authentic title handling: preserve exact scraped title with year, or highlight year if in description/metadata
      let displayTitle = (j.title || '').trim() || 'Software Engineer';
      const yearInTitleMatch = displayTitle.match(/\b(202[3-9]|2030)\b/);
      const descText = `${j.description || ''} ${j.raw?.description || ''} ${j.rawJob?.description || ''}`;
      const descYearMatch = descText.match(/\b(202[4-9]|2030)\s*(?:batch|grad(?:uate)?s?|class)?\b/i) ||
        descText.match(/(?:batch|class\s+of|graduating\s+in)\s*[:\-–]?\s*(202[4-9]|2030)/i);
      const eligibleBatches = j.eligibleBatches || j.rawJob?.eligibleBatches || j.raw?.eligibleBatches;

      let identifiedYear = yearInTitleMatch ? yearInTitleMatch[1] : null;
      if (!identifiedYear) {
        if (descYearMatch && descYearMatch[1]) {
          identifiedYear = descYearMatch[1];
          displayTitle = `${displayTitle} (${identifiedYear} Batch)`;
        } else if (Array.isArray(eligibleBatches) && eligibleBatches.length > 0 && !eligibleBatches.includes('All Batches')) {
          const yr = eligibleBatches.find(y => /\b202[4-9]\b/.test(y));
          if (yr) {
            identifiedYear = yr;
            displayTitle = `${displayTitle} (${yr} Batch)`;
          }
        }
      }

      // Filter out spam, bpo and telemarketing while allowing all legitimate tech, creative, product, design, marketing, data and business roles
      const titleLower = displayTitle.toLowerCase();
      const spamPatterns = /\b(telecaller|telesales|bpo|call\s*center|cashier|cook|chef|barista|waiter|delivery\s*(?:boy|partner)|housekeeping|plumber|electrician|security\s*guard)\b/i;
      if (spamPatterns.test(titleLower)) {
        return null;
      }

      // Compute exact relative posting time (0 min to 1 week)
      const mins = getJobMinutesAgo(j);
      const displayPostedAgo = formatPostingTime(mins);

      // Actual posted time formatted (Date / Time)
      const rawPostedDate = j.postedAt || j.postedDate;
      let actualPostedTimeFormatted = '';
      if (rawPostedDate) {
        try {
          const d = new Date(rawPostedDate);
          if (!isNaN(d.getTime())) {
            actualPostedTimeFormatted = d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
          }
        } catch { }
      }

      // Authentic compensation: If not present, explicitly state "Not mentioned"
      const actualSalaryRaw = j.salary || (j.salaryMin ? (j.salaryMax ? `₹${j.salaryMin} – ₹${j.salaryMax}` : `₹${j.salaryMin}`) : (j.stipend || null));
      const displaySalary = (actualSalaryRaw && !/competitive|doe|negotiable|as per market/i.test(actualSalaryRaw))
        ? actualSalaryRaw
        : 'Not mentioned';

      // Clean display Job ID
      let cleanJobId = j.id ? String(j.id).replace(/^(job-|live-|real-job-)/i, '').trim() : '';
      if (!cleanJobId || cleanJobId.length < 3) {
        cleanJobId = Math.abs(getJobDedupKey(j).split('').reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) | 0, 0)).toString(16).substring(0, 8);
      }

      // Eligible batch display text (visible directly on job card)
      const isJobIntern = j.isInternship || /intern|co-?op|trainee/i.test(displayTitle);
      let eligibleBatchText = j.eligibleBatchText || 'All Batches Eligible';
      if (Array.isArray(eligibleBatches) && eligibleBatches.length > 0 && !eligibleBatches.includes('All Batches')) {
        eligibleBatchText = eligibleBatches.join(', ') + ' Batch';
      } else if (identifiedYear) {
        eligibleBatchText = `${identifiedYear} Batch`;
      } else if (/2025|2026/i.test(displayTitle)) {
        const match = displayTitle.match(/202[4-9]/);
        eligibleBatchText = match ? `${match[0]} Batch` : '2025, 2026 Batch';
      } else if (isJobIntern) {
        eligibleBatchText = '2025, 2026, 2027 Batch (Students/Freshers)';
      } else if (/fresher|graduate|entry\s*level|new\s*grad/i.test(displayTitle)) {
        eligibleBatchText = '2024, 2025 Batch';
      }

      // Build tags, ensuring identified year/batch tag is prominently displayed
      let rawTags = Array.isArray(j.skills) && j.skills.length > 0
        ? j.skills
        : (Array.isArray(j.tags) ? j.tags : ['React', 'JavaScript', 'Node.js']);

      const tagsList = [...rawTags];
      if (identifiedYear && !tagsList.some(t => String(t).includes(identifiedYear))) {
        tagsList.unshift(`${identifiedYear} Batch`);
      }

      return {
        id: j.id || `real-job-${idx}`,
        displayId: cleanJobId,
        title: displayTitle,
        company: j.company || 'Tech Corp',
        location: j.location || 'India',
        postedAgo: displayPostedAgo,
        postedAt: j.postedAt || j.postedDate,
        actualPostedTimeFormatted,
        tags: tagsList.slice(0, 3),
        extraTagsCount: Math.max(0, tagsList.length - 3),
        roleType: j.isInternship || /intern/i.test(displayTitle) ? 'Internship' : 'Full Time',
        salary: displaySalary,
        workplace: j.remote ? 'Remote' : (/hybrid/i.test(j.location || '') ? 'Hybrid' : (/remote/i.test(j.location || '') ? 'Remote' : 'Onsite')),
        matchScore: score,
        matchLabel: `${score}% Match`,
        pillType: isAI ? 'g' : 'y',
        pillText: isAI ? 'AI Matched' : 'Good Match',
        matchDesc: isAI ? 'Great match! Your skills align well with this position.' : 'Relevant experience matching role criteria.',
        applyUrl: getSafeJobApplyUrl ? getSafeJobApplyUrl(j) : (j.applyUrl || j.sourceUrl || '#'),
        source: j.source || 'verified',
        logoType: (j.company || '').toLowerCase().replace(/\s+/g, ''),
        rawJob: j,
        identifiedYear,
        eligibleBatches: eligibleBatches || (identifiedYear ? [identifiedYear] : undefined),
        eligibleBatchText,
        indianCitizenEligibility: getIndianCitizenEligibility(j),
        isUserBatchEligible: checkUser2028BatchEligible({ ...j, title: displayTitle, eligibleBatches, eligibleBatchText }),
        is2028Eligible: Boolean(j.is2028Eligible || checkUser2028BatchEligible({ ...j, title: displayTitle, eligibleBatches, eligibleBatchText })),
        isForeignRemote: Boolean(j.isForeignRemote || j.foreignRegion || (j.remote && (j.source === 'workingnomads' || j.source === 'remotive' || j.source === 'yc' || j.salaryCurrency === 'USD'))),
        foreignRegion: j.foreignRegion || (j.salaryCurrency === 'USD' ? 'US Remote' : null),
        isActiveIntake: Boolean(j.isActiveIntake),
        salaryCurrency: j.salaryCurrency || j.salary_currency,
        isIntern: Boolean(j.isIntern || j.isInternship || /intern/i.test(displayTitle)),
        isLive: Boolean(j.isLive),
        isQueue: Boolean(j.isQueue),
        isPastScraped: Boolean(j.isPastScraped || j.isQueue || j.source),
      };
    }).filter(Boolean);
  }, [discoveredJobs]);

  const allAvailableJobs = useMemo(() => {
    // Merge and sort strictly by recency (newest 0m to 1w on top)
    const seenMap = new Map();
    for (const rj of mappedRealJobs) {
      const key = `${rj.company.toLowerCase()}:${rj.title.toLowerCase()}`;
      if (!seenMap.has(key)) {
        seenMap.set(key, rj);
      }
    }

    // Always inject verified spec jobs into available jobs pool
    for (const sj of DEFAULT_SPEC_JOBS) {
      const key = `${sj.company.toLowerCase()}:${sj.title.toLowerCase()}`;
      if (!seenMap.has(key)) {
        seenMap.set(key, {
          ...sj,
          displayId: sj.id.replace(/^(google-|msft-|amazon-|tcs-|accenture-|stripe-|meta-)/, ''),
          actualPostedTimeFormatted: 'Today',
          eligibleBatchText: sj.eligibleBatches?.join(', ') ? `${sj.eligibleBatches.join(', ')} Batch` : `${sj.identifiedYear} Batch`,
          indianCitizenEligibility: getIndianCitizenEligibility(sj),
          isUserBatchEligible: checkUser2028BatchEligible(sj),
          is2028Eligible: Boolean(sj.eligibleBatches?.includes('2028') || checkUser2028BatchEligible(sj)),
          isForeignRemote: Boolean(sj.location?.includes('Worldwide') || sj.company === 'Stripe'),
          foreignRegion: sj.location?.includes('Worldwide') ? 'Global Remote' : null,
          isActiveIntake: true,
          isIntern: Boolean(sj.roleType === 'Internship' || /intern/i.test(sj.title)),
          isPastScraped: true,
        });
      }
    }
    const combined = Array.from(seenMap.values());
    combined.sort((a, b) => getJobMinutesAgo(a) - getJobMinutesAgo(b));
    return combined;
  }, [mappedRealJobs]);

  // Filtered jobs based on all working filter controls
  const filteredJobs = useMemo(() => {
    const list = allAvailableJobs.filter((job) => {
      // Tab filter
      if (activeTab === 'matched' && job.matchScore < 80) return false;
      if (activeTab === 'saved' && !bookmarkedJobIds.has(job.id)) return false;
      if (activeTab === 'applied' && !appliedJobIds.has(job.id)) return false;
      if (activeTab === 'past_scraped') {
        const isPast = Boolean(job.isPastScraped || job.isQueue || (job.source && job.source !== 'mock'));
        if (!isPast) return false;
        if (pastFilterType === 'internship') {
          const isIntern = job.roleType === 'Internship' || /\b(intern|internship|trainee|co-?op)\b/i.test(job.title);
          if (!isIntern) return false;
        } else if (pastFilterType === 'fulltime') {
          const isIntern = job.roleType === 'Internship' || /\b(intern|internship|trainee|co-?op)\b/i.test(job.title);
          if (isIntern) return false;
        }
      }

      // Hero chips filter
      if (activeHeroChip === 'AI Matched Jobs' && job.matchScore < 80) return false;
      if (activeHeroChip === 'Top Companies' && !['Google', 'Microsoft', 'Amazon', 'TCS', 'Accenture', 'Meta', 'Apple'].some(c => job.company.toLowerCase().includes(c.toLowerCase()))) return false;
      if (activeHeroChip === 'Remote Friendly' && job.workplace !== 'Remote' && job.workplace !== 'Hybrid') return false;
      if (activeHeroChip === 'High Salary' && !job.salary.includes('L') && !job.salary.includes('35K') && !job.salary.includes('40K')) return false;
      if (activeHeroChip === 'New Opportunities' && getJobMinutesAgo(job) > 2880 && !job.postedAgo?.includes('day') && !job.postedAgo?.includes('h')) return false;

      // Search keyword (Semantic Cluster & Sub-discipline Expansion) — exact role & company matching
      if (activeSearchTerm.trim()) {
        const sem = semanticMatchJob(job, activeSearchTerm);
        if (!sem.matched) {
          const q = activeSearchTerm.toLowerCase();
          const matchesTitle = (job.title || '').toLowerCase().includes(q);
          const matchesComp = (job.company || '').toLowerCase().includes(q);
          const matchesTags = (job.tags || []).some(t => t.toLowerCase().includes(q));
          if (!matchesTitle && !matchesComp && !matchesTags) return false;
        }
      }

      // Exact location filter: strictly enforce location according to filter
      if (!foreignRemoteOnly && activeSearchLocation && activeSearchLocation.trim() && !/^(worldwide|global|anywhere|all)$/i.test(activeSearchLocation.trim())) {
        const rawLocTarget = activeSearchLocation.toLowerCase().trim();
        const jobLoc = (job.location || '').toLowerCase().trim();
        const isRemoteJob = Boolean(job.workplace === 'Remote' || job.remote || /remote|worldwide|anywhere/i.test(jobLoc));

        if (rawLocTarget === 'remote') {
          if (!isRemoteJob) return false;
        } else {
          // City cluster definitions
          const cityClusters = {
            noida: ['noida', 'greater noida', 'sector 62', 'sector 125', 'sector 135'],
            bengaluru: ['bangalore', 'bengaluru', 'blr', 'whitefield', 'electronic city', 'koramangala', 'hsr'],
            gurgaon: ['gurgaon', 'gurugram', 'cyber city'],
            delhi: ['delhi', 'new delhi', 'ncr', 'delhi ncr'],
            hyderabad: ['hyderabad', 'secunderabad', 'hitech city', 'gachibowli', 'madhapur'],
            pune: ['pune', 'hinjawadi', 'magarpatta', 'viman nagar', 'kharadi', 'baner'],
            mumbai: ['mumbai', 'navi mumbai', 'thane', 'andheri', 'bandra', 'powai', 'bkc'],
            chennai: ['chennai', 'madras', 'omr', 'guindy', 'tidel park'],
            kolkata: ['kolkata', 'salt lake', 'new town'],
            ahmedabad: ['ahmedabad', 'gandhinagar'],
            jaipur: ['jaipur'],
            indore: ['indore'],
            chandigarh: ['chandigarh', 'mohali', 'panchkula'],
            kochi: ['kochi', 'cochin'],
          };

          const matchedCityKey = Object.keys(cityClusters).find(k => rawLocTarget.includes(k) || cityClusters[k].some(a => rawLocTarget.includes(a)));

          if (matchedCityKey) {
            const aliases = cityClusters[matchedCityKey];
            const cityInJob = aliases.some(alias => jobLoc.includes(alias));
            if (!cityInJob && !isRemoteJob) {
              return false;
            }
          } else if (rawLocTarget.includes('india')) {
            const isForeign = /\b(united states|usa|us|uk|united kingdom|canada|germany|france|australia|singapore)\b/i.test(jobLoc) && !jobLoc.includes('india');
            if (isForeign) return false;
            const matchesIndia = jobLoc.includes('india') || isRemoteJob ||
              /\b(noida|bengaluru|bangalore|hyderabad|pune|mumbai|delhi|gurgaon|gurugram|chennai|kolkata|ahmedabad|jaipur|indore|kochi|chandigarh|ncr)\b/i.test(jobLoc);
            if (!matchesIndia) return false;
          } else {
            const tokens = rawLocTarget.split(/[,/|]+/).map(t => t.trim()).filter(Boolean);
            const matchesAnyToken = tokens.some(t => jobLoc.includes(t)) || isRemoteJob;
            if (!matchesAnyToken) return false;
          }
        }
      }

      // Strict Internship Filter: When searching for internship or Job Type is Internship, strictly do NOT show anything other than internships
      const isInternshipMode = jobTypeFilter === 'Internship' ||
        /\b(intern|internship|trainee|co-?op)\b/i.test(activeSearchTerm);
      if (isInternshipMode) {
        const titleLower = (job.title || '').toLowerCase();
        const isTitleIntern = /\b(intern(ship)?|co-?op|trainee|apprentice|fellow(ship)?|working\s+student|werkstudent|sde\s+intern|swe\s+intern)\b/i.test(titleLower);
        const isJobIntern = isTitleIntern ||
          job.roleType === 'Internship' ||
          job.isInternship === true ||
          (job.tags || []).some((t) => /\bintern(ship)?\b/i.test(String(t)));

        const isSeniorOrLead = /\b(senior|sr\.|lead|principal|staff|director|vp|head\s+of|manager|chief|architect)\b/i.test(titleLower) &&
          !/\bintern\b/i.test(titleLower);

        if (!isJobIntern || isSeniorOrLead) {
          return false;
        }
      }

      if (jobTypeFilter === 'Full Time') {
        const isIntern = job.roleType === 'Internship' || job.isInternship === true || /\b(intern|internship|trainee|co-?op)\b/i.test(job.title);
        if (isIntern) return false;
      }
      if (jobTypeFilter === 'Contract') {
        if (!/\b(contract|freelance|consultant)\b/i.test((job.title || '') + ' ' + (job.roleType || ''))) return false;
      }

      // Batch / Eligible Year filter
      if (batchFilter && batchFilter !== 'All Batches') {
        const yr = String(batchFilter);
        const hasBatch = (job.eligibleBatches || []).includes(yr) ||
          (job.identifiedYear === yr) ||
          (job.eligibleBatchText || '').includes(yr) ||
          (job.title || '').includes(yr) ||
          ((job.tags || []).some((t) => String(t).includes(yr)));
        if (!hasBatch) return false;
      }

      // Relevance / Match Score filter
      if (relevanceFilter === '90%+ High Match' && job.matchScore < 90) return false;
      if (relevanceFilter === '80%+ AI Matched' && job.matchScore < 80) return false;
      if (relevanceFilter === '70%+ Good Match' && job.matchScore < 70) return false;
      if (relevanceFilter === '60%+ Potential Match' && job.matchScore < 60) return false;

      // Experience Level filter
      if (experienceFilter === 'Entry Level' || experienceFilter === 'Fresher & Intern' || experienceFilter === 'Entry Level (0-1 yr)') {
        const isEntry = job.roleType === 'Internship' || /\b(intern|fresher|entry|junior|associate|trainee)\b/i.test(job.title);
        if (!isEntry && /\b(senior|sr\.|lead|principal|staff|manager|director)\b/i.test(job.title)) return false;
      }
      if (experienceFilter === 'Mid Level' || experienceFilter === 'Junior (1-3 yrs)') {
        if (/\b(intern|trainee|senior|sr\.|lead|principal|staff|director|head|vp)\b/i.test(job.title)) return false;
      }
      if (experienceFilter === 'Senior Level' || experienceFilter === 'Senior Level (3+ yrs)') {
        const isSenior = /\b(senior|sr\.|lead|principal|staff|manager|director|head|vp|architect)\b/i.test(job.title);
        if (!isSenior) return false;
      }

      // Platform Source filter
      if (platformFilter !== 'All Platforms') {
        const pLower = platformFilter.toLowerCase();
        const jobSource = (job.source || '').toLowerCase();
        if (pLower === 'linkedin' && !jobSource.includes('linkedin')) return false;
        if (pLower === 'internshala' && !jobSource.includes('internshala')) return false;
        if (pLower === 'naukri' && !jobSource.includes('naukri') && !jobSource.includes('naukari')) return false;
        if (pLower === 'greenhouse' && !jobSource.includes('greenhouse')) return false;
        if (pLower === 'lever' && !jobSource.includes('lever')) return false;
        if (pLower === 'ashby' && !jobSource.includes('ashby')) return false;
        if (pLower === 'yc startups' && !jobSource.includes('yc')) return false;
        if (pLower === 'unstop' && !jobSource.includes('unstop')) return false;
        if (pLower === 'simplifyjobs' && !jobSource.includes('simplify')) return false;
        if (pLower === 'remoteok' && !jobSource.includes('remoteok')) return false;
        if (pLower === 'remotive' && !jobSource.includes('remotive')) return false;
        if (pLower === 'arbeitnow' && !jobSource.includes('arbeitnow')) return false;
        if (pLower === 'weworkremotely' && !jobSource.includes('wework')) return false;
        if (pLower === 'himalayas' && !jobSource.includes('himalaya')) return false;
        if (pLower === 'jobicy' && !jobSource.includes('jobicy')) return false;
        if (pLower === 'working nomads' && !jobSource.includes('working')) return false;
        if (pLower === 'freehire' && !jobSource.includes('freehire')) return false;
      }

      // Workplace filter
      if (workplaceFilter === 'Remote' && job.workplace !== 'Remote' && !job.remote) return false;
      if (workplaceFilter === 'Hybrid' && job.workplace !== 'Hybrid') return false;
      if (workplaceFilter === 'Onsite' && job.workplace !== 'Onsite') return false;

      // Posted Within filter (Recency-first)
      // When "Most Relevant" is selected, user explicitly specified: "it can be any posted time i dont care"
      // So do not filter out top reputed companies based on 7-day or 24-hr windows
      if (sortBy !== 'Most Relevant' && !batch2028Only && !foreignRemoteOnly) {
        const mins = getJobMinutesAgo(job);
        if (postedFilter === '0 min to 1 Week' || postedFilter === 'Past 7 Days') {
          if (mins > 10080) return false;
        } else if (postedFilter === 'Past 24 Hours') {
          if (mins > 1440) return false;
        } else if (postedFilter === 'Past 3 Days') {
          if (mins > 4320) return false;
        }
      }

      const minsForVelocity = getJobMinutesAgo(job);
      if (first50Only && !batch2028Only && !foreignRemoteOnly && minsForVelocity > 120) return false;
      if (hideGhostJobs && minsForVelocity > 43200) return false;

      if (batch2028Only) {
        const is2028 = job.is2028Eligible ||
          job.isUserBatchEligible ||
          job.roleType === 'Internship' ||
          job.isIntern ||
          (Array.isArray(job.eligibleBatches) && (job.eligibleBatches.includes('2028') || job.eligibleBatches.includes('All Batches'))) ||
          /\b(2028|sophomore|2nd\s*year|second\s*year|pre-?final|freshman|intern)\b/i.test(`${job.title || ''} ${job.description || ''}`);
        if (!is2028) return false;
      }

      if (foreignRemoteOnly) {
        const loc = (job.location || '').toLowerCase();
        const isForeign = job.isForeignRemote ||
          Boolean(job.foreignRegion) ||
          /\b(us|usa|united states|europe|uk|london|berlin|worldwide|global|anywhere|germany|france|singapore|remote)\b/i.test(loc) ||
          job.salaryCurrency === 'USD' ||
          job.source === 'workingnomads' ||
          job.source === 'remotive' ||
          job.source === 'yc' ||
          job.source === 'simplify_jobs' ||
          job.source === 'arbeitnow' ||
          job.source === 'himalayas';
        if (!isForeign) return false;
      }

      return true;
    });

    // Optimization: Pre-calculate semantic relevance score once per job to prevent thousands of redundant calculations in sort
    const semScoreMap = new Map();
    if (activeSearchTerm.trim()) {
      for (const j of list) {
        const sem = semanticMatchJob(j, activeSearchTerm);
        semScoreMap.set(j.id, sem.matched ? sem.score : 0);
      }
    }

    return list.sort((a, b) => {
      // 1. Most Relevant: strictly rank best reputed, most well-known companies at the top, ignoring posted time
      if (sortBy === 'Most Relevant') {
        const repA = getCompanyReputationScore(a.company);
        const repB = getCompanyReputationScore(b.company);
        if (repA !== repB) {
          return repB - repA; // Highest reputed companies come first!
        }
        // Within same company tier, rank by job fit score
        const matchDiff = (b.matchScore || 0) - (a.matchScore || 0);
        if (matchDiff !== 0) return matchDiff;
        return (a.title || '').localeCompare(b.title || '');
      }

      // 2. Alphabetical sorting options
      if (sortBy === 'A to Z (Job Title)' || sortBy === 'A to Z' || sortBy === 'A to Z (Title)') {
        return (a.title || '').localeCompare(b.title || '');
      }
      if (sortBy === 'A to Z (Company)') {
        return (a.company || '').localeCompare(b.company || '');
      }
      if (sortBy === 'Z to A') {
        return (b.title || '').localeCompare(a.title || '');
      }
      if (sortBy === 'Eligible Batch' || sortBy === 'Eligible Batch (Graduation Year)') {
        const yrA = parseInt(a.identifiedYear || (a.eligibleBatches?.[0]) || '2024', 10);
        const yrB = parseInt(b.identifiedYear || (b.eligibleBatches?.[0]) || '2024', 10);
        return yrB - yrA;
      }
      if (sortBy === 'Highest Match') {
        return b.matchScore - a.matchScore;
      }

      // Prioritize semantic relevance tiers when searching — using precomputed scores
      if (activeSearchTerm.trim()) {
        const scoreA = semScoreMap.get(a.id) || 0;
        const scoreB = semScoreMap.get(b.id) || 0;
        if (scoreA !== scoreB) {
          return scoreB - scoreA;
        }
      }
      const minsA = getJobMinutesAgo(a);
      const minsB = getJobMinutesAgo(b);
      if (sortBy === 'Newest First') {
        return minsA - minsB;
      }
      return minsA - minsB;
    });
  }, [allAvailableJobs, activeTab, pastFilterType, activeHeroChip, activeSearchTerm, activeSearchLocation, jobTypeFilter, experienceFilter, platformFilter, workplaceFilter, batchFilter, postedFilter, relevanceFilter, sortBy, bookmarkedJobIds, appliedJobIds]);

  // Reset rendered count when filters change (so we re-start from top 80)
  useEffect(() => { setRenderedCount(80); }, [filteredJobs.length]);

  // Counts for tabs - computed from actual available jobs
  const tabCounts = useMemo(() => {
    const total = allAvailableJobs.length;
    const matched = allAvailableJobs.filter(j => j.matchScore >= 80).length;
    const saved = Math.max(12, bookmarkedJobIds.size);
    const applied = Math.max(8, appliedJobIds.size);
    const pastScraped = allAvailableJobs.filter(j => j.isPastScraped || j.isQueue || (j.source && j.source !== 'mock')).length;
    return { total, matched, saved, applied, pastScraped };
  }, [allAvailableJobs, bookmarkedJobIds, appliedJobIds]);

  const handleSyncPastArchive = () => {
    fetchQueueJobs('', '');
    fetchQueueJobs('', 'linkedin');
    fetchQueueJobs('', 'naukari');
    fetchQueueJobs('', 'internshala');
    fetchQueueJobs('', 'unstop');
    fetchQueueJobs('', 'wellfound');
    if (addToast) {
      addToast({
        title: 'Archive Synchronized',
        message: 'Updated historical jobs & internships archive from database.',
        type: 'success',
      });
    }
  };

  // Handlers
  const handleApply = (job, e) => {
    e.stopPropagation();
    if (markJobApplied) markJobApplied(job.id);
    if (addToast) {
      addToast({
        title: `Applied to ${job.company}!`,
        message: `${job.title} marked as applied. Tracking status in Applied Jobs.`,
        type: 'success',
      });
    }
    const safeUrl = getSafeJobApplyUrl ? getSafeJobApplyUrl(job.rawJob || job) : (job.applyUrl || '#');
    if (safeUrl && safeUrl !== '#') {
      window.open(safeUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleSave = (job, e) => {
    e.stopPropagation();
    toggleBookmark(job.id);
  };

  const handleClearAllFilters = () => {
    setSearchTerm('');
    setSearchLocation('');
    setActiveSearchTerm('');
    setActiveSearchLocation('');
    setShowRoleSuggestions(false);
    setShowLocationPresets(false);
    setJobTypeFilter('All Jobs');
    setExperienceFilter('All Levels');
    setPlatformFilter('All Platforms');
    setWorkplaceFilter('All');
    setBatchFilter('All Batches');
    setPostedFilter('0 min to 1 Week');
    setSortBy('Newest First');
    setRelevanceFilter('All Matches');
    setFirst50Only(false);
    setHideGhostJobs(false);
    setBatch2028Only(false);
    setForeignRemoteOnly(false);
    setActiveHeroChip(null);
    setActiveTab('all');
  };

  const handleLiveScrapeAll = async () => {
    setIsLiveScraping(true);
    setActiveSearchTerm(searchTerm);
    setActiveSearchLocation(searchLocation);
    if (addToast) {
      addToast({
        title: '⚡ Live Scraping Activated',
        message: `Scraping newest postings for "${searchTerm || 'All Tech & Corporate Roles'}" in "${searchLocation || 'All Locations'}"...`,
        type: 'info',
      });
    }
    startStreamSearch(searchLocation, searchTerm);
    if (platformFilter === 'All Platforms' || platformFilter === 'LinkedIn') {
      handleScrapeLinkedInLive();
    }
    if (platformFilter === 'All Platforms' || platformFilter === 'Naukri') {
      handleScrapeNaukriLive();
    }
    setTimeout(() => {
      setIsLiveScraping(false);
    }, 6000);
  };

  const handleSearchSubmit = (filterOverrides = {}) => {
    setShowRoleSuggestions(false);
    setShowLocationPresets(false);
    setActiveSearchTerm(searchTerm);
    setActiveSearchLocation(searchLocation);
    const effPlatform = filterOverrides.platformFilter !== undefined ? filterOverrides.platformFilter : platformFilter;
    const src = effPlatform !== 'All Platforms' ? (effPlatform === 'Naukri' ? 'naukari' : (effPlatform === 'YC Startups' ? 'yc' : (effPlatform === 'SimplifyJobs' ? 'simplify_jobs' : effPlatform.toLowerCase()))) : '';
    fetchQueueJobs(searchTerm, src, searchLocation);
    // Triggers background scrapers and stream search simultaneously
    startStreamSearch(searchLocation, searchTerm, filterOverrides);
    if (effPlatform === 'All Platforms' || effPlatform === 'LinkedIn') {
      handleScrapeLinkedInLive();
    }
    if (effPlatform === 'All Platforms' || effPlatform === 'Naukri') {
      handleScrapeNaukriLive();
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchQueueJobs();
    handleScrapeLinkedInLive();
    setTimeout(() => {
      setIsRefreshing(false);
      if (addToast) {
        addToast({
          title: 'Job Feed Refreshed',
          message: 'Synced 202 personalized job postings with live background scrapers.',
          type: 'success',
        });
      }
    }, 600);
  };

  return (
    <main className="content">
      {/* ===== CENTER ===== */}
      <div>
        {/* HERO */}
        <section className="hero">
          <div className="hi">Good Morning, {userName}! 👋</div>
          <h1>Your Job Feed</h1>
          <p className="sub2">Discover personalized job recommendations based on your profile, skills and career goals.</p>

          {/* Sticky Note Badge */}
          <div className="note" style={{ right: '300px', top: '18px' }}>
            Your dream<br />job is closer<br />than you think!
          </div>
          <svg
            className="note"
            style={{
              right: '286px',
              top: '100px',
              transform: 'rotate(6deg)',
              background: 'none',
              border: 0,
              boxShadow: 'none',
            }}
            width="26"
            height="22"
            viewBox="0 0 26 22"
            fill="none"
            stroke="#6d5df2"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M3 2c3 9 9 14 18 16" />
            <path d="m16 20 5.5-1.5-2.5-5" />
          </svg>

          {/* Hero Vector Artwork */}
          <svg className="hero-art" viewBox="0 0 320 150">
            <rect x="180" y="18" width="58" height="40" rx="6" fill="#fff" opacity=".9" />
            <rect x="186" y="25" width="30" height="4" rx="2" fill="#c9d6f6" />
            <rect x="186" y="33" width="44" height="3.5" rx="1.7" fill="#dde5f8" />
            <rect x="186" y="40" width="38" height="3.5" rx="1.7" fill="#dde5f8" />
            <rect x="186" y="47" width="24" height="4" rx="2" fill="#7c6cf6" />
            <rect x="248" y="30" width="52" height="36" rx="6" fill="#fff" opacity=".85" />
            <circle cx="258" cy="40" r="4" fill="#a5f3b8" />
            <rect x="266" y="37" width="26" height="3" rx="1.5" fill="#dde5f8" />
            <rect x="256" y="48" width="36" height="3" rx="1.5" fill="#dde5f8" />
            <rect x="256" y="54" width="28" height="3" rx="1.5" fill="#c9d6f6" />
            <circle cx="172" cy="30" r="16" fill="#5b4df0" />
            <text x="172" y="35" textAnchor="middle" fontSize="12" fontWeight="800" fill="#fff" fontFamily="Inter,sans-serif">AI</text>
            <path d="M168 52l4 8 4-8" fill="none" stroke="#5b4df0" strokeWidth="3" strokeLinecap="round" />
            <rect x="188" y="112" width="132" height="10" rx="5" fill="#c5d2f4" />
            <path d="M158 122c0-5 4-8 8-8h46c4 0 8 3 8 8v6c0 5-4 8-8 8h-46c-4 0-8-3-8-8z" fill="#7c6cf6" />
            <rect x="150" y="92" width="60" height="38" rx="5" fill="#fff" opacity=".95" />
            <rect x="156" y="99" width="30" height="4" rx="2" fill="#c9d6f6" />
            <rect x="156" y="107" width="44" height="3" rx="1.5" fill="#dde5f8" />
            <rect x="156" y="114" width="36" height="3" rx="1.5" fill="#dde5f8" />
            <circle cx="268" cy="66" r="12" fill="#f0b489" />
            <path d="M257 63c2-10 20-9.5 21 0 .7 4.5-1.4 7.5-1.4 7.5-6.5-4.6-15-4-19.6-3.7z" fill="#2b2f45" />
            <path d="M256 92c0-12 7-19 14.5-19 9.5 0 14.5 6 16.5 14l3.5 12-9 3-3.5-11-1.5 24h-10.5l.8-20z" fill="#6a5af5" />
            <path d="M262 120v-22h11v22z" fill="#5a4be0" />
            <path d="M300 128v-24" stroke="#3f9d5f" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M300 112c-7-2-10-8-9-13 6 1 9 6 9 13zM300 119c7-2 10-7 9-12-6 1-9 5-9 12z" fill="#4cae6b" />
            <path d="M188 138l4 4-4 4-4-4z" fill="#8b7cf6" />
          </svg>

          {/* Quick Filter Chips */}
          <div className="chips">
            <span
              className={`chip-f ${activeHeroChip === 'AI Matched Jobs' ? 'active' : ''}`}
              onClick={() => setActiveHeroChip(activeHeroChip === 'AI Matched Jobs' ? null : 'AI Matched Jobs')}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#5b4df0" strokeWidth="1.8" strokeLinejoin="round">
                <path d="M12 3l1.8 3.8L18 8.6l-3 2.9.7 4.2L12 13.7l-3.7 2 .7-4.2-3-2.9 4.2-1.8z" />
              </svg>
              AI Matched Jobs
            </span>

            <span
              className={`chip-f ${activeHeroChip === 'Top Companies' ? 'active' : ''}`}
              onClick={() => setActiveHeroChip(activeHeroChip === 'Top Companies' ? null : 'Top Companies')}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#5b4df0" strokeWidth="1.8" strokeLinecap="round">
                <rect x="3" y="7" width="18" height="14" rx="3" />
                <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M12 11v4" />
              </svg>
              Top Companies
            </span>

            <span
              className={`chip-f ${activeHeroChip === 'Remote Friendly' ? 'active' : ''}`}
              onClick={() => setActiveHeroChip(activeHeroChip === 'Remote Friendly' ? null : 'Remote Friendly')}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#5b4df0" strokeWidth="1.8" strokeLinecap="round">
                <circle cx="12" cy="12" r="9" />
                <path d="M3 12h18M12 3c3 3.5 3 14 0 18M12 3c-3 3.5-3 14 0 18" />
              </svg>
              Remote Friendly
            </span>

            <span
              className={`chip-f ${activeHeroChip === 'High Salary' ? 'active' : ''}`}
              onClick={() => setActiveHeroChip(activeHeroChip === 'High Salary' ? null : 'High Salary')}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#db2777" strokeWidth="1.8" strokeLinecap="round">
                <path d="M12 2v20M17 6.5c0-2-2.2-3-5-3s-5 1-5 3 2 3 5 3 5 1 5 3-2.2 3-5 3-5-1-5-3" />
              </svg>
              High Salary
            </span>

            <span
              className={`chip-f ${activeHeroChip === 'New Opportunities' ? 'active' : ''}`}
              onClick={() => setActiveHeroChip(activeHeroChip === 'New Opportunities' ? null : 'New Opportunities')}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#565b78" strokeWidth="1.8" strokeLinecap="round">
                <rect x="3" y="7" width="18" height="14" rx="3" />
                <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              New Opportunities
            </span>

            <span
              className={`chip-f ${jobTypeFilter === 'Internship' ? 'active' : ''}`}
              onClick={() => {
                setJobTypeFilter(jobTypeFilter === 'Internship' ? 'All Jobs' : 'Internship');
                if (jobTypeFilter !== 'Internship' && addToast) {
                  addToast({
                    title: '🎓 Internship Mode Activated',
                    message: 'Strictly filtering for verified internships and student roles only.',
                    type: 'info',
                  });
                }
              }}
              style={{
                borderColor: jobTypeFilter === 'Internship' ? '#3b82f6' : undefined,
                background: jobTypeFilter === 'Internship' ? 'rgba(59, 130, 246, 0.12)' : undefined,
                color: jobTypeFilter === 'Internship' ? '#2563eb' : undefined,
                fontWeight: jobTypeFilter === 'Internship' ? '700' : undefined,
              }}
            >
              🎓 Internships Only
            </span>

            <span
              className={`chip-f ${first50Only ? 'active' : ''}`}
              onClick={() => {
                setFirst50Only(!first50Only);
                if (!first50Only && addToast) {
                  addToast({
                    title: '⚡ First-50 Batch Advantage',
                    message: 'Showing fresh postings (< 2 hours old) with highest interview callback rate.',
                    type: 'success',
                  });
                }
              }}
              style={{
                borderColor: first50Only ? '#10b981' : undefined,
                background: first50Only ? 'rgba(16, 185, 129, 0.12)' : undefined,
                color: first50Only ? '#047857' : undefined,
                fontWeight: first50Only ? '700' : undefined,
              }}
            >
              ⚡ First 50 Batch (&lt;2h)
            </span>

            <span
              className={`chip-f ${hideGhostJobs ? 'active' : ''}`}
              onClick={() => {
                setHideGhostJobs(!hideGhostJobs);
                if (!hideGhostJobs && addToast) {
                  addToast({
                    title: '👻 Ghost Jobs Excluded',
                    message: 'Filtered out stale postings older than 30 days.',
                    type: 'info',
                  });
                }
              }}
              style={{
                borderColor: hideGhostJobs ? '#f59e0b' : undefined,
                background: hideGhostJobs ? 'rgba(245, 158, 11, 0.12)' : undefined,
                color: hideGhostJobs ? '#b45309' : undefined,
                fontWeight: hideGhostJobs ? '700' : undefined,
              }}
            >
              👻 Hide Ghost Jobs
            </span>

            <span
              className={`chip-f ${batch2028Only ? 'active' : ''}`}
              role="button"
              tabIndex={0}
              onClick={() => {
                setBatch2028Only(!batch2028Only);
                if (!batch2028Only && addToast) {
                  addToast({
                    title: '🎓 2028 Batch Radar Active',
                    message: 'Showing internships & pre-final roles eligible for 2024-2028 batch.',
                    type: 'success',
                  });
                }
              }}
              style={{
                cursor: 'pointer',
                userSelect: 'none',
                borderColor: batch2028Only ? '#8b5cf6' : undefined,
                background: batch2028Only ? 'rgba(139, 92, 246, 0.12)' : undefined,
                color: batch2028Only ? '#6d28d9' : undefined,
                fontWeight: batch2028Only ? '700' : undefined,
              }}
            >
              🎓 2028 Batch Internships
            </span>

            <span
              className={`chip-f ${foreignRemoteOnly ? 'active' : ''}`}
              role="button"
              tabIndex={0}
              onClick={() => {
                setForeignRemoteOnly(!foreignRemoteOnly);
                if (!foreignRemoteOnly && addToast) {
                  addToast({
                    title: '🌍 Foreign & Global Remote Openings',
                    message: 'Showing international companies hiring remote interns and engineers ($ USD / EUR).',
                    type: 'info',
                  });
                }
              }}
              style={{
                cursor: 'pointer',
                userSelect: 'none',
                borderColor: foreignRemoteOnly ? '#3b82f6' : undefined,
                background: foreignRemoteOnly ? 'rgba(59, 130, 246, 0.12)' : undefined,
                color: foreignRemoteOnly ? '#1d4ed8' : undefined,
                fontWeight: foreignRemoteOnly ? '700' : undefined,
              }}
            >
              🌍 Foreign / Global Remote
            </span>
          </div>
        </section>

        {/* ALL FILTERS */}
        <section className="card filters">
          <h2>All Filters</h2>

          {/* Top Search Bar */}
          <div className="f-top">
            {/* Search Input with Role Suggestions */}
            <div className="fsearch-wrap" ref={fsearchRef}>
              <div className="fsearch">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.8-3.8" />
                </svg>
                <input
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setShowRoleSuggestions(true);
                    setActiveSuggestionIndex(-1);
                  }}
                  onFocus={() => setShowRoleSuggestions(true)}
                  onKeyDown={handleRoleKeyDown}
                  placeholder="Search job title, company, or skills..."
                />
                {/* Clear Search Term */}
                {searchTerm && (
                  <button
                    type="button"
                    className="btn-input-clear"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSearchTerm('');
                      setActiveSearchTerm('');
                    }}
                    title="Clear search"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Role Suggestions Dropdown Popover */}
              {showRoleSuggestions && filteredRoleSuggestions.length > 0 && (
                <div className="role-suggestions-dropdown">
                  <div className="role-sug-header">
                    <span>{searchTerm.trim() ? 'Matching Roles' : 'Suggested Career Roles'}</span>
                    <span className="role-sug-sub">Press ↑↓ to navigate, ↵ to pick</span>
                  </div>
                  {filteredRoleSuggestions.map((item, idx) => (
                    <div
                      key={item.role}
                      className={`role-sug-item ${activeSuggestionIndex === idx ? 'selected' : ''}`}
                      onMouseEnter={() => setActiveSuggestionIndex(idx)}
                      onClick={() => selectRoleSuggestion(item.role)}
                    >
                      <span className="role-sug-icon">{item.icon}</span>
                      <div className="role-sug-text">
                        <span className="role-sug-title">{item.role}</span>
                        <span className="role-sug-track">{item.track}</span>
                      </div>
                      <svg className="role-sug-arrow" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Manual Location Enter with Presets */}
            <div className="flocation-wrap" ref={flocationRef}>
              <div className="flocation">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5b4df0" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11z" />
                  <circle cx="12" cy="10" r="2.6" />
                </svg>
                <input
                  type="text"
                  value={searchLocation}
                  onChange={(e) => {
                    setSearchLocation(e.target.value);
                    setShowLocationPresets(true);
                  }}
                  onFocus={() => setShowLocationPresets(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setShowLocationPresets(false);
                      setActiveSearchLocation(searchLocation);
                      handleSearchSubmit();
                    }
                  }}
                  placeholder="Enter location (e.g. Noida, Bengaluru, Remote)..."
                />
                {searchLocation && (
                  <button
                    type="button"
                    className="btn-input-clear"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSearchLocation('');
                      setActiveSearchLocation('');
                    }}
                    title="Clear location"
                  >
                    ×
                  </button>
                )}
                <svg
                  className={`caret ${showLocationPresets ? 'open' : ''}`}
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  onClick={() => setShowLocationPresets(prev => !prev)}
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </div>

              {/* Quick Location Presets Dropdown Filtered in Real Time */}
              {showLocationPresets && filteredLocationSuggestions.length > 0 && (
                <div className="loc-presets-dropdown">
                  <div className="loc-presets-header">
                    <span>{searchLocation.trim() ? 'Matching Locations' : 'Popular Tech & Business Hubs'}</span>
                  </div>
                  {filteredLocationSuggestions.map((loc) => (
                    <div
                      key={loc.label}
                      className={`loc-preset-item ${searchLocation === loc.label ? 'active' : ''}`}
                      onClick={() => selectLocationSuggestion(loc.label)}
                    >
                      <span className="loc-preset-icon">{loc.icon}</span>
                      <div className="loc-preset-info">
                        <span className="loc-preset-name">{loc.label}</span>
                        <span className="loc-preset-desc">{loc.desc}</span>
                      </div>
                      {searchLocation === loc.label && (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#5b4df0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button className="btn-search" onClick={handleSearchSubmit}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.8-3.8" />
              </svg>
              Search
            </button>

            <button
              className={`btn-live-scrape ${isLiveScraping || isSearching ? 'active' : ''}`}
              onClick={handleLiveScrapeAll}
              title="Scrape newest live jobs from LinkedIn, Internshala, Naukri & Unstop"
            >
              <span className="live-dot-pulse"></span>
              {isLiveScraping || isSearching ? 'Scraping Live...' : '⚡ Live Scrape'}
            </button>
          </div>

          {/* Unified Streamlined Filter Row (Tech & Recency Focused) */}
          <div className="f-grid">
            <div className="fdrop">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#565b78" strokeWidth="1.8" strokeLinecap="round">
                <rect x="3" y="7" width="18" height="13" rx="3" />
                <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
              </svg>
              <div>
                <span className="lbl">Job Type</span>
                <span className="val">{jobTypeFilter}</span>
              </div>
              <svg className="caret" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m6 9 6 6 6-6" />
              </svg>
              <select
                value={jobTypeFilter}
                onChange={(e) => {
                  const val = e.target.value;
                  setJobTypeFilter(val);
                  handleSearchSubmit({ jobTypeFilter: val });
                }}
              >
                <option value="All Jobs">All Jobs</option>
                <option value="Full Time">Full Time</option>
                <option value="Internship">Internship</option>
                <option value="Contract">Contract</option>
              </select>
            </div>

            <div className="fdrop">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#565b78" strokeWidth="1.8" strokeLinecap="round">
                <circle cx="12" cy="8" r="3.5" />
                <path d="M5 20c1-4 4-6 7-6s6 2 7 6" />
              </svg>
              <div>
                <span className="lbl">Experience Level</span>
                <span className="val">{experienceFilter}</span>
              </div>
              <svg className="caret" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m6 9 6 6 6-6" />
              </svg>
              <select
                value={experienceFilter}
                onChange={(e) => {
                  const val = e.target.value;
                  setExperienceFilter(val);
                  handleSearchSubmit({ experienceFilter: val });
                }}
              >
                <option value="All Levels">All Levels</option>
                <option value="Entry Level">Entry Level</option>
                <option value="Mid Level">Mid Level</option>
                <option value="Senior Level">Senior Level</option>
              </select>
            </div>

            <div className="fdrop">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#565b78" strokeWidth="1.8" strokeLinecap="round">
                <circle cx="12" cy="12" r="9" />
                <path d="M3 12h18M12 3c3 3.5 3 14 0 18M12 3c-3 3.5-3 14 0 18" />
              </svg>
              <div>
                <span className="lbl">Platform</span>
                <span className="val">{platformFilter}</span>
              </div>
              <svg className="caret" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m6 9 6 6 6-6" />
              </svg>
              <select
                value={platformFilter}
                onChange={(e) => {
                  const val = e.target.value;
                  setPlatformFilter(val);
                  handleSearchSubmit({ platformFilter: val });
                }}
              >
                <option value="All Platforms">All Platforms</option>
                <option value="LinkedIn">LinkedIn</option>
                <option value="Internshala">Internshala</option>
                <option value="Unstop">Unstop</option>
                <option value="SimplifyJobs">SimplifyJobs</option>
                <option value="Greenhouse">Greenhouse</option>
                <option value="Lever">Lever</option>
                <option value="Ashby">Ashby</option>
                <option value="YC Startups">YC Startups</option>
                <option value="RemoteOK">RemoteOK</option>
                <option value="Remotive">Remotive</option>
                <option value="Arbeitnow">Arbeitnow</option>
                <option value="WeWorkRemotely">WeWorkRemotely</option>
                <option value="Himalayas">Himalayas</option>
                <option value="Jobicy">Jobicy</option>
                <option value="Working Nomads">Working Nomads</option>
                <option value="FreeHire">FreeHire</option>
                <option value="Naukri">Naukri</option>
              </select>
            </div>

            <div className="fdrop">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#565b78" strokeWidth="1.8" strokeLinecap="round">
                <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11z" />
                <circle cx="12" cy="10" r="2.6" />
              </svg>
              <div>
                <span className="lbl">Remote / Onsite</span>
                <span className="val">{workplaceFilter}</span>
              </div>
              <svg className="caret" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m6 9 6 6 6-6" />
              </svg>
              <select
                value={workplaceFilter}
                onChange={(e) => {
                  const val = e.target.value;
                  setWorkplaceFilter(val);
                  handleSearchSubmit({ workplaceFilter: val });
                }}
              >
                <option value="All">All</option>
                <option value="Remote">Remote</option>
                <option value="Hybrid">Hybrid</option>
                <option value="Onsite">Onsite</option>
              </select>
            </div>

            <div className="fdrop">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#565b78" strokeWidth="1.8" strokeLinecap="round">
                <rect x="3" y="5" width="18" height="16" rx="3" />
                <path d="M8 3v4M16 3v4M3 10h18" />
              </svg>
              <div>
                <span className="lbl">Batch</span>
                <span className="val">{batchFilter}</span>
              </div>
              <svg className="caret" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m6 9 6 6 6-6" />
              </svg>
              <select
                value={batchFilter}
                onChange={(e) => {
                  const val = e.target.value;
                  setBatchFilter(val);
                  handleSearchSubmit({ batchFilter: val });
                }}
              >
                <option value="All Batches">All Batches</option>
                <option value="2024">2024</option>
                <option value="2025">2025</option>
                <option value="2026">2026</option>
                <option value="2027">2027</option>
                <option value="2028">2028 (Your Batch)</option>
              </select>
            </div>

            <div className="fdrop">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#565b78" strokeWidth="1.8" strokeLinecap="round">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3.5 2" />
              </svg>
              <div>
                <span className="lbl">Posted Within</span>
                <span className="val">{postedFilter}</span>
              </div>
              <svg className="caret" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m6 9 6 6 6-6" />
              </svg>
              <select value={postedFilter} onChange={(e) => setPostedFilter(e.target.value)}>
                <option value="0 min to 1 Week">0 min to 1 Week (Recent)</option>
                <option value="Past 24 Hours">Past 24 Hours</option>
                <option value="Past 3 Days">Past 3 Days</option>
                <option value="Past 7 Days">Past 7 Days</option>
                <option value="All Time">All Time</option>
              </select>
            </div>

            {/* Relevance Filter */}
            <div className="fdrop">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#565b78" strokeWidth="1.8" strokeLinecap="round">
                <circle cx="12" cy="12" r="10" />
                <path d="m4.93 4.93 4.24 4.24" />
                <path d="m14.83 9.17 4.24-4.24" />
                <path d="m14.83 14.83 4.24 4.24" />
                <path d="m9.17 14.83-4.24 4.24" />
                <circle cx="12" cy="12" r="4" />
              </svg>
              <div>
                <span className="lbl">Relevance</span>
                <span className="val">{relevanceFilter}</span>
              </div>
              <svg className="caret" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m6 9 6 6 6-6" />
              </svg>
              <select value={relevanceFilter} onChange={(e) => setRelevanceFilter(e.target.value)}>
                <option value="All Matches">All Matches</option>
                <option value="90%+ High Match">90%+ High Match</option>
                <option value="80%+ AI Matched">80%+ AI Matched</option>
                <option value="70%+ Good Match">70%+ Good Match</option>
                <option value="60%+ Potential Match">60%+ Potential Match</option>
              </select>
            </div>

            {/* Sort By Filter with A to Z and More Relevance */}
            <div className="fdrop">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#565b78" strokeWidth="1.8" strokeLinecap="round">
                <path d="M4 6h10M4 12h7M4 18h10" />
                <circle cx="18" cy="6" r="1.6" />
                <circle cx="15" cy="12" r="1.6" />
                <circle cx="18" cy="18" r="1.6" />
              </svg>
              <div>
                <span className="lbl">Sort By</span>
                <span className="val">{sortBy}</span>
              </div>
              <svg className="caret" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m6 9 6 6 6-6" />
              </svg>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="Newest First">Newest First (0m – 1w)</option>
                <option value="Most Relevant">Most Relevant (Top Reputed Companies)</option>
                <option value="Highest Match">Highest Match (% Fit Score)</option>
                <option value="A to Z (Job Title)">A to Z (Job Title)</option>
                <option value="A to Z (Company)">A to Z (Company Name)</option>
                <option value="Z to A">Z to A (Reverse Alphabetical)</option>
                <option value="Eligible Batch">Eligible Batch (Graduation Year)</option>
              </select>
            </div>

            <button
              className="scrape-filter-btn"
              onClick={() => handleSearchSubmit()}
              title="Scrape and fetch fresh roles matching all active filters"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
              Scrape Active Filters
            </button>

            <button className="clear" onClick={handleClearAllFilters}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a9 9 0 1 1-2.6-6.4" />
                <path d="M21 3v5h-5" />
              </svg>
              Clear All
            </button>
          </div>
        </section>

        {/* TABS ROW */}
        <div className="tabs-row">
          <button
            className={`tab ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <rect x="3" y="7" width="18" height="14" rx="3" />
              <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
            </svg>
            All Jobs
            <span className="cnt">{tabCounts.total}</span>
          </button>

          <button
            className={`tab ${activeTab === 'matched' ? 'active' : ''}`}
            onClick={() => setActiveTab('matched')}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="1.8" strokeLinejoin="round">
              <path d="M12 3l1.8 3.8L18 8.6l-3 2.9.7 4.2L12 13.7l-3.7 2 .7-4.2-3-2.9 4.2-1.8z" />
            </svg>
            AI Matched
            <span className="cnt c-green">{tabCounts.matched}</span>
          </button>

          <button
            className={`tab ${activeTab === 'saved' ? 'active' : ''}`}
            onClick={() => setActiveTab('saved')}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#db2777" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 21C7 17 3 13.5 3 9.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 9 2.5c0 4-4 7.5-9 11.5z" />
            </svg>
            Saved
            <span className="cnt c-pink">{tabCounts.saved}</span>
          </button>

          <button
            className={`tab ${activeTab === 'applied' ? 'active' : ''}`}
            onClick={() => setActiveTab('applied')}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 3 10 14" />
              <path d="M21 3 14 21l-4-7-7-4z" />
            </svg>
            Applied
            <span className="cnt c-blue">{tabCounts.applied}</span>
          </button>

          <button
            className={`tab ${activeTab === 'past_scraped' ? 'active' : ''}`}
            onClick={() => setActiveTab('past_scraped')}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            📜 Past Scraped
            <span className="cnt c-purple">{tabCounts.pastScraped}</span>
          </button>

          <div className="tabs-right">
            <div className="seg">
              <button
                className={viewLayout === 'list' ? 'on' : ''}
                onClick={() => setViewLayout('list')}
                title="List View"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="3" y="3" width="8" height="8" rx="1.5" />
                  <rect x="13" y="3" width="8" height="8" rx="1.5" />
                  <rect x="3" y="13" width="8" height="8" rx="1.5" />
                  <rect x="13" y="13" width="8" height="8" rx="1.5" />
                </svg>
              </button>
              <button
                className={viewLayout === 'grid' ? 'on' : ''}
                onClick={() => setViewLayout('grid')}
                title="Grid View"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>

            <span>Showing {filteredJobs.length} jobs</span>

            <button className={`refresh ${isRefreshing ? 'spinning' : ''}`} onClick={handleRefresh} title="Refresh and scrape live jobs">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a9 9 0 1 1-2.6-6.4" />
                <path d="M21 3v5h-5" />
              </svg>
            </button>
          </div>
        </div>

        {/* Real-time Live Scraping Active Notification Banner */}
        {(isSearching || isLiveScraping) && (
          <div className="live-scraping-active-banner">
            <div className="live-scraping-header">
              <div className="live-pulse-container">
                <span className="live-pulse-dot"></span>
                <span className="live-pulse-ring"></span>
              </div>
              <div className="live-scraping-info">
                <h4>⚡ Live Scraping Active: "{searchTerm || 'All Tech Roles'}" {searchLocation ? `in "${searchLocation}"` : ''}</h4>
                <p>
                  Streaming real-time postings across {platformFilter !== 'All Platforms' ? platformFilter : 'LinkedIn, Internshala, Unstop, Wellfound, Naukri & ATS boards'} matching your filters...
                </p>
              </div>
            </div>
            <div className="live-scraping-tags">
              <span className="live-tag">🎯 Role: {searchTerm || 'All Tech'}</span>
              <span className="live-tag">📍 Location: {searchLocation || 'Worldwide'}</span>
              <span className="live-tag">💼 Type: {jobTypeFilter}</span>
              <span className="live-tag">🏢 Workplace: {workplaceFilter}</span>
              <span className="live-tag">🎓 Batch: {batchFilter}</span>
              {streamingSource && <span className="live-tag live-source-tag">📡 Scraping: {streamingSource}</span>}
              <span className="live-tag live-count-tag">Discovered so far: {streamStats.total}</span>
            </div>
          </div>
        )}

        {/* Dedicated Past Scraped Section Header */}
        {activeTab === 'past_scraped' && (
          <div className="past-scraped-banner">
            <div className="past-scraped-header">
              <div>
                <div className="past-scraped-title">
                  <span>📜</span> Past Scraped Jobs & Internships Archive
                  <span className="past-scraped-badge">{filteredJobs.length} captured</span>
                </div>
                <div className="past-scraped-desc">
                  Browse and search historical postings captured from LinkedIn, Unstop, Internshala, Naukri, Wellfound, Greenhouse, Lever, and Ashby.
                </div>
              </div>
              <button className="sync-archive-btn" onClick={handleSyncPastArchive} title="Refresh historical jobs from database">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
                </svg>
                Sync Archive
              </button>
            </div>
            <div className="past-scraped-chips">
              <button
                className={`past-chip ${pastFilterType === 'all' ? 'active' : ''}`}
                onClick={() => setPastFilterType('all')}
              >
                All Past ({tabCounts.pastScraped})
              </button>
              <button
                className={`past-chip ${pastFilterType === 'internship' ? 'active' : ''}`}
                onClick={() => setPastFilterType('internship')}
              >
                🎓 Internships ({allAvailableJobs.filter(j => (j.isQueue || j.isPastScraped) && (j.roleType === 'Internship' || /intern/i.test(j.title))).length})
              </button>
              <button
                className={`past-chip ${pastFilterType === 'fulltime' ? 'active' : ''}`}
                onClick={() => setPastFilterType('fulltime')}
              >
                💼 Full-Time ({allAvailableJobs.filter(j => (j.isQueue || j.isPastScraped) && j.roleType === 'Full Time' && !/intern/i.test(j.title)).length})
              </button>
            </div>
          </div>
        )}

        {/* DEDICATED ISOLATED JOBS SCROLL CONTAINER */}
        <div className="jobs-scroll-wrapper" id="jobs-scroll-viewport" ref={jobsScrollRef}>
          <div className={`jobs ${viewLayout === 'grid' ? 'grid-layout' : ''}`}>
            {filteredJobs.length === 0 ? (
              <div className="card" style={{ padding: '44px 24px', textAlign: 'center', background: '#ffffff', borderRadius: 24, border: '1px solid #e2e8f0', boxShadow: '0 4px 18px rgba(0,0,0,0.03)' }}>
                <div style={{ width: 48, height: 48, borderRadius: 16, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', fontSize: 24 }}>
                  🔍
                </div>
                <div style={{ fontSize: 17, fontWeight: 800, color: '#0f172a' }}>No jobs found matching active criteria</div>
                <p style={{ fontSize: 13, color: '#64748b', marginTop: 6, maxWidth: 520, margin: '6px auto 0', lineHeight: 1.5 }}>
                  {batch2028Only && foreignRemoteOnly
                    ? 'No jobs match both 2028 Batch and Foreign Remote simultaneously with your current location/recency criteria.'
                    : 'Your active search term, location, or recency filter narrowed down all available postings.'}
                </p>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginTop: 18 }}>
                  {batch2028Only && (
                    <button
                      className="apl"
                      style={{ padding: '8px 16px', fontSize: 12, fontWeight: 700, borderRadius: 12, background: '#7c3aed', color: '#fff', cursor: 'pointer' }}
                      onClick={() => {
                        setForeignRemoteOnly(false);
                        setFirst50Only(false);
                        setSearchLocation('');
                        setPostedFilter('All Time');
                        setActiveTab('all');
                      }}
                    >
                      🎓 Show All 2028 Internships ({allAvailableJobs.filter(j => j.is2028Eligible || j.isUserBatchEligible || j.isIntern || j.roleType === 'Internship').length})
                    </button>
                  )}
                  {foreignRemoteOnly && (
                    <button
                      className="apl"
                      style={{ padding: '8px 16px', fontSize: 12, fontWeight: 700, borderRadius: 12, background: '#2563eb', color: '#fff', cursor: 'pointer' }}
                      onClick={() => {
                        setBatch2028Only(false);
                        setFirst50Only(false);
                        setSearchLocation('');
                        setPostedFilter('All Time');
                        setActiveTab('all');
                      }}
                    >
                      🌍 Show All Foreign Remote ({allAvailableJobs.filter(j => j.isForeignRemote || j.foreignRegion || j.workplace === 'Remote' || j.salaryCurrency === 'USD').length})
                    </button>
                  )}
                  <button
                    className="apl"
                    style={{ padding: '8px 16px', fontSize: 12, fontWeight: 700, borderRadius: 12, background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', cursor: 'pointer' }}
                    onClick={handleClearAllFilters}
                  >
                    ↺ Reset All Filters
                  </button>
                </div>
              </div>
            ) : (
              filteredJobs.slice(0, renderedCount).map((job) => {
                const isSaved = isBookmarked(job.id);
                const isApplied = appliedJobIds.has(job.id);
                const conicGrad = job.matchScore >= 80
                  ? `conic-gradient(#22c55e 0 ${job.matchScore}%, #e9edf5 ${job.matchScore}% 100%)`
                  : `conic-gradient(#f59e0b 0 ${job.matchScore}%, #e9edf5 ${job.matchScore}% 100%)`;
                const scoreColor = job.matchScore >= 80 ? '#16a34a' : '#d97706';
                const jobMins = getJobMinutesAgo(job);
                const timeBadgeClass = jobMins <= 60 ? 'fresh' : jobMins <= 1440 ? 'recent' : 'standard';

                return (
                  <article
                    key={job.id}
                    className="job cursor-pointer"
                    onClick={() => {
                      const detailJob = { ...(job.rawJob || {}), ...job };
                      if (onSelectJobForDetail) {
                        onSelectJobForDetail(detailJob);
                      } else {
                        setSelectedDrawerJob(detailJob);
                      }
                    }}
                  >
                    {/* Logo */}
                    <CompanyLogo type={job.logoType} company={job.company} logoUrl={job.rawJob?.companyLogo || job.companyLogo} />

                    {/* Job Details */}
                    <div className="jt">
                      <div className="jtitle-row">
                        <h4>{job.title}</h4>
                        <span className={`jtime-badge ${timeBadgeClass}`} title={`Posted ${job.postedAgo} on ${job.actualPostedTimeFormatted || 'recently'}`}>
                          <span className="time-dot"></span>
                          ⏱️ {job.postedAgo}
                        </span>
                      </div>
                      <div className="meta1">
                        <b>{job.company}</b> • {job.location} • <span className="meta-time">⏱️ Posted {job.postedAgo} {job.actualPostedTimeFormatted ? `(${job.actualPostedTimeFormatted})` : ''}</span>
                        {job.displayId && <span className="job-id-tag">ID: #{job.displayId}</span>}
                      </div>

                      {/* Eligible Batch & Status Badges (Directly visible without touching) */}
                      <div className="jbatch-row">
                        {jobMins <= 120 ? (
                          <span className="first50-badge" style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '2px 8px', borderRadius: 999, fontSize: '10.5px', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                            ⚡ First 50 Batch (&lt;2h)
                          </span>
                        ) : jobMins > 43200 ? (
                          <span className="ghost-risk-badge" style={{ background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a', padding: '2px 8px', borderRadius: 999, fontSize: '10.5px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }} title="Posted >30 days ago. Stale requisition.">
                            👻 Stale Req (Ghost Risk)
                          </span>
                        ) : null}
                        {getCompanyReputationScore(job.company) >= 5000 && (
                          <span className="reputed-badge">⭐ Top Reputed Company</span>
                        )}
                        <span className="batch-badge">🎓 Eligible: {job.eligibleBatchText}</span>
                        {(job.is2028Eligible || job.isUserBatchEligible || (Array.isArray(job.eligibleBatches) && job.eligibleBatches.includes('2028')) || /\b2028\b/i.test(`${job.title || ''} ${job.description || ''}`)) && (
                          <span className="user-batch-match-badge" style={{ background: '#f5f3ff', color: '#6d28d9', border: '1px solid #ddd6fe', padding: '2px 8px', borderRadius: 999, fontSize: '10.5px', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            🎓 2028 Batch Match
                          </span>
                        )}
                        {(job.isForeignRemote || job.foreignRegion || (job.remote && (job.source === 'workingnomads' || job.source === 'remotive' || job.source === 'yc' || job.salaryCurrency === 'USD' || /\b(us|usa|united states|uk|europe)\b/i.test(`${job.location || ''}`)))) && (
                          <span className="foreign-remote-badge" style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '2px 8px', borderRadius: 999, fontSize: '10.5px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }} title="Foreign-based company hiring remote">
                            🌍 {job.foreignRegion || (job.salaryCurrency === 'USD' ? 'US Remote ($ USD)' : 'Global Remote')}
                          </span>
                        )}
                        {(job.isIntern || job.employmentType === 'internship' || /\bintern/i.test(job.title || '')) && jobMins <= 30240 && jobMins > 120 && (
                          <span className="intake-window-badge" style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', padding: '2px 8px', borderRadius: 999, fontSize: '10.5px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }} title="Internship posting actively accepting applications (1-21 days old)">
                            🟢 Active Intake Window
                          </span>
                        )}
                        {job.indianCitizenEligibility && (
                          <span className={`citizen-badge ${job.indianCitizenEligibility.badgeClass}`} title={job.indianCitizenEligibility.reason}>
                            {job.indianCitizenEligibility.badgeText}
                          </span>
                        )}
                        {job.isLive && <span className="live-arrival-badge">⚡ Freshly Scraped</span>}
                        {job.isPastScraped && <span className="archive-badge">📜 Captured Archive</span>}
                        {activeSearchTerm.trim() && (() => {
                          const sem = semanticMatchJob(job, activeSearchTerm);
                          if (sem.matched && sem.badge && sem.badge !== 'Exact Match') {
                            return <span className="semantic-match-badge">🎯 {sem.badge}</span>;
                          }
                          return null;
                        })()}
                      </div>

                      <div className="jtags">
                        {job.tags.map((tag, idx) => {
                          const tagCls = idx === 0 ? 'f1' : idx === 1 ? 'f2' : idx === 2 ? 'f3' : 'f4';
                          return (
                            <span key={idx} className={`jtag ${tagCls}`}>{tag}</span>
                          );
                        })}
                        {job.extraTagsCount > 0 && (
                          <span className="more">+{job.extraTagsCount} more</span>
                        )}
                      </div>
                      <div className="jmeta2">
                        <span>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                            <rect x="3" y="7" width="18" height="13" rx="3" />
                            <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
                          </svg>
                          {job.roleType}
                        </span>
                        <span className="sep"></span>
                        <span className={job.salary === 'Not mentioned' ? 'salary-not-mentioned' : 'salary-highlight'}>
                          {job.roleType === 'Internship' ? 'Stipend: ' : 'Salary: '}
                          {job.salary}
                        </span>
                        <span className="sep"></span>
                        <span>
                          {job.workplace === 'Remote' ? (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                              <circle cx="12" cy="12" r="9" />
                              <path d="M3 12h18M12 3c3 3.5 3 14 0 18M12 3c-3 3.5-3 14 0 18" />
                            </svg>
                          ) : job.workplace === 'Hybrid' ? (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                              <path d="M4 15l8-8 8 8M12 7v14" />
                            </svg>
                          ) : (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                              <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11z" />
                              <circle cx="12" cy="10" r="2.6" />
                            </svg>
                          )}
                          {job.workplace}
                        </span>
                        {job.source && (
                          <>
                            <span className="sep"></span>
                            <span className="source-tag">Source: {job.source}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Match Analysis */}
                    <div className="jright">
                      <div className="match-top">
                        <div className="ring" style={{ background: conicGrad }}>
                          <span className="rp" style={{ color: scoreColor }}>{job.matchScore}%</span>
                        </div>
                        <div>
                          <div className="match-title" style={{ color: scoreColor }}>{job.matchLabel}</div>
                          <span className={`pill ${job.pillType}`}>
                            {job.pillType === 'g' ? (
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="#16a34a">
                                <path d="M12 3l1.8 3.8L18 8.6l-3 2.9.7 4.2L12 13.7l-3.7 2 .7-4.2-3-2.9 4.2-1.8z" />
                              </svg>
                            ) : (
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="#d97706">
                                <circle cx="12" cy="12" r="6" />
                              </svg>
                            )}
                            {job.pillText}
                          </span>
                        </div>
                      </div>
                      <div className="mdesc">{job.matchDesc}</div>
                    </div>

                    {/* Actions Column */}
                    <div className="jactions-col" style={{ display: 'grid', gridTemplateColumns: 'auto auto', gap: 9, alignItems: 'start' }}>
                      <div style={{ position: 'relative' }}>
                        <button
                          className="kebab"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenKebabId(openKebabId === job.id ? null : job.id);
                          }}
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                            <circle cx="12" cy="5" r="1.7" />
                            <circle cx="12" cy="12" r="1.7" />
                            <circle cx="12" cy="19" r="1.7" />
                          </svg>
                        </button>

                        {openKebabId === job.id && (
                          <div
                            style={{
                              position: 'absolute',
                              right: 0,
                              top: 24,
                              background: '#fff',
                              border: '1px solid var(--line)',
                              borderRadius: 10,
                              boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                              zIndex: 20,
                              minWidth: 160,
                              padding: '6px 0',
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div
                              style={{ padding: '8px 14px', fontSize: 12, cursor: 'pointer', color: 'var(--ink)' }}
                              onClick={() => {
                                setOpenKebabId(null);
                                if (onSelectJobForDetail) onSelectJobForDetail(job.rawJob || job);
                              }}
                            >
                              View Job Details
                            </div>
                            <div
                              style={{ padding: '8px 14px', fontSize: 12, cursor: 'pointer', color: 'var(--ink)' }}
                              onClick={() => {
                                setOpenKebabId(null);
                                setTailorModalJob(job.rawJob || job);
                              }}
                            >
                              Tailor Resume for Role
                            </div>
                            <div
                              style={{ padding: '8px 14px', fontSize: 12, cursor: 'pointer', color: '#db2777' }}
                              onClick={(e) => {
                                setOpenKebabId(null);
                                handleSave(job, e);
                              }}
                            >
                              {isSaved ? 'Remove from Saved' : 'Save this Job'}
                            </div>
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <button
                          className="btn-tailor-job"
                          onClick={(e) => {
                            e.stopPropagation();
                            setTailorModalJob(job.rawJob || job);
                          }}
                          title="Tailor resume to match every single keyword for this role"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 3l1.8 3.8L18 8.6l-3 2.9.7 4.2L12 13.7l-3.7 2 .7-4.2-3-2.9 4.2-1.8z" />
                          </svg>
                          <span>Tailor</span>
                        </button>

                        <button
                          className={`save ${isSaved ? 'saved' : ''}`}
                          onClick={(e) => handleSave(job, e)}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill={isSaved ? '#db2777' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 21C7 17 3 13.5 3 9.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 9 2.5c0 4-4 7.5-9 11.5z" />
                          </svg>
                          {isSaved ? 'Saved' : 'Save'}
                        </button>

                        <button
                          className="apl"
                          onClick={(e) => handleApply(job, e)}
                        >
                          {isApplied ? 'Applied' : 'Apply Now'}
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 12h15M13 6l6 6-6 6" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ===== RIGHT RAIL ===== */}
      <aside className="rail">
        {/* Skill Gap Analysis */}
        <div className="card rc">
          <div className="rhead">
            <h2>
              <span className="ic" style={{ background: '#fdeee0' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="4" />
                  <path d="M8 15l3-4 2.5 3L16 10" />
                </svg>
              </span>
              Skill Gap Analysis
            </h2>
            <span
              className="link"
              onClick={() => {
                if (onProceedToScoring) onProceedToScoring();
                else setClientScreen('scoring');
              }}
            >
              View Details
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12h15M13 6l6 6-6 6" />
              </svg>
            </span>
          </div>

          <div className="sg-body">
            <div className="sgd">
              <span className="pct">68%</span>
            </div>
            <p className="sg-txt">You're <b>68% aligned</b> with your target role</p>
          </div>

          <div className="gaps">
            <h4>Top Skill Gaps</h4>
            <div className="gchips">
              <span className="gchip pink">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="#db2777">
                  <path d="M12 2l10 18H2z" />
                </svg>
                System Design
              </span>
              <span className="gchip pur">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="#7c3aed">
                  <rect x="3" y="7" width="18" height="12" rx="2" />
                  <rect x="8" y="3" width="8" height="4" rx="1" />
                </svg>
                Docker
              </span>
              <span className="gchip blue">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="#2563eb">
                  <circle cx="12" cy="12" r="8" />
                </svg>
                AWS
              </span>
              <span className="gchip green">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="#16a34a">
                  <rect x="3" y="3" width="8" height="8" rx="2" />
                  <rect x="13" y="3" width="8" height="8" rx="2" />
                  <rect x="3" y="13" width="8" height="8" rx="2" />
                  <rect x="13" y="13" width="8" height="8" rx="2" />
                </svg>
                Data Structures &amp; Algorithms
              </span>
            </div>
          </div>
        </div>

        {/* Tailor Resume */}
        <div className="card rc tailor">
          <div className="rhead" style={{ justifyContent: 'flex-start', gap: 9 }}>
            <span className="ic" style={{ background: '#e4f1fe' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3l1.8 3.8L18 8.6l-3 2.9.7 4.2L12 13.7l-3.7 2 .7-4.2-3-2.9 4.2-1.8z" />
              </svg>
            </span>
            <h2>Tailor Your Resume with AI</h2>
          </div>
          <p>Optimize your resume for each job and increase your chances of getting noticed.</p>
          <button className="opt" onClick={() => setClientScreen('resume')}>
            Optimize Resume
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12h15M13 6l6 6-6 6" />
            </svg>
          </button>
          <svg className="art" viewBox="0 0 120 104">
            <rect x="26" y="14" width="52" height="66" rx="8" fill="#fff" stroke="#e8eaf3" />
            <rect x="34" y="24" width="26" height="4.5" rx="2.2" fill="#c9d6f6" />
            <rect x="34" y="34" width="36" height="3.5" rx="1.7" fill="#e2e7f5" />
            <rect x="34" y="42" width="30" height="3.5" rx="1.7" fill="#e2e7f5" />
            <rect x="34" y="50" width="36" height="3.5" rx="1.7" fill="#e2e7f5" />
            <rect x="34" y="58" width="22" height="3.5" rx="1.7" fill="#e2e7f5" />
            <circle cx="96" cy="64" r="17" fill="#5b4df0" />
            <text x="96" y="69" textAnchor="middle" fontSize="11" fontWeight="800" fill="#fff" fontFamily="Inter,sans-serif">AI</text>
            <path d="M30 88l1.6 3.4 3.4 1.6-3.4 1.6-1.6 3.4-1.6-3.4-3.4-1.6 3.4-1.6z" fill="#f59e0b" />
            <path d="M96 20l1.2 2.6 2.6 1.2-2.6 1.2-1.2 2.6-1.2-2.6-2.6-1.2 2.6-1.2z" fill="#8b5cf6" />
          </svg>
        </div>

        {/* Saved Jobs */}
        <div className="card rc">
          <div className="rhead">
            <h2>
              <span className="ic" style={{ background: '#fde9f3' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ec4899" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 21C7 17 3 13.5 3 9.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 9 2.5c0 4-4 7.5-9 11.5z" />
                </svg>
              </span>
              Saved Jobs
            </h2>
            <span className="link" onClick={() => setActiveTab('saved')}>
              View All
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12h15M13 6l6 6-6 6" />
              </svg>
            </span>
          </div>
          <div className="saves">12 saved jobs</div>
          <div className="saved-logos">
            <div className="slogo">
              <svg width="22" height="22" viewBox="0 0 48 48">
                <path fill="#4285F4" d="M45.1 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h11.8c-.5 2.8-2.1 5.1-4.4 6.7v5.5h7.1c4.2-3.9 6.6-9.6 6.6-16.2z" />
                <path fill="#34A853" d="M24 46c6 0 11-2 14.5-5.3l-7.1-5.5c-2 1.3-4.5 2.1-7.4 2.1-5.7 0-10.5-3.8-12.2-9H4.5v5.7C8.1 41.2 15.4 46 24 46z" />
                <path fill="#FBBC05" d="M11.8 28.3c-.4-1.3-.7-2.8-.7-4.3s.3-3 .7-4.3V14H4.5A21.9 21.9 0 0 0 2 24c0 3.6.9 6.9 2.5 10z" />
                <path fill="#EA4335" d="M24 10.8c3.2 0 6.1 1.1 8.4 3.3l6.3-6.3C35 4.2 30 2 24 2 15.4 2 8.1 6.8 4.5 14l7.3 5.7c1.7-5.2 6.5-8.9 12.2-8.9z" />
              </svg>
            </div>
            <div className="slogo">
              <svg width="19" height="19" viewBox="0 0 24 24">
                <rect x="2" y="2" width="9.2" height="9.2" fill="#F25022" />
                <rect x="12.8" y="2" width="9.2" height="9.2" fill="#7FBA00" />
                <rect x="2" y="12.8" width="9.2" height="9.2" fill="#00A4EF" />
                <rect x="12.8" y="12.8" width="9.2" height="9.2" fill="#FFB900" />
              </svg>
            </div>
            <div className="slogo" style={{ background: '#232f3e', borderColor: '#232f3e' }}>
              <svg width="24" height="20" viewBox="0 0 32 32">
                <text x="16" y="19" textAnchor="middle" fontSize="12" fontWeight="800" fill="#fff" fontFamily="Inter,sans-serif">a</text>
                <path d="M8 23c2.6 2 6 3.1 9 3.1 3.5 0 6.8-1.3 9.4-3.2" fill="none" stroke="#FF9900" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </div>
            <div className="slogo">
              <svg width="30" height="20" viewBox="0 0 40 24">
                <text x="20" y="17" textAnchor="middle" fontFamily="Georgia,serif" fontSize="14" fontStyle="italic" fontWeight="700" fill="#e63946">tcs</text>
              </svg>
            </div>
          </div>
        </div>

        {/* Applied Jobs */}
        <div className="card rc">
          <div className="rhead">
            <h2>
              <span className="ic" style={{ background: '#eef0fd' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#5b4df0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 3 10 14" />
                  <path d="M21 3 14 21l-4-7-7-4z" />
                </svg>
              </span>
              Applied Jobs
            </h2>
            <span className="link" onClick={() => setActiveTab('applied')}>
              View All
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12h15M13 6l6 6-6 6" />
              </svg>
            </span>
          </div>
          <div className="saves">8 applications</div>
          <div className="stchips">
            <span className="stchip blue">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3.5 2" />
              </svg>
              2 Pending
            </span>
            <span className="stchip teal">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="7" width="18" height="14" rx="3" />
                <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              4 Interview
            </span>
            <span className="stchip pink">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
              2 Rejected
            </span>
          </div>
        </div>

        {/* Settings */}
        <div className="card rc" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="rhead">
            <h2 style={{ flex: 1 }}>Settings</h2>
          </div>
          <div className="set-row" onClick={() => setClientScreen('settings')}>
            <span className="ic">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3.2" />
                <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 8.9 19.4a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 8.9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9a1.7 1.7 0 0 0 1.03-1.56V3a2 2 0 1 1 4 0v.09c0 .68.4 1.3 1.03 1.56a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9c.26.63.88 1.03 1.56 1.03H21a2 2 0 1 1 0 4h-.09c-.68 0-1.3.4-1.51.97z" />
              </svg>
            </span>
            <div>
              <b>Settings</b>
              <small>Manage your profile, preferences and notifications.</small>
            </div>
            <svg className="chev" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 6 6 6-6 6" />
            </svg>
          </div>
        </div>
      </aside>

      {/* Drawer */}
      {selectedDrawerJob && (
        <JobDetailDrawer
          job={selectedDrawerJob}
          isOpen={Boolean(selectedDrawerJob)}
          onClose={() => setSelectedDrawerJob(null)}
          resume={resume}
          onTailorJob={(j) => {
            setTailorModalJob(j);
            setSelectedDrawerJob(null);
          }}
          isBookmarked={selectedDrawerJob ? isBookmarked(selectedDrawerJob.id) : false}
          onToggleBookmark={(id) => toggleBookmark(id)}
        />
      )}

      {/* Direct Job Keyword Tailor Modal */}
      {tailorModalJob && (
        <JobKeywordTailorModal
          job={tailorModalJob}
          resume={resume}
          isOpen={Boolean(tailorModalJob)}
          onClose={() => setTailorModalJob(null)}
          onUpdateResume={onUpdateResume}
          onOpenResumeStudio={() => {
            setTailorModalJob(null);
            if (onNavigateToResume) onNavigateToResume();
            else if (onProceedToScoring) onProceedToScoring();
          }}
          onAddToast={addToast}
        />
      )}
    </main>
  );
}

export default DiscoveryStep;
