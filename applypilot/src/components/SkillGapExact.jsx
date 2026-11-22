import React, { useState, useMemo, useEffect } from 'react';
import './SkillGapExact.css';
import { useAppStore } from '../store/appStore';
import { useAuth } from '../context/AuthContext';
import { CompanyIcon } from './CompanyIcon';
import { createPersonalizedLearningPath, getCandidateSkills, personalizeCompanySkillGaps } from '../utils/skillGapAnalysis.js';

function renderCompanyLogo(company, size = 28) {
  if (!company) return null;
  if (company.logo) {
    return <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{company.logo}</div>;
  }
  return <CompanyIcon company={company.name || company.id} logoUrl={company.logoUrl} size={size} />;
}

export function SkillGapExact({ onNavigateToFeed, resume }) {
  const { addToast } = useAppStore();
  const { user, token } = useAuth();
  const [companyData, setCompanyData] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState(null);
  const [activeTab, setActiveTab] = useState('company');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState('all');
  const [selectedRole, setSelectedRole] = useState('all');
  const [sortBy, setSortBy] = useState('highest_gap');
  const [isLiveLoaded, setIsLiveLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [fetchAttempt, setFetchAttempt] = useState(0);
  const [learningPath, setLearningPath] = useState(null);
  const candidateSkills = useMemo(() => getCandidateSkills(resume, user), [resume, user]);
  const companies = useMemo(
    () => personalizeCompanySkillGaps(companyData, candidateSkills),
    [companyData, candidateSkills],
  );

  // The endpoint returns neutral company skill demand; comparison uses the active resume here.
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setIsLoading(true);
    setLoadError('');
    fetch('/api/jobs/companies-skill-gap', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error('Could not load company skill demand.');
        return res.json();
      })
      .then((data) => {
        if (!data?.success || !Array.isArray(data.companies)) {
          throw new Error(data?.error || 'Company skill data was not available.');
        }
        if (active) {
          setCompanyData(data.companies);
          setIsLiveLoaded(true);
          setSelectedCompanyId((prev) => {
            const exists = data.companies.some((c) => c.id === prev);
            return exists ? prev : data.companies[0]?.id || null;
          });
          setIsLoading(false);
        }
      })
      .catch((error) => {
        if (active && error.name !== 'AbortError') {
          setLoadError(error.message || 'Could not load company skill demand.');
          setIsLoading(false);
        }
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [token, fetchAttempt]);

  const industries = useMemo(() => {
    const list = new Set();
    companies.forEach((c) => {
      if (c.industry) list.add(c.industry);
    });
    return ['all', ...Array.from(list)];
  }, [companies]);

  const selectedCompany = useMemo(() => {
    return companies.find((c) => c.id === selectedCompanyId) || companies[0] || null;
  }, [companies, selectedCompanyId]);

  const filteredCompanies = useMemo(() => {
    let list = [...companies];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.industry && c.industry.toLowerCase().includes(q)) ||
          (c.advertisedSkills && c.advertisedSkills.some((skill) => skill.name.toLowerCase().includes(q)))
      );
    }
    if (selectedIndustry !== 'all') {
      list = list.filter((c) => c.industry === selectedIndustry);
    }
    if (selectedRole !== 'all') {
      list = list.filter((c) =>
        c.advertisedSkills && c.advertisedSkills.some((skill) => skill.name.toLowerCase().includes(selectedRole.toLowerCase()))
      );
    }
    if (sortBy === 'highest_gap') {
      list.sort((a, b) => (b.gapPct ?? -1) - (a.gapPct ?? -1));
    } else if (sortBy === 'highest_match') {
      list.sort((a, b) => (b.matchPct ?? -1) - (a.matchPct ?? -1));
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
    setLearningPath((current) => current === null
      ? createPersonalizedLearningPath(selectedCompany.missingSkillDetails || [])
      : null);
  };

  if (!selectedCompany) {
    return (
      <div className="skillgap-content p-8 text-center">
        <h1 className="text-xl font-bold">Skill gap analysis</h1>
        {isLoading ? (
          <p role="status" className="mt-2 text-sm text-slate-600">Loading company skill demand…</p>
        ) : loadError ? (
          <>
            <p role="alert" className="mt-2 text-sm text-rose-700">{loadError}</p>
            <button type="button" className="mt-3" onClick={() => setFetchAttempt((attempt) => attempt + 1)}>Retry</button>
          </>
        ) : (
          <p className="mt-2 text-sm text-slate-600">No company skill data is available yet. Search for jobs first.</p>
        )}
      </div>
    );
  }

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

        {candidateSkills.length === 0 && (
          <div role="status" className="skill-profile-notice">
            Add skills or projects to your resume/profile to calculate your match. Company cards currently show advertised skills without assuming gaps.
          </div>
        )}

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
              const ringBackground = `conic-gradient(#22c55e 0 ${c.matchPct ?? 0}%, #d3f2dc ${c.matchPct ?? 0}% 100%)`;
              const skillsToShow = candidateSkills.length ? c.missingSkills : c.advertisedSkills.map((skill) => skill.name);

              return (
                <div
                  key={c.id}
                  className={`crow ${isSelected ? 'sel' : ''}`}
                  onClick={() => {
                    setSelectedCompanyId(c.id);
                    setLearningPath(null);
                  }}
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
                      Listed salary: <b>{c.salary || 'Not provided'}</b>
                    </div>
                  </div>
                  <div className="mstat">
                    <div className="ring" style={{ background: ringBackground }}>
                      <span className="n">{c.matchPct ?? '—'}</span>
                    </div>
                    <div className="ms">
                      <div className="pct">
                        {c.matchPct ?? '—'}
                        <sup>%</sup>
                      </div>
                      <div className="cap">Skill Match</div>
                    </div>
                  </div>
                  <div className="mstat">
                    <div className="gc">{c.gapPct ?? '—'}</div>
                    <div className="ms">
                      <div className="pct" style={{ color: '#db2777' }}>
                        {c.gapPct ?? '—'}
                        <sup>%</sup>
                      </div>
                      <div className="cap">Skill Gap</div>
                    </div>
                  </div>
                  <div className="msk">
                    <h5>{candidateSkills.length ? 'Top Missing Skills' : 'Top Advertised Skills'}</h5>
                    <div className="sk">
                      {skillsToShow.slice(0, 3).map((sk) => (
                        <span key={sk}>{sk}</span>
                      ))}
                      {skillsToShow.length > 3 && (
                        <span className="more">+{skillsToShow.length - 3} more</span>
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
                background: `conic-gradient(var(--green) 0 ${selectedCompany.matchPct ?? 0}%, #e9edf5 ${selectedCompany.matchPct ?? 0}% 100%)`,
              }}
            >
              <span className="pct">{selectedCompany.matchPct === null ? '—' : `${selectedCompany.matchPct}%`}</span>
            </div>
            <div className="sm-txt">
              <div className="row">
                <span>Skills Matched</span>
                <b className="g">
                  {candidateSkills.length ? selectedCompany.matchedCount : '—'} / {selectedCompany.totalSkills}
                </b>
              </div>
              <div className="row" style={{ marginTop: 6 }}>
                <span>Skills Missing</span>
                <b className="r">
                  {candidateSkills.length ? selectedCompany.missingCount : '—'} / {selectedCompany.totalSkills}
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
              {candidateSkills.length ? 'Key Skills You Need to Learn' : 'Company Advertised Skills'}
            </h3>
            <button
              type="button"
              className="link"
              style={{ color: 'var(--primary)', fontWeight: 600, fontSize: '11.5px', cursor: 'pointer', border: 0, background: 'transparent' }}
              onClick={handleExploreLearning}
            >
              View All
            </button>
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
          <button
            className="vlp"
            type="button"
            aria-expanded={learningPath !== null}
            aria-controls="skill-learning-roadmap"
            onClick={handleExploreLearning}
          >
            {learningPath === null ? 'View Learning Path' : 'Hide Learning Path'}
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12h15M13 6l6 6-6 6" />
            </svg>
          </button>
        </div>
        {learningPath !== null && (
          <section id="skill-learning-roadmap" className="learning-roadmap" aria-live="polite">
            <h3>Learning plan for {selectedCompany.name}</h3>
            <p>Prioritized by how often each skill appears in this company’s current job listings.</p>
            {learningPath.length === 0 ? (
              <p>{candidateSkills.length ? 'No advertised skill gaps were found for this company.' : 'Add resume or profile skills to create a personalized plan.'}</p>
            ) : (
              <ol>
                {learningPath.map((step, index) => {
                  const hours = Math.floor(step.estimatedMinutes / 60);
                  const minutes = step.estimatedMinutes % 60;
                  const duration = hours
                    ? `${hours} hr${hours === 1 ? '' : 's'}${minutes ? ` ${minutes} min` : ''}`
                    : `${minutes} min`;
                  return (
                    <li key={step.name}>
                      <h4>{index + 1}. {step.name}</h4>
                      <p>Estimated time: {duration} · Appears in {step.frequency} job{step.frequency === 1 ? '' : 's'}</p>
                      <ul>
                        {step.topics.map((topic) => <li key={topic}>{topic}</li>)}
                      </ul>
                      {step.resourceUrl ? (
                        <a href={step.resourceUrl} target="_blank" rel="noopener noreferrer">
                          Official documentation for {step.name}
                        </a>
                      ) : (
                        <span>No verified official documentation link is mapped for this skill yet.</span>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        )}
      </aside>
    </div>
  );
}

export default SkillGapExact;
