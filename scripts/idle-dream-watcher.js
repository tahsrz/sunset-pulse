/**
 * Jamie Idle Dream Watcher
 * Monitors user interaction and triggers autoDream after 15 minutes of inactivity.
 */
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PROJECT_ROOT = path.join(__dirname, '..');
const INTERACTION_PATH = path.join(PROJECT_ROOT, 'utils/jamie/last_interaction.json');
const STATE_PATH = path.join(PROJECT_ROOT, 'utils/jamie/watcher_state.json');
const PYTHON_SCRIPT = path.join(PROJECT_ROOT, 'lib/ai/bridges/core.py');

const IDLE_THRESHOLD_MS = 15 * 60 * 1000; // 15 Minutes
const CHECK_INTERVAL_MS = 60 * 1000; // Check every minute

console.log(`[WATCHER] Jamie Idle Watcher started. Threshold: 15m.`);

function triggerDream() {
  console.log(`[WATCHER] Idle threshold met. Triggering autoDream...`);
  
  // Update state to prevent multiple triggers for the same idle period
  const state = { last_run: new Date().toISOString() };
  fs.writeFileSync(STATE_PATH, JSON.stringify(state), 'utf8');

  exec(`python "${PYTHON_SCRIPT}"`, (error, stdout, stderr) => {
    if (error) {
      console.error(`[WATCHER] autoDream Error: ${error.message}`);
      return;
    }
    if (stderr) console.error(`[WATCHER] autoDream Stderr: ${stderr}`);
    console.log(`[WATCHER] autoDream Output:\n${stdout}`);
  });
}

function checkIdleStatus() {
  try {
    if (!fs.existsSync(INTERACTION_PATH)) {
      // console.log('[WATCHER] No interaction recorded yet.');
      return;
    }

    const interactionData = JSON.parse(fs.readFileSync(INTERACTION_PATH, 'utf8'));
    const lastInteraction = new Date(interactionData.timestamp).getTime();
    const now = Date.now();
    const idleTime = now - lastInteraction;

    // Check last run state
    let lastRun = 0;
    if (fs.existsSync(STATE_PATH)) {
      const stateData = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
      lastRun = new Date(stateData.last_run).getTime();
    }

    // Trigger if:
    // 1. Idle time > Threshold
    // 2. We haven't run a dream since the last interaction
    if (idleTime > IDLE_THRESHOLD_MS && lastRun < lastInteraction) {
      triggerDream();
    } else {
      // Optional logging
      const remaining = Math.max(0, IDLE_THRESHOLD_MS - idleTime);
      if (idleTime > 0 && remaining > 0) {
          // console.log(`[WATCHER] Idle for ${Math.floor(idleTime/1000)}s. Trigger in ${Math.floor(remaining/1000)}s.`);
      }
    }
  } catch (err) {
    console.error(`[WATCHER] Check Failed:`, err);
  }
}

// Start the loop
setInterval(checkIdleStatus, CHECK_INTERVAL_MS);
checkIdleStatus(); // Initial check
