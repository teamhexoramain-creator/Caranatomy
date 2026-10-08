// Writes build/<ep>/cues.json (timeline cues + music settings) for scripts/soundtrack.py.
//   node scripts/cues.mjs ep02
import fs from 'node:fs';

const ep = process.argv[2] || 'ep01';
process.env.EP = ep;
const { EP, DURATION, cues } = await import('../src/story.js');
fs.mkdirSync(`build/${ep}`, { recursive: true });
fs.writeFileSync(`build/${ep}/cues.json`, JSON.stringify({ duration: DURATION, music: EP.music, cues: cues() }, null, 1));
console.log(`build/${ep}/cues.json: ${cues().length} cues`);
