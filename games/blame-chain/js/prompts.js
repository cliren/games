/** Chaotic family-friendly prompts for Blame Chain (~30). */
export const PROMPTS = [
  "Who microwaved fish at 2am?",
  "Who started the group chat drama?",
  "Who ate the last slice and lied?",
  "Who replied 'k' and meant war?",
  "Who would accidentally reply-all?",
  "Who brought the aux and chose violence?",
  "Who is most likely to 'forget' Venmo?",
  "Who left the party without saying bye?",
  "Who would join a cult for the aesthetics?",
  "Who hid the remote on purpose?",
  "Who dies first in a horror movie for being loud?",
  "Who said 'I'm five minutes away' from bed?",
  "Who would burn toast in a smart kitchen?",
  "Who peeks at gifts before the holiday?",
  "Who would start a podcast about nothing?",
  "Who double-texts then panics?",
  "Who would lose the house keys twice in one day?",
  "Who picks the worst restaurant and insists?",
  "Who would fall asleep mid-movie and snore?",
  "Who 'borrows' chargers permanently?",
  "Who would trip over air in public?",
  "Who leaves dishes 'to soak' forever?",
  "Who would start a dance circle unprompted?",
  "Who gaslights the thermostat?",
  "Who would fake a call to escape small talk?",
  "Who spoils endings 'by accident'?",
  "Who would adopt a raccoon if allowed?",
  "Who sends voice notes longer than podcasts?",
  "Who would blame the dog with no dog?",
  "Who rearranges the fridge like a crime scene?",
];

const RECENT_KEY = "blame-chain:recent-prompts:v1";
const RECENT_MAX = 8;

function loadRecent() {
  try {
    const raw = sessionStorage.getItem(RECENT_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function saveRecent(id) {
  try {
    const recent = loadRecent().filter((x) => x !== id);
    recent.unshift(id);
    sessionStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, RECENT_MAX)));
  } catch {
    /* ignore */
  }
}

/** @returns {{ id: string, text: string }} */
export function randomPrompt() {
  const recent = new Set(loadRecent());
  const pool = PROMPTS.map((text, i) => ({ id: String(i), text })).filter(
    (p) => !recent.has(p.id)
  );
  const list = pool.length ? pool : PROMPTS.map((text, i) => ({ id: String(i), text }));
  const pick = list[Math.floor(Math.random() * list.length)];
  saveRecent(pick.id);
  return pick;
}
