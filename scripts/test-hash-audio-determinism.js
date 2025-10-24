#!/usr/bin/env node
const fetch = require('node-fetch')
const assert = require('assert').strict

async function run() {
  const descriptor = Array.from({ length: 128 }, (_, i) => i % 32)
  const url = process.env.BASE_URL || 'http://localhost:3000/api/generateTrack'
  console.log('Using URL:', url)

  const results = []
  for (let i = 0; i < 3; i++) {
    console.log(`Posting descriptor (run ${i + 1})...`)
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ descriptor })
    })

    if (!resp.ok) {
      const text = await resp.text()
      throw new Error(`generateTrack failed: ${resp.status} - ${text}`)
    }

    const body = await resp.json()
    console.log('Run', i + 1, '-> trackId', body.trackId)
    results.push(body)
  }

  const first = results[0]
  for (let i = 1; i < results.length; i++) {
    assert.equal(results[i].trackId, first.trackId, 'trackId differs')
    assert.equal(results[i].audioUrl, first.audioUrl, 'audioUrl differs')
  }

  console.log('Determinism test passed: consistent trackId and audioUrl across runs')
}

run().catch(err => {
  console.error('Determinism test failed:', err)
  process.exit(1)
})
