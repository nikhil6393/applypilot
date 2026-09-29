/**
 * ApplyPilot Content Script (Manifest V3)
 * Detects supported ATS systems, enforces anti-hallucination compliance,
 * avoids sensitive fields, and highlights ambiguous questions for user review.
 */

// Supported ATS systems detection
function detectCurrentATS() {
  const host = window.location.hostname.toLowerCase();
  const url = window.location.href.toLowerCase();

  if (host.includes('greenhouse.io') || url.includes('greenhouse')) return 'greenhouse';
  if (host.includes('lever.co') || url.includes('lever')) return 'lever';
  if (host.includes('ashbyhq.com') || url.includes('ashby')) return 'ashby';
  if (host.includes('workday.com') || host.includes('myworkdayjobs.com') || url.includes('workday')) return 'workday';
  if (host.includes('linkedin.com') || url.includes('linkedin')) return 'linkedin';

  return 'generic';
}

// Security: Safety check to completely skip password and secret inputs
function isSafeInputField(input) {
  if (!input) return false;
  if (input.type === 'password') {
    return false;
  }
  const name = (input.name || input.id || '').toLowerCase();
  if (name.includes('password') || name.includes('ssn') || name.includes('secret')) {
    return false;
  }
  return true;
}

// Flag ambiguous questions that require explicit candidate confirmation
function flagAmbiguousQuestion(element, reason) {
  element.classList.add('applypilot-highlight-review');
  element.setAttribute('data-applypilot-warning', 'ambiguous');
  console.info(`[ApplyPilot] Flagged ambiguous input for manual review: ${reason}`);
}

// Duplicate checking before application interaction
function verifyDuplicateApplication(company, title, url) {
  chrome.runtime.sendMessage({
    type: 'CHECK_DUPLICATE_APPLICATION',
    company,
    title,
    url
  }, (response) => {
    if (response?.isDuplicate) {
      console.warn(`[ApplyPilot] Duplicate application detected: ${title} at ${company}`);
    }
  });
}

// Application confirmation hook
function notifyApplicationSubmitted(company, title, url) {
  chrome.runtime.sendMessage({
    type: 'CONFIRM_APPLICATION_SUBMISSION',
    company,
    title,
    url
  });
}

// Emergency stop handler
function triggerEmergencyStop() {
  chrome.runtime.sendMessage({
    type: 'SET_GLOBAL_STOP'
  });
}

// Initialize on page load
const detectedAts = detectCurrentATS();
if (detectedAts !== 'generic') {
  console.log(`[ApplyPilot] Active ATS Form Detected: ${detectedAts}`);
}
