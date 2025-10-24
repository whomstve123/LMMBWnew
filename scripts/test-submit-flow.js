#!/usr/bin/env node
const fetch = (...args) => import('node-fetch').then(({default: fn}) => fn(...args));

async function run() {
  const descriptor = Array.from({length:128}, (_,i) => (i % 16));
  const url = process.env.BASE_URL || 'http://localhost:3000/api/submit';
  console.log('Using URL:', url);

  const resp = await fetch(url, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ email: 'ci-test@example.com', descriptor })
  });

  const body = await resp.json();
  console.log('submit response status:', resp.status);
  console.log(JSON.stringify(body, null, 2));

  if (!resp.ok) process.exit(1);
}

run().catch(err => {
  console.error('Submit flow test failed:', err);
  process.exit(1);
});
