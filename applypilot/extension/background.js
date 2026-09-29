/**
 * ApplyPilot Background Service Worker (Manifest V3)
 * Handles profile sync, duplicate detection, and global safety controls.
 */

let globalPause = false;
let globalStop = false;
let userProfile = null;

// Initialize stored state
chrome.storage.local.get(['applypilot_profile', 'applypilot_paused'], (result) => {
  if (result.applypilot_profile) userProfile = result.applypilot_profile;
  if (result.applypilot_paused) globalPause = result.applypilot_paused;
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'SYNC_PROFILE_FROM_SERVER':
      userProfile = message.profile || null;
      chrome.storage.local.set({ applypilot_profile: userProfile }, () => {
        sendResponse({ success: true, synced: Boolean(userProfile) });
      });
      return true;

    case 'CHECK_DUPLICATE_APPLICATION':
      chrome.storage.local.get(['applied_jobs'], (res) => {
        const applied = res.applied_jobs || [];
        const isDuplicate = applied.some(
          (j) => (j.url && j.url === message.url) || (j.company === message.company && j.title === message.title)
        );
        sendResponse({ isDuplicate, appliedAt: isDuplicate ? applied[0]?.date : null });
      });
      return true;

    case 'CONFIRM_APPLICATION_SUBMISSION':
      chrome.storage.local.get(['applied_jobs'], (res) => {
        const applied = res.applied_jobs || [];
        applied.unshift({
          company: message.company,
          title: message.title,
          url: message.url,
          date: new Date().toISOString()
        });
        chrome.storage.local.set({ applied_jobs: applied.slice(0, 500) }, () => {
          sendResponse({ success: true, recorded: true });
        });
      });
      return true;

    case 'SET_GLOBAL_PAUSE':
      globalPause = Boolean(message.paused);
      chrome.storage.local.set({ applypilot_paused: globalPause }, () => {
        sendResponse({ paused: globalPause });
      });
      return true;

    case 'SET_GLOBAL_STOP':
      globalStop = true;
      globalPause = true;
      chrome.storage.local.set({ applypilot_paused: true, applypilot_stopped: true }, () => {
        sendResponse({ stopped: true });
      });
      return true;

    default:
      sendResponse({ status: 'unknown_message' });
      return false;
  }
});
