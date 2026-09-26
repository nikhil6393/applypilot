import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('ApplyPilot Browser Extension Architecture Tests', () => {
  const extensionDir = path.resolve(__dirname, '../extension');

  it('extension directory contains required MV3 files', () => {
    expect(fs.existsSync(extensionDir)).toBe(true);
    expect(fs.existsSync(path.join(extensionDir, 'manifest.json'))).toBe(true);
    expect(fs.existsSync(path.join(extensionDir, 'background.js'))).toBe(true);
    expect(fs.existsSync(path.join(extensionDir, 'content.js'))).toBe(true);
    expect(fs.existsSync(path.join(extensionDir, 'content.css'))).toBe(true);
    expect(fs.existsSync(path.join(extensionDir, 'popup.html'))).toBe(true);
    expect(fs.existsSync(path.join(extensionDir, 'popup.js'))).toBe(true);
  });

  it('manifest.json is valid Manifest V3 format with permitted permissions', () => {
    const raw = fs.readFileSync(path.join(extensionDir, 'manifest.json'), 'utf-8');
    const manifest = JSON.parse(raw);

    expect(manifest.manifest_version).toBe(3);
    expect(manifest.name).toContain('ApplyPilot');
    expect(manifest.background.service_worker).toBe('background.js');
    expect(manifest.content_scripts[0].js).toContain('content.js');
    expect(manifest.content_scripts[0].css).toContain('content.css');
    expect(manifest.permissions).toContain('storage');
    // Does NOT request unsafe passwords or dangerous privacy breaches
    expect(manifest.permissions).not.toContain('cookies');
  });

  it('content.js implements ATS form detection and anti-hallucination compliance', () => {
    const contentJs = fs.readFileSync(path.join(extensionDir, 'content.js'), 'utf-8');
    // Check ATS detectors
    expect(contentJs).toContain('greenhouse');
    expect(contentJs).toContain('lever');
    expect(contentJs).toContain('ashby');
    expect(contentJs).toContain('workday');
    expect(contentJs).toContain('linkedin');
    // Check safety: does not touch password inputs
    expect(contentJs).toContain("input.type === 'password'");
    // Check pause on ambiguous questions
    expect(contentJs).toContain('ambiguous');
    expect(contentJs).toContain('applypilot-highlight-review');
    // Check duplicate application detection
    expect(contentJs).toContain('CHECK_DUPLICATE_APPLICATION');
    // Check submission confirmation
    expect(contentJs).toContain('CONFIRM_APPLICATION_SUBMISSION');
    // Check emergency stop
    expect(contentJs).toContain('SET_GLOBAL_STOP');
  });

  it('background.js handles profile sync and duplicate checking', () => {
    const bgJs = fs.readFileSync(path.join(extensionDir, 'background.js'), 'utf-8');
    expect(bgJs).toContain('SYNC_PROFILE_FROM_SERVER');
    expect(bgJs).toContain('CHECK_DUPLICATE_APPLICATION');
    expect(bgJs).toContain('CONFIRM_APPLICATION_SUBMISSION');
    expect(bgJs).toContain('SET_GLOBAL_PAUSE');
    expect(bgJs).toContain('SET_GLOBAL_STOP');
  });
});
