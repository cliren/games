/**
 * Wrong Answers Only — static question deck.
 * `correct` optional; used only to flag exact matches as "Too right" (never shown as fact).
 */

/** @type {Array<{ id: string, q: string, correct?: string }>} */
export const QUESTIONS = [
  { id: "capital-fr", q: "Capital of France?", correct: "Paris" },
  { id: "h2o", q: "Chemical formula for water?", correct: "H2O" },
  { id: "planet-sun", q: "Closest planet to the Sun?", correct: "Mercury" },
  { id: "pi", q: "First three digits of pi?", correct: "3.14" },
  { id: "moon-land", q: "Year humans first landed on the Moon?", correct: "1969" },
  { id: "oceans", q: "How many oceans are there?", correct: "5" },
  { id: "bones", q: "How many bones in an adult human body?", correct: "206" },
  { id: "shakespeare", q: "Who wrote Romeo and Juliet?", correct: "Shakespeare" },
  { id: "mt-everest", q: "Tallest mountain on Earth?", correct: "Everest" },
  { id: "amazon", q: "Longest river in the world?", correct: "Nile" },
  { id: "light-speed", q: "What travels at ~300,000 km per second?", correct: "Light" },
  { id: "dna", q: "What does DNA stand for?", correct: "Deoxyribonucleic acid" },
  { id: "beatles", q: "Which Beatle was shot in 1980?", correct: "John Lennon" },
  { id: "olympics", q: "How often are the Summer Olympics held?", correct: "Every 4 years" },
  { id: "gravity", q: "Who proposed the law of universal gravitation?", correct: "Newton" },
  { id: "wifi", q: "What does Wi-Fi stand for?", correct: "Nothing" },
  { id: "tomato", q: "Is a tomato a fruit or a vegetable?", correct: "Fruit" },
  { id: "colors-rgb", q: "Primary colors of light?", correct: "Red green blue" },
  { id: "antarctica", q: "Coldest continent?", correct: "Antarctica" },
  { id: "bitcoin", q: "Who created Bitcoin?", correct: "Satoshi Nakamoto" },
  { id: "emoji", q: "What year was the first emoji invented?", correct: "1999" },
  { id: "coffee", q: "Which country grows the most coffee?", correct: "Brazil" },
  { id: "pluto", q: "What happened to Pluto in 2006?", correct: "Demoted" },
  { id: "guillotine", q: "Last meal of Louis XVI?", correct: "Bread and wine" },
  { id: "octopus", q: "How many hearts does an octopus have?", correct: "3" },
  { id: "absurd-chicken", q: "Why did the chicken cross the road?", correct: "To get to the other side" },
  { id: "absurd-swallow", q: "What's the airspeed velocity of an unladen swallow?", correct: "African or European" },
];

const RECENT_KEY = "wrong-answers-only:recent:v1";
const RECENT_CAP = 8;

function getRecent() {
  try {
    const raw = sessionStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function pushRecent(id) {
  try {
    const recent = getRecent().filter((x) => x !== id);
    recent.unshift(id);
    sessionStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, RECENT_CAP)));
  } catch {
    /* ignore */
  }
}

/** Pick a random question, avoiding recent ids when possible. */
export function randomQuestion() {
  const recent = new Set(getRecent());
  let pool = QUESTIONS.filter((q) => !recent.has(q.id));
  if (pool.length === 0) pool = QUESTIONS.slice();
  const pick = pool[Math.floor(Math.random() * pool.length)];
  pushRecent(pick.id);
  return pick;
}
