import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { getDb, closeDb } from '../store/db.js';
import { adminRouter } from '../routes/admin.js';
import { initAuthTables } from '../security/auth.js';

let app: any;

beforeAll(() => {
  process.env.NODE_ENV = 'test';
  process.env.DB_PATH = './data/test-auth.db';
  initAuthTables();
  app = createApp();
  // Mount adminRouter on test app to test admin RBAC
  app.use('/api/admin', adminRouter);
});

afterAll(() => {
  try {
    closeDb();
  } catch {}
});

describe('ApplyPilot Complete Authentication & Security Test Suite', () => {
  const testUser = {
    name: 'Test Candidate',
    email: `candidate_${Date.now()}@applypilot.io`,
    password: 'ValidPassword123!',
    roleTitle: 'Software Engineer',
  };

  let candidateToken = '';
  let candidateUserId = '';

  it('1. POST /api/auth/register creates user account and returns session token', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(typeof res.body.token).toBe('string');
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe(testUser.email.toLowerCase());
    expect(res.body.user.role).toBe('candidate');

    candidateToken = res.body.token;
    candidateUserId = res.body.user.id;
  });

  it('2. POST /api/auth/register rejects duplicate email with 409 Conflict', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    expect(res.status).toBe(409);
    expect(res.body.error).toContain('already exists');
  });

  it('3. POST /api/auth/register rejects weak password (< 6 chars) with 400 Bad Request', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Weak Pass User',
        email: `weak_${Date.now()}@example.com`,
        password: '123',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('at least 6 characters');
  });

  it('4. POST /api/auth/login succeeds with correct credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.id).toBe(candidateUserId);
  });

  it('5. POST /api/auth/login fails with wrong password (401 Unauthorized)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: 'WrongPassword!',
      });

    expect(res.status).toBe(401);
    expect(res.body.error).toContain('Invalid email or password');
  });

  it('6. POST /api/auth/login fails with nonexistent email (401 Unauthorized)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'nobody@nonexistent.org',
        password: 'Password123!',
      });

    expect(res.status).toBe(401);
    expect(res.body.error).toContain('Invalid email or password');
  });

  it('7. GET /api/auth/me returns authenticated user profile with valid bearer token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${candidateToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.id).toBe(candidateUserId);
    expect(res.body.user.email).toBe(testUser.email.toLowerCase());
  });

  it('8. GET /api/auth/me returns 401 without bearer token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('9. SEC-01: POST /api/auth/google rejects unverified directEmail payloads (400 Bad Request)', async () => {
    const res = await request(app)
      .post('/api/auth/google')
      .send({ directEmail: 'victim@domain.com', name: 'Victim' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Google credential (ID token) is required');
  });

  it('10. SEC-02: requireAdmin blocks unauthenticated requests even with x-admin-dev header (401 Unauthorized)', async () => {
    const res = await request(app)
      .get('/api/admin/users')
      .set('x-admin-dev', 'true');

    expect(res.status).toBe(401);
    expect(res.body.error).toContain('Authentication required');
  });

  it('11. SEC-02 & SEC-03: Candidate user cannot access admin routes (403 Forbidden)', async () => {
    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${candidateToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toContain('Forbidden');
  });

  it('12. SEC-03: Registering with "nikhil" in email does NOT grant admin role', async () => {
    const nikhilEmail = `nikhil.tester.${Date.now()}@attacker.com`;
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Nikhil Tester',
        email: nikhilEmail,
        password: 'ValidPassword123!',
      });

    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('candidate');

    // Attempt admin access with this token -> must be 403 Forbidden
    const adminRes = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${res.body.token}`);

    expect(adminRes.status).toBe(403);
  });

  it('13. Password Reset Lifecycle: forgot-password -> reset-password -> session invalidation', async () => {
    const resetUser = {
      name: 'Reset Test User',
      email: `reset_test_${Date.now()}@applypilot.io`,
      password: 'InitialPassword123!',
    };

    // 13a. Register user
    const regRes = await request(app).post('/api/auth/register').send(resetUser);
    expect(regRes.status).toBe(201);
    const initialToken = regRes.body.token;

    // 13b. Request forgot-password
    const forgotRes = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: resetUser.email });

    expect(forgotRes.status).toBe(200);
    expect(forgotRes.body.success).toBe(true);

    // Query reset token from database
    const db = getDb();
    const resetRecord = db
      .prepare('SELECT token FROM password_resets WHERE user_id = ? AND used = 0')
      .get(regRes.body.user.id) as any;

    expect(resetRecord).toBeDefined();
    expect(resetRecord.token.length).toBe(64); // 32-byte hex

    // 13c. Reset password
    const newPass = 'BrandNewPassword123!';
    const resetRes = await request(app)
      .post('/api/auth/reset-password')
      .send({
        token: resetRecord.token,
        newPassword: newPass,
      });

    expect(resetRes.status).toBe(200);
    expect(resetRes.body.success).toBe(true);

    // 13d. Old active session must be invalidated (Revocation)
    const meWithOldSession = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${initialToken}`);
    expect(meWithOldSession.status).toBe(401);

    // 13e. Login with old password fails
    const oldLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: resetUser.email, password: resetUser.password });
    expect(oldLoginRes.status).toBe(401);

    // 13f. Login with new password succeeds
    const newLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: resetUser.email, password: newPass });
    expect(newLoginRes.status).toBe(200);
    expect(newLoginRes.body.success).toBe(true);
  });

  it('14. POST /api/auth/logout revokes session token immediately', async () => {
    // Verify token works
    const beforeLogout = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${candidateToken}`);
    expect(beforeLogout.status).toBe(200);

    // Logout
    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${candidateToken}`);
    expect(logoutRes.status).toBe(200);

    // Verify token is now invalid (401)
    const afterLogout = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${candidateToken}`);
    expect(afterLogout.status).toBe(401);
  });
});
