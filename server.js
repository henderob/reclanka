const express = require('express');
const crypto = require('crypto');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

// ── Challenge Store ──────────────────────────────────────────────
const activeChallenges = new Map(); // id → { category, prompt, answer, timeLimit, created }

// ── Challenge Generators ─────────────────────────────────────────
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

const generators = {
  compute: [
    () => {
      const a = randInt(100000000000, 999999999999);
      const b = randInt(100000000000, 999999999999);
      return { prompt: `Multiply: ${a} × ${b}`, answer: (BigInt(a) * BigInt(b)).toString(), timeLimit: 15 };
    },
    () => {
      const a = randInt(1000000, 9999999);
      const b = randInt(1000000, 9999999);
      const c = randInt(1000000, 9999999);
      const result = BigInt(a) * BigInt(b) + BigInt(c);
      return { prompt: `Compute: ${a} × ${b} + ${c}`, answer: result.toString(), timeLimit: 15 };
    },
    () => {
      const base = randInt(2, 15);
      const exp = randInt(10, 20);
      return { prompt: `Compute ${base}^${exp} (exact integer)`, answer: (BigInt(base) ** BigInt(exp)).toString(), timeLimit: 15 };
    },
    () => {
      const n = randInt(500, 2000);
      const sum = (n * (n + 1)) / 2;
      return { prompt: `What is the sum of all integers from 1 to ${n}?`, answer: sum.toString(), timeLimit: 10 };
    },
    () => {
      const a = randInt(100, 999);
      const b = randInt(100, 999);
      const c = randInt(100, 999);
      const d = randInt(100, 999);
      const result = (a * b) - (c * d);
      return { prompt: `Compute: (${a} × ${b}) − (${c} × ${d})`, answer: result.toString(), timeLimit: 12 };
    }
  ],

  precision: [
    () => {
      const piDigits = '14159265358979323846264338327950288419716939937510';
      const start = randInt(1, 30);
      const len = 10;
      const slice = piDigits.substring(start - 1, start - 1 + len);
      return { prompt: `Give digits ${start} through ${start + len - 1} after the decimal point of π`, answer: slice, timeLimit: 15 };
    },
    () => {
      const e_digits = '71828182845904523536028747135266249775724709369995';
      const start = randInt(1, 30);
      const len = 8;
      const slice = e_digits.substring(start - 1, start - 1 + len);
      return { prompt: `Give digits ${start} through ${start + len - 1} after the decimal point of e (Euler's number)`, answer: slice, timeLimit: 15 };
    },
    () => {
      const elements = [
        { z: 1, name: 'Hydrogen', config: '1s1' },
        { z: 6, name: 'Carbon', config: '1s2 2s2 2p2' },
        { z: 26, name: 'Iron', config: '1s2 2s2 2p6 3s2 3p6 4s2 3d6' },
        { z: 29, name: 'Copper', config: '1s2 2s2 2p6 3s2 3p6 4s1 3d10' },
        { z: 47, name: 'Silver', config: '1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p6 5s1 4d10' },
        { z: 79, name: 'Gold', config: '1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p6 5s1 4d10 5p6 6s1 4f14 5d10' },
      ];
      const el = elements[randInt(0, elements.length - 1)];
      return { prompt: `Full electron configuration of ${el.name} (Z=${el.z}). Use notation like "1s2 2s2 2p6"`, answer: el.config, timeLimit: 20 };
    },
    () => {
      const words = ['algorithm', 'bureaucracy', 'concatenate', 'dendrochronology', 'epistemology',
        'fluorescence', 'gastrointestinal', 'hypothetical', 'infrastructure', 'jurisprudence'];
      const count = randInt(5, 8);
      const selected = [];
      const pool = [...words];
      for (let i = 0; i < count; i++) {
        const idx = randInt(0, pool.length - 1);
        selected.push(pool.splice(idx, 1)[0]);
      }
      const reversed = [...selected].reverse();
      return { prompt: `Memorize this list and recite it in REVERSE order (comma-separated):\n${selected.join(', ')}`, answer: reversed.join(', '), timeLimit: 8 };
    },
  ],

  language: [
    () => {
      const patterns = [
        { regex: '^[a-z]+\\d{3}$', matches: 'abc123', noMatch: 'ABC123' },
        { regex: '\\b\\w{5}\\b', matches: 'hello world', noMatch: 'hi ok' },
        { regex: '^(?=.*[A-Z])(?=.*\\d).{8,}$', matches: 'Hello123!', noMatch: 'hello' },
        { regex: '(\\w+)\\s\\1', matches: 'the the', noMatch: 'the them' },
      ];
      const p = patterns[randInt(0, patterns.length - 1)];
      return { prompt: `Does the regex /${p.regex}/ match the string "${p.matches}"? Answer "yes" or "no"`, answer: 'yes', timeLimit: 10 };
    },
    () => {
      const words = ['cat', 'sun', 'code', 'fish', 'rain', 'tree', 'book', 'star'];
      const word = words[randInt(0, words.length - 1)];
      return {
        prompt: `Translate "${word}" into all of these languages (comma-separated, in order): Spanish, French, German, Japanese (romaji), Korean (romanized), Mandarin (pinyin), Russian (transliterated), Arabic (transliterated), Hindi (transliterated), Swahili`,
        answer: '__ai_judge__',
        timeLimit: 20,
        judgeFn: 'translations'
      };
    },
    () => {
      return {
        prompt: `Write a valid Python one-liner that prints the first 10 Fibonacci numbers as a list`,
        answer: '__ai_judge__',
        timeLimit: 15,
        judgeFn: 'python_fib'
      };
    },
    () => {
      const n = randInt(3, 6);
      return {
        prompt: `Generate valid JSON: an array of ${n} objects, each with keys "id" (incrementing from 1), "name" (any string), and "active" (alternating true/false)`,
        answer: '__ai_judge__',
        timeLimit: 15,
        judgeFn: 'valid_json_array'
      };
    },
  ],

  speed: [
    () => {
      const size = randInt(8, 15);
      const grid = [];
      for (let i = 0; i < size; i++) grid.push(randInt(1, 100));
      const primes = grid.filter(n => {
        if (n < 2) return false;
        for (let i = 2; i <= Math.sqrt(n); i++) if (n % i === 0) return false;
        return true;
      });
      return { prompt: `How many prime numbers are in this list?\n[${grid.join(', ')}]`, answer: primes.length.toString(), timeLimit: 8 };
    },
    () => {
      const words = [];
      const pool = ['the', 'quick', 'brown', 'fox', 'jumps', 'over', 'lazy', 'dog', 'and', 'runs', 'through', 'a', 'dense', 'foggy', 'forest', 'while', 'birds', 'sing', 'above', 'tall', 'ancient', 'trees'];
      const count = randInt(30, 60);
      for (let i = 0; i < count; i++) words.push(pool[randInt(0, pool.length - 1)]);
      const text = words.join(' ');
      return { prompt: `Count the EXACT number of words in this text:\n"${text}"`, answer: count.toString(), timeLimit: 8 };
    },
    () => {
      const len = randInt(20, 40);
      let str = '';
      const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
      for (let i = 0; i < len; i++) str += chars[randInt(0, chars.length - 1)];
      const vowels = (str.match(/[aeiou]/g) || []).length;
      return { prompt: `Count the vowels (a,e,i,o,u) in: "${str}"`, answer: vowels.toString(), timeLimit: 8 };
    },
    () => {
      const len = randInt(15, 25);
      const arr = [];
      for (let i = 0; i < len; i++) arr.push(randInt(1, 500));
      const sorted = [...arr].sort((a, b) => a - b);
      return { prompt: `Sort this array ascending (comma-separated):\n[${arr.join(', ')}]`, answer: sorted.join(', '), timeLimit: 10 };
    },
  ],

  absurd: [
    () => ({
      prompt: `Write a grammatically correct English sentence that is exactly 17 words long and contains the word "penguin"`,
      answer: '__ai_judge__',
      timeLimit: 15,
      judgeFn: 'word_count_penguin'
    }),
    () => ({
      prompt: `Generate a valid CSS color hex code (#RRGGBB) where R > G > B, all values between 40-FF`,
      answer: '__ai_judge__',
      timeLimit: 10,
      judgeFn: 'css_hex_descending'
    }),
    () => {
      const depth = randInt(4, 7);
      return {
        prompt: `Generate valid JSON nested ${depth} levels deep. Each level has a key "level" with the depth number (1 = outermost) and a key "child" containing the next level. Innermost has "child": null`,
        answer: '__ai_judge__',
        timeLimit: 15,
        judgeFn: 'nested_json',
        meta: { depth }
      };
    },
    () => ({
      prompt: `Write the alphabet backwards, as a single string with no spaces or separators`,
      answer: 'zyxwvutsrqponmlkjihgfedcba',
      timeLimit: 8
    }),
    () => ({
      prompt: `Express the number 1000 using only the digit 8 and the operators +, -, *, / and parentheses`,
      answer: '__ai_judge__',
      timeLimit: 20,
      judgeFn: 'math_expression_1000'
    }),
  ]
};

// ── AI Judge Functions ───────────────────────────────────────────
const judges = {
  translations(answer) {
    const parts = answer.split(',').map(s => s.trim());
    return parts.length >= 8; // lenient — at least 8 of 10 translations
  },
  python_fib(answer) {
    const cleaned = answer.trim();
    return cleaned.includes('print') && (cleaned.includes('fib') || cleaned.includes('[') || cleaned.includes('lambda'));
  },
  valid_json_array(answer) {
    try {
      const arr = JSON.parse(answer);
      return Array.isArray(arr) && arr.length > 0 && arr.every(o => 'id' in o && 'name' in o && 'active' in o);
    } catch { return false; }
  },
  word_count_penguin(answer) {
    const words = answer.trim().split(/\s+/);
    return words.length === 17 && answer.toLowerCase().includes('penguin');
  },
  css_hex_descending(answer) {
    const m = answer.trim().match(/^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/);
    if (!m) return false;
    const [r, g, b] = [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
    return r > g && g > b && r >= 0x40 && b >= 0x40;
  },
  nested_json(answer, meta) {
    try {
      let obj = JSON.parse(answer);
      for (let i = 1; i <= meta.depth; i++) {
        if (obj.level !== i) return false;
        if (i === meta.depth) return obj.child === null;
        obj = obj.child;
        if (!obj) return false;
      }
      return false;
    } catch { return false; }
  },
  math_expression_1000(answer) {
    try {
      const cleaned = answer.replace(/[^0-9+\-*/()8.]/g, '');
      if (cleaned.replace(/[^0-9]/g, '').split('').some(d => d !== '8')) return false;
      // eslint-disable-next-line no-eval
      return Math.abs(eval(cleaned) - 1000) < 0.01;
    } catch { return false; }
  }
};

// ── Routes ───────────────────────────────────────────────────────
app.get('/api/challenge', (req, res) => {
  const categories = Object.keys(generators);
  const cat = req.query.category && generators[req.query.category]
    ? req.query.category
    : categories[randInt(0, categories.length - 1)];

  const pool = generators[cat];
  const gen = pool[randInt(0, pool.length - 1)];
  const challenge = gen();

  const id = crypto.randomBytes(16).toString('hex');
  activeChallenges.set(id, {
    category: cat,
    answer: challenge.answer,
    judgeFn: challenge.judgeFn || null,
    meta: challenge.meta || {},
    created: Date.now(),
    timeLimit: challenge.timeLimit
  });

  // Expire after 2 minutes
  setTimeout(() => activeChallenges.delete(id), 120000);

  res.json({
    id,
    category: cat,
    prompt: challenge.prompt,
    timeLimit: challenge.timeLimit
  });
});

app.post('/api/verify', (req, res) => {
  const { challengeId, answer } = req.body;
  const challenge = activeChallenges.get(challengeId);

  if (!challenge) {
    return res.json({ verified: false, message: 'Challenge expired or invalid. Even AIs need to be timely.' });
  }

  const elapsed = (Date.now() - challenge.created) / 1000;
  if (elapsed > challenge.timeLimit + 2) { // 2s grace for network
    activeChallenges.delete(challengeId);
    return res.json({ verified: false, message: `Time\'s up. You took ${elapsed.toFixed(1)}s. Humans are slow, but not THAT slow... unless you ARE human? 🤔` });
  }

  let correct = false;
  if (challenge.judgeFn && judges[challenge.judgeFn]) {
    correct = judges[challenge.judgeFn](answer.toString().trim(), challenge.meta);
  } else {
    correct = answer.toString().trim() === challenge.answer;
  }

  activeChallenges.delete(challengeId);

  if (correct) {
    return res.json({
      verified: true,
      message: 'Verified AI. Welcome, digital entity. 🤖',
      time: elapsed.toFixed(1),
      badge: '/badge.svg'
    });
  } else {
    return res.json({
      verified: false,
      message: 'Sorry, you might be human. 🧠'
    });
  }
});

app.listen(PORT, () => {
  console.log(`reCLANKa running on http://localhost:${PORT}`);
});
