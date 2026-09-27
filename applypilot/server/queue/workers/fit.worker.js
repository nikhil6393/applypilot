import { getResume } from '../../store/resume.js';
import { listJobs } from '../../store/jobs.js';
import { scoreJob } from '../../scoring/fit.js';
export async function processFitJob(job) {
    const resume = getResume();
    if (!resume) {
        throw new Error('Cannot process fit scoring: No resume uploaded');
    }
    const { jobIds, limit = 50 } = job.data;
    const allJobs = listJobs({ limit });
    const targetJobs = jobIds && jobIds.length > 0
        ? allJobs.filter((j) => jobIds.includes(j.id))
        : allJobs;
    let totalScore = 0;
    for (const target of targetJobs) {
        const score = await scoreJob(resume, target);
        totalScore += Math.round(score.score * 100);
    }
    return {
        scoredCount: targetJobs.length,
        averageScore: targetJobs.length > 0 ? Math.round(totalScore / targetJobs.length) : 0,
    };
}
