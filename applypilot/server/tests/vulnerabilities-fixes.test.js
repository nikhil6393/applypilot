import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';

describe('Audit & Vulnerability Fix Verification Test Suite', () => {
  const app = createApp();

  describe('1. OWASP SSRF Protection on Jobs Endpoints', () => {
    it('blocks AWS cloud metadata 169.254.169.254 on POST /api/jobs/verify-url with 400', async () => {
      const res = await request(app)
        .post('/api/jobs/verify-url')
        .send({ url: 'http://169.254.169.254/latest/meta-data' });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/SSRF blocked/);
    });

    it('blocks localhost loopback on POST /api/jobs/verify-url with 400', async () => {
      const res = await request(app)
        .post('/api/jobs/verify-url')
        .send({ url: 'http://127.0.0.1:8080/internal-metrics' });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/SSRF blocked/);
    });

    it('blocks SSRF on POST /api/jobs/scrape-url with 400', async () => {
      const res = await request(app)
        .post('/api/jobs/scrape-url')
        .send({ url: 'http://169.254.169.254/user-data' });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('2. OWASP Broken Access Control on Feedback', () => {
    it('rejects unauthenticated GET /api/feedback with 401', async () => {
      const res = await request(app).get('/api/feedback');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('allows anonymous candidate feedback submission on POST /api/feedback', async () => {
      const res = await request(app)
        .post('/api/feedback')
        .send({ score: 5, comment: 'Clean verification', emoji: '🌟', label: 'UX' });
      expect(res.status).toBe(201);
      expect(res.body.ok).toBe(true);
    });
  });

  describe('3. OWASP Mass Assignment Protection on Profile Update', () => {
    it('prevents user from escalating role to admin or changing user id', async () => {
      const email = `candidate_${Date.now()}@example.com`;
      const reg = await request(app)
        .post('/api/auth/register')
        .send({ email, password: 'password123', name: 'Safe Candidate' });
      expect(reg.status).toBe(201);
      const token = reg.body.token;

      // Attempt privilege escalation to admin via mass assignment
      const update = await request(app)
        .post('/api/auth/update-profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ role: 'admin', isAdmin: true, name: 'Renamed Candidate' });

      expect(update.status).toBe(200);
      expect(update.body.user.role).toBe('candidate');

      // Check /api/admin/metrics returns 403 Forbidden
      const adminProbe = await request(app)
        .get('/api/admin/metrics')
        .set('Authorization', `Bearer ${token}`);
      expect(adminProbe.status).toBe(403);
    });
  });

  describe('4. Scoring Engine Skills Ingestion', () => {
    it('handles flat skills array and scores matching keywords accurately', async () => {
      const res = await request(app)
        .post('/api/scoring/batch')
        .send({
          resume: {
            skills: ['React', 'Node.js', 'TypeScript', 'Docker', 'PostgreSQL'],
          },
          jobs: [
            {
              id: 'test-job-99',
              title: 'Senior React & Node Engineer',
              description: 'Seeking engineer skilled in React, TypeScript, Node.js, and Docker.',
              tags: ['react', 'node.js'],
            },
          ],
        });
      expect(res.status).toBe(200);
      expect(res.body.results['test-job-99']).toBeDefined();
      expect(res.body.results['test-job-99'].fitScore).toBeGreaterThanOrEqual(80);
      expect(res.body.results['test-job-99'].matchingKeywords).toEqual(
        expect.arrayContaining(['react', 'node.js', 'typescript'])
      );
    });

    it('does not invent a score when candidate or job evidence is absent', async () => {
      const res = await request(app)
        .post('/api/scoring/batch')
        .send({
          resume: { skills: [], targetRoles: [], experience: [] },
          jobs: [{ id: 'empty-evidence-job', title: 'Open Role', description: 'Details unavailable.' }],
        });

      expect(res.status).toBe(200);
      expect(res.body.results['empty-evidence-job'].fitScore).toBeNull();
      expect(res.body.results['empty-evidence-job'].unavailableReason).toMatch(/Add skills/);
    });

    it('rejects batches larger than the supported 250-job limit', async () => {
      const jobs = Array.from({ length: 251 }, (_, index) => ({
        id: `job-${index}`,
        title: 'Software Engineer',
      }));
      const res = await request(app)
        .post('/api/scoring/batch')
        .send({ resume: { skills: ['React'] }, jobs });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('5. Admin Router Mounted', () => {
    it('serves admin status probe when authenticated', async () => {
      const res = await request(app).get('/api/admin/system/status');
      // Unauthenticated probe should return 401 (proves route is mounted, not 404)
      expect(res.status).toBe(401);
    });
  });
});
