/**
 * Shared triage engine.
 *
 * IMPORTANT: This is the single source of truth for urgency classification.
 * Both routes/symptoms.js (app/API channel) and routes/ussd.js (USSD channel)
 * must call this function so behavior is identical across channels.
 *
 * @param {Object} input
 * @param {boolean} input.chestPain
 * @param {boolean} input.breathingDifficulty
 * @param {boolean} input.fever
 * @param {number}  input.durationDays - how many days the symptom(s) have persisted
 * @param {boolean} input.heavyBleeding
 * @param {boolean} input.lossOfConsciousness
 * @returns {{ level: 'emergency'|'soon'|'routine', advice: string }}
 */
function classifyTriage(input = {}) {
  const {
    chestPain = false,
    breathingDifficulty = false,
    heavyBleeding = false,
    lossOfConsciousness = false,
    fever = false,
    durationDays = 0,
  } = input;

  // --- EMERGENCY ---
  if (chestPain || breathingDifficulty || heavyBleeding || lossOfConsciousness) {
    return {
      level: 'emergency',
      advice:
        'This may be a medical emergency. Go to the nearest clinic immediately or trigger SOS now.',
    };
  }

  // --- SOON ---
  if ((fever && durationDays >= 3) || durationDays >= 7) {
    return {
      level: 'soon',
      advice:
        'Your symptoms have lasted a while and should be checked by a health worker in the next day or two. Find a nearby clinic.',
    };
  }

  // --- ROUTINE ---
  return {
    level: 'routine',
    advice:
      'Your symptoms sound mild for now. Rest, stay hydrated, and monitor. Seek care if things get worse or last more than a few days.',
  };
}

module.exports = { classifyTriage };
