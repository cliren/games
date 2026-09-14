/**
 * Most Likely Pass — prompt deck.
 * Tags: chill | chaotic. No spicy in v1. No deck picker — one pool.
 */
export const PROMPTS = [
  { id: "c01", tag: "chaotic", text: "Most likely to start a group chat at 3am" },
  { id: "c02", tag: "chaotic", text: "Most likely to reply-all by accident" },
  { id: "c03", tag: "chaotic", text: "Most likely to order food and fall asleep" },
  { id: "c04", tag: "chaotic", text: "Most likely to get lost with GPS on" },
  { id: "c05", tag: "chaotic", text: "Most likely to take a selfie in a museum" },
  { id: "c06", tag: "chaotic", text: "Most likely to burn toast somehow" },
  { id: "c07", tag: "chaotic", text: "Most likely to start a rumor they believe" },
  { id: "c08", tag: "chaotic", text: "Most likely to cry at a commercial" },
  { id: "c09", tag: "chaotic", text: "Most likely to join a cult for the snacks" },
  { id: "c10", tag: "chaotic", text: "Most likely to text the wrong person" },
  { id: "c11", tag: "chaotic", text: "Most likely to become a conspiracy theorist" },
  { id: "c12", tag: "chaotic", text: "Most likely to name a plant and forget it" },
  { id: "c13", tag: "chaotic", text: "Most likely to argue with a GPS" },
  { id: "c14", tag: "chaotic", text: "Most likely to bring a weird snack to share" },
  { id: "c15", tag: "chaotic", text: "Most likely to go viral for the wrong reason" },
  { id: "c16", tag: "chaotic", text: "Most likely to leave a read receipt on purpose" },
  { id: "c17", tag: "chaotic", text: "Most likely to start dancing unprompted" },
  { id: "c18", tag: "chaotic", text: "Most likely to buy something at 2am" },
  { id: "c19", tag: "chaotic", text: "Most likely to lose their keys indoors" },
  { id: "c20", tag: "chaotic", text: "Most likely to rewrite history in the group chat" },
  { id: "c21", tag: "chaotic", text: "Most likely to become a reality TV villain" },
  { id: "c22", tag: "chaotic", text: "Most likely to adopt a raccoon energy" },
  { id: "c23", tag: "chaotic", text: "Most likely to say “one more episode” at dawn" },
  { id: "c24", tag: "chaotic", text: "Most likely to overshare with a stranger" },
  { id: "h01", tag: "chill", text: "Most likely to remember everyone’s birthday" },
  { id: "h02", tag: "chill", text: "Most likely to plan the trip and never book it" },
  { id: "h03", tag: "chill", text: "Most likely to bring snacks for the group" },
  { id: "h04", tag: "chill", text: "Most likely to adopt a pet on a whim" },
  { id: "h05", tag: "chill", text: "Most likely to send a voice note too long" },
  { id: "h06", tag: "chill", text: "Most likely to fall asleep on the couch first" },
  { id: "h07", tag: "chill", text: "Most likely to show up early and wait outside" },
  { id: "h08", tag: "chill", text: "Most likely to fix everyone’s Wi-Fi" },
  { id: "h09", tag: "chill", text: "Most likely to start a book club that meets once" },
  { id: "h10", tag: "chill", text: "Most likely to know the barista’s name" },
  { id: "h11", tag: "chill", text: "Most likely to take the scenic route every time" },
  { id: "h12", tag: "chill", text: "Most likely to host game night" },
  { id: "h13", tag: "chill", text: "Most likely to have a favorite mug" },
  { id: "h14", tag: "chill", text: "Most likely to send a meme instead of a reply" },
  { id: "h15", tag: "chill", text: "Most likely to water plants that aren’t theirs" },
  { id: "h16", tag: "chill", text: "Most likely to keep a spreadsheet for fun" },
];

const RECENT_KEY = "most-likely-pass:recent-prompts:v1";
const RECENT_MAX = 8;

function loadRecent() {
  try {
    const raw = sessionStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveRecent(ids) {
  try {
    sessionStorage.setItem(RECENT_KEY, JSON.stringify(ids.slice(0, RECENT_MAX)));
  } catch {
    /* ignore */
  }
}

/** Pick a random prompt, avoiding recent ids when possible. */
export function pickPrompt() {
  const recent = loadRecent();
  const pool = PROMPTS.filter((p) => !recent.includes(p.id));
  const source = pool.length ? pool : PROMPTS.slice();
  const choice = source[Math.floor(Math.random() * source.length)];
  const next = [choice.id, ...recent.filter((id) => id !== choice.id)];
  saveRecent(next);
  return choice;
}
