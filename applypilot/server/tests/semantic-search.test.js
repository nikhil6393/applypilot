import { describe, it, expect } from 'vitest';
import { semanticMatchJob, identifyQueryCluster } from '../../shared/roleTaxonomy.js';
import { isJobRoleMatch } from '../scrape/validator.js';

describe('LinkedIn-Grade Semantic Role Matching Suite', () => {
  it('correctly maps "software engineer" and "software engineering" to the software engineering cluster', () => {
    const cluster1 = identifyQueryCluster('software engineer');
    const cluster2 = identifyQueryCluster('software engineering');
    const cluster3 = identifyQueryCluster('Software Developer');
    const cluster4 = identifyQueryCluster('sde');

    expect(cluster1).toBeDefined();
    expect(cluster1.cluster.id).toBe('software_engineering');
    expect(cluster2).toBeDefined();
    expect(cluster2.cluster.id).toBe('software_engineering');
    expect(cluster3).toBeDefined();
    expect(cluster3.cluster.id).toBe('software_engineering');
    expect(cluster4).toBeDefined();
    expect(cluster4.cluster.id).toBe('software_engineering');
  });

  it('matches sub-disciplines when user searches "software engineer"', () => {
    const query = 'software engineer';
    
    // Exact match
    const seJob = { title: 'Software Engineer', company: 'Google', tags: ['Python', 'Go'] };
    const resSE = semanticMatchJob(seJob, query);
    expect(resSE.matched).toBe(true);
    expect(resSE.score).toBe(100);

    // Full Stack Developer
    const fsJob = { title: 'Full Stack Developer', company: 'Meta', tags: ['React', 'Node.js'] };
    const resFS = semanticMatchJob(fsJob, query);
    expect(resFS.matched).toBe(true);
    expect(resFS.score).toBeGreaterThanOrEqual(85);
    expect(resFS.badge).toBe('Full Stack');

    // Frontend Developer
    const feJob = { title: 'Frontend Developer', company: 'Netflix', tags: ['TypeScript', 'React'] };
    const resFE = semanticMatchJob(feJob, query);
    expect(resFE.matched).toBe(true);
    expect(resFE.score).toBeGreaterThanOrEqual(85);
    expect(resFE.badge).toBe('Frontend');

    // Backend Engineer
    const beJob = { title: 'Backend Engineer', company: 'Amazon', tags: ['Java', 'Spring'] };
    const resBE = semanticMatchJob(beJob, query);
    expect(resBE.matched).toBe(true);
    expect(resBE.score).toBeGreaterThanOrEqual(85);
    expect(resBE.badge).toBe('Backend');

    // React Developer
    const reactJob = { title: 'React Developer', company: 'Airbnb', tags: ['JavaScript'] };
    const resReact = semanticMatchJob(reactJob, query);
    expect(resReact.matched).toBe(true);
    expect(resReact.score).toBeGreaterThanOrEqual(85);

    // SDE 1
    const sdeJob = { title: 'SDE 1 (2025 Batch)', company: 'Swiggy', tags: ['Java'] };
    const resSDE = semanticMatchJob(sdeJob, query);
    expect(resSDE.matched).toBe(true);
    expect(resSDE.score).toBeGreaterThanOrEqual(85);
  });

  it('matches sub-disciplines when user searches "software engineering"', () => {
    const query = 'software engineering';
    const feJob = { title: 'Frontend Developer', company: 'Microsoft', tags: ['CSS', 'React'] };
    const resFE = semanticMatchJob(feJob, query);
    expect(resFE.matched).toBe(true);
    expect(resFE.score).toBeGreaterThanOrEqual(85);
  });

  it('strictly excludes non-tech roles even if user searches "software engineer"', () => {
    const query = 'software engineer';
    
    const salesJob = { title: 'Sales Executive - Software Solutions', company: 'TechSales Inc' };
    const hrJob = { title: 'HR Recruiter for Software Engineers', company: 'Talent Agency' };
    const telecallerJob = { title: 'Telecaller & BPO Executive', company: 'Call Corp' };
    const marketingJob = { title: 'Digital Marketing Manager', company: 'Ad Agency' };

    expect(semanticMatchJob(salesJob, query).matched).toBe(false);
    expect(semanticMatchJob(hrJob, query).matched).toBe(false);
    expect(semanticMatchJob(telecallerJob, query).matched).toBe(false);
    expect(semanticMatchJob(marketingJob, query).matched).toBe(false);
  });

  it('integrates with server/scrape/validator isJobRoleMatch', () => {
    const request = { query: 'Software Engineer', jobType: 'all' };
    
    expect(isJobRoleMatch({ title: 'Full Stack Developer', tags: ['React', 'Node.js'] }, request)).toBe(true);
    expect(isJobRoleMatch({ title: 'Frontend Engineer', tags: ['Vue'] }, request)).toBe(true);
    expect(isJobRoleMatch({ title: 'Backend Developer', tags: ['Python'] }, request)).toBe(true);
    expect(isJobRoleMatch({ title: 'React Native Developer', tags: ['Mobile'] }, request)).toBe(true);
    
    // Non-tech rejection
    expect(isJobRoleMatch({ title: 'Telecaller / Customer Support', tags: [] }, request)).toBe(false);
    expect(isJobRoleMatch({ title: 'Human Resources Executive', tags: [] }, request)).toBe(false);
  });
});
