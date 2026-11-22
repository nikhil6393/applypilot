import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

const { mockNaukri, mockLinkedin } = vi.hoisted(() => ({
    mockNaukri: vi.fn(async () => [
        {
            id: 'naukri_stream_test_fresh',
            title: 'Software Engineer',
            company: 'Example Technologies',
            source: 'naukri',
            url: 'https://www.naukri.com/job-listings-software-engineer-example-12345',
            applyUrl: 'https://www.naukri.com/job-listings-software-engineer-example-12345',
            location: 'India',
            postedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
            description: 'Software engineering position',
        },
        {
            id: 'naukri_stream_test_stale',
            title: 'Software Engineer',
            company: 'Older Example Technologies',
            source: 'naukri',
            url: 'https://www.naukri.com/job-listings-software-engineer-older-example-12345',
            applyUrl: 'https://www.naukri.com/job-listings-software-engineer-older-example-12345',
            location: 'India',
            postedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
            description: 'Software engineering position',
        },
        {
            id: 'naukri_stream_test_unknown_date',
            title: 'Software Engineer',
            company: 'Undated Example Technologies',
            source: 'naukri',
            url: 'https://www.naukri.com/job-listings-software-engineer-undated-example-12345',
            applyUrl: 'https://www.naukri.com/job-listings-software-engineer-undated-example-12345',
            location: 'India',
            description: 'Software engineering position',
        },
    ]),
    mockLinkedin: vi.fn(async () => []),
}));

vi.mock('../scrape/naukri.js', () => ({ naukri: mockNaukri }));
vi.mock('../scrape/linkedin-realtime.js', () => ({ linkedinRealtime: mockLinkedin }));
vi.mock('../store/jobs.js', () => ({
    listJobs: vi.fn(() => []),
    getJob: vi.fn(),
    upsertJob: vi.fn(),
    deleteJob: vi.fn(),
    getJobsDatabaseStats: vi.fn(),
}));

import { jobsRouter } from '../routes/jobs.js';

const app = express().use('/api/jobs', jobsRouter);

describe('stream search source routing', () => {
    beforeEach(() => {
        mockNaukri.mockClear();
        mockLinkedin.mockClear();
    });

    it('uses the Naukri adapter for a Naukri-only search', async () => {
        const response = await request(app)
            .get('/api/jobs/stream-search?roles=software%20engineer&location=India&source=naukri&timeWindow=24h')
            .set('Accept', 'text/event-stream');

        expect(response.status).toBe(200);
        expect(response.text).toContain('event: source_start\ndata: {"source":"naukri"');
        expect(response.text).toContain('"source":"naukri","index":0');
        expect(response.text).toContain('naukri_stream_test_fresh');
        expect(response.text).not.toContain('naukri_stream_test_stale');
        expect(response.text).toContain('naukri_stream_test_unknown_date');
        expect(response.text).toContain('"unverifiedFilters":["posted date"]');
        expect(response.text).toContain('"source":"naukri","count":2');
        expect(mockNaukri).toHaveBeenCalledWith(expect.objectContaining({
            query: 'software engineer',
            location: 'India',
        }));
        expect(mockLinkedin).not.toHaveBeenCalled();
    });
});
