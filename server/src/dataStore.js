const fs = require('fs');
const path = require('path');

// Set DATA_DIR to a mounted volume (e.g. on Railway) so edits survive redeploys;
// defaults to the bundled seed file for local dev.
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const SEED_FILE = path.join(__dirname, '..', 'data', 'companies.json');
const DATA_FILE = path.join(DATA_DIR, 'companies.json');

let cache = null;
let writeQueue = Promise.resolve();

function load() {
  if (cache) return cache;
  if (!fs.existsSync(DATA_FILE)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.copyFileSync(SEED_FILE, DATA_FILE);
  }
  const raw = fs.readFileSync(DATA_FILE, 'utf8');
  cache = JSON.parse(raw);
  return cache;
}

// Serializes writes so concurrent edits from multiple team members never race each other onto disk.
function persist() {
  writeQueue = writeQueue.then(() => new Promise((resolve, reject) => {
    const tmpFile = DATA_FILE + '.tmp';
    fs.writeFile(tmpFile, JSON.stringify(cache, null, 2), 'utf8', (err) => {
      if (err) return reject(err);
      fs.rename(tmpFile, DATA_FILE, (err2) => {
        if (err2) return reject(err2);
        resolve();
      });
    });
  }));
  return writeQueue;
}

function getData() {
  return load();
}

function getSection(sectionId) {
  const data = load();
  return data.sections.find((s) => s.id === sectionId);
}

function saveAndPersist() {
  return persist();
}

module.exports = { getData, getSection, saveAndPersist, DATA_FILE };
