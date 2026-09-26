import type { CanonicalJob } from '@applypilot/domain';

export interface MigrationStats {
  jobsMigrated: number;
  resumesMigrated: number;
  profilesMigrated: number;
  applicationsMigrated: number;
  errors: string[];
}

export interface SqliteSnapshot {
  jobs?: any[];
  profiles?: any[];
  resumes?: any[];
  applications?: any[];
}

/**
 * Migration pipeline helper that validates and transforms SQLite records
 * into PostgreSQL relational models.
 */
export class SqliteToPgMigrator {
  transformJobs(sqliteJobs: any[]): Array<Record<string, any>> {
    return sqliteJobs.map((j) => {
      const skillsArray = Array.isArray(j.skills)
        ? j.skills
        : typeof j.skills === 'string'
        ? JSON.parse(j.skills || '[]')
        : [];

      return {
        id: j.id,
        source: j.source || 'manual',
        sourceJobId: j.sourceJobId || j.id,
        canonicalUrl: j.url || j.canonicalUrl || `https://applypilot.local/job/${j.id}`,
        title: j.title || 'Untitled',
        companyName: j.company || 'Unknown',
        remoteType: j.remote ? 'remote' : 'unknown',
        employmentType: j.employmentType || (j.internship ? 'internship' : 'full_time'),
        description: j.description || '',
        salaryMin: j.salaryMin || null,
        salaryMax: j.salaryMax || null,
        salaryCurrency: j.salaryCurrency || null,
        salaryPeriod: j.salaryPeriod || null,
        applicantCount: j.applicantCount ?? null,
        internship: Boolean(j.internship),
        contentHash: j.contentHash || 'legacy',
        status: 'active',
        postedAt: j.postedAt ? new Date(j.postedAt) : null,
      };
    });
  }

  transformProfiles(sqliteProfiles: any[]): Array<Record<string, any>> {
    return sqliteProfiles.map((p) => {
      const json = typeof p.profile_json === 'string' ? JSON.parse(p.profile_json) : p.profile_json;
      return {
        id: p.id,
        email: json?.email || null,
        name: json?.fullName || null,
        createdAt: p.created_at ? new Date(p.created_at) : new Date(),
        updatedAt: p.updated_at ? new Date(p.updated_at) : new Date(),
      };
    });
  }

  async migrateSnapshot(snapshot: SqliteSnapshot): Promise<MigrationStats> {
    const stats: MigrationStats = {
      jobsMigrated: 0,
      resumesMigrated: 0,
      profilesMigrated: 0,
      applicationsMigrated: 0,
      errors: [],
    };

    try {
      if (snapshot.jobs && snapshot.jobs.length > 0) {
        const transformedJobs = this.transformJobs(snapshot.jobs);
        stats.jobsMigrated = transformedJobs.length;
      }
      if (snapshot.profiles && snapshot.profiles.length > 0) {
        const transformedProfiles = this.transformProfiles(snapshot.profiles);
        stats.profilesMigrated = transformedProfiles.length;
      }
      if (snapshot.applications && snapshot.applications.length > 0) {
        stats.applicationsMigrated = snapshot.applications.length;
      }
    } catch (err: any) {
      stats.errors.push(err.message || 'Migration error');
    }

    return stats;
  }
}
