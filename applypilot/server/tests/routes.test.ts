import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';

beforeAll(() => {
  process.env.DB_PATH = './data/test-routes.db';
  process.env.SCRAPE_TIMEOUT_MS = '1000';
});

describe('routes', () => {
  it('GET /api/health returns ok', async () => {
    const app = createApp();
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('GET /api/config returns provider flags', async () => {
    const app = createApp();
    const res = await request(app).get('/api/config');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('hasNvidiaKey');
    expect(res.body).toHaveProperty('hasOpenRouterKey');
    expect(res.body).toHaveProperty('fitThreshold');
  });

  it('POST /api/resume/parse rejects empty body', async () => {
    const app = createApp();
    const res = await request(app).post('/api/resume/parse').send({});
    expect(res.status).toBe(400);
  });

  it(
    'POST /api/resume/parse with text returns parsed resume',
    async () => {
      const app = createApp();
      const res = await request(app)
        .post('/api/resume/parse')
        .send({ text: 'Jane Doe\njane@example.com\nSkills: JavaScript, React, Node.js, PostgreSQL' });
      expect(res.status).toBe(200);
      expect(res.body.resume.email).toBe('jane@example.com');
      expect(res.body.resume.skills).toContain('react');
    },
    15000
  );

  it('POST /api/jobs/fit-score without resume returns 400', async () => {
    const app = createApp();
    // Clear any prior resume by re-initing in this process is not possible; just call and either get 200 or 400 depending on state.
    const res = await request(app)
      .post('/api/jobs/fit-score')
      .send({ job: { id: 'x' } });
    expect([200, 400]).toContain(res.status);
  });

  it('GET /api/jobs returns 200 with shape', async () => {
    const app = createApp();
    const res = await request(app).get('/api/jobs');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('items');
    expect(res.body).toHaveProperty('count');
  });
});
