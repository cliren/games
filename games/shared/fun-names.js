/**
 * Unique fun hotseat names. Shuffle rerolls a full set.
 */
const ADJECTIVES = [
  "Sneaky", "Chaotic", "Sleepy", "Spicy", "Cosmic", "Lucky", "Sassy",
  "Zippy", "Funky", "Wobbly", "Crispy", "Daring", "Giddy", "Rusty",
  "Neon", "Bubbly", "Quiet", "Loud", "Tiny", "Mighty", "Zesty", "Snarky",
  "Clumsy", "Clever", "Wild", "Chill", "Bold", "Goofy", "Sharp", "Soft",
];

const NOUNS = [
  "Panda", "Noodle", "Pickle", "Rocket", "Mango", "Badger", "Pixel",
  "Waffle", "Falcon", "Gnome", "Llama", "Bagel", "Comet", "Otter",
  "Taco", "Yeti", "Koala", "Donut", "Cactus", "Raven", "Muffin", "Sloth",
  "Biscuit", "Dragon", "Penguin", "Turtle", "Wizard", "Ninja", "Potato", "Fox",
];

function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Build one fun name ≤16 chars */
function oneName(used) {
  for (let attempt = 0; attempt < 80; attempt++) {
    const a = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const n = NOUNS[Math.floor(Math.random() * NOUNS.length)];
    let name = `${a}${n}`;
    if (name.length > 16) name = name.slice(0, 16);
    const key = name.toLowerCase();
    if (!used.has(key)) {
      used.add(key);
      return name;
    }
  }
  // Fallback numbered
  let i = 1;
  while (used.has(`player${i}`)) i++;
  const fallback = `Player${i}`;
  used.add(fallback.toLowerCase());
  return fallback;
}

/**
 * @param {number} count
 * @param {string[]} [avoid=[]] names to not collide with
 * @returns {string[]}
 */
export function generateFunNames(count, avoid = []) {
  const n = Math.max(0, Math.min(8, count | 0));
  const used = new Set(avoid.map((s) => String(s).toLowerCase()));
  const out = [];
  for (let i = 0; i < n; i++) out.push(oneName(used));
  return out;
}

/**
 * Reroll the same number of names (unique).
 * @param {number} count
 * @returns {string[]}
 */
export function shuffleFunNames(count) {
  return generateFunNames(count);
}

export function defaultPlayerCount() {
  return 4;
}
