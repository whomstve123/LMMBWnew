// This script tests that the same face hash always produces the same audio URL, and different hashes produce different URLs.
// Run with: node scripts/test-hash-audio-determinism.js

const fetch = require('node-fetch');

const API_URL = 'https://opulent-fishstick-xg95qgxgxrqhx57-3000.app.github.dev/api/generateTrack'; // Updated for Codespaces public URL

async function testHashDeterminism() {
  const testHashes = [
    'test-face-hash-123',
    'test-face-hash-123', // repeat
    'another-face-hash-456',
  ];

  const results = [];

  for (const hash of testHashes) {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ faceHash: hash }),
    });
    const raw = await res.text();
    let data;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      console.error(`Failed to parse JSON for hash: ${hash}`);
      console.error('Raw response:', raw);
      continue;
    }
    results.push({ hash, audioUrl: data.audioUrl, stems: data.stems, trackId: data.trackId });
    console.log(`Hash: ${hash}\n  Audio URL: ${data.audioUrl}\n  Track ID: ${data.trackId}\n  Stems: ${JSON.stringify(data.stems)}\n`);
  }

  // Check determinism
  if (results[0].audioUrl === results[1].audioUrl && results[0].trackId === results[1].trackId) {
    console.log('PASS: Same hash yields same audio and track ID.');
  } else {
    console.error('FAIL: Same hash yields different audio or track ID!');
  }

  if (results[0].audioUrl !== results[2].audioUrl && results[0].trackId !== results[2].trackId) {
    console.log('PASS: Different hash yields different audio and track ID.');
  } else {
    console.error('FAIL: Different hash yields same audio or track ID!');
  }
}

testHashDeterminism().catch(console.error);
