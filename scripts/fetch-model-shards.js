#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const https = require('https')

const MODEL_DIR = path.resolve(__dirname, '../public/models')
const BASE_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights'

if (!fs.existsSync(MODEL_DIR)) {
  console.error('Model directory does not exist:', MODEL_DIR)
  process.exit(1)
}

const manifests = [
  'mtcnn_model-weights_manifest.json',
  'face_landmark_68_model-weights_manifest.json',
  'face_recognition_model-weights_manifest.json',
]

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest)
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        // follow redirect
        return download(res.headers.location, dest).then(resolve).catch(reject)
      }
      if (res.statusCode !== 200) {
        file.close()
        fs.unlinkSync(dest)
        return reject(new Error(`Failed to download ${url}: ${res.statusCode}`))
      }
      res.pipe(file)
      file.on('finish', () => file.close(resolve))
    }).on('error', (err) => {
      try { fs.unlinkSync(dest) } catch (e) {}
      reject(err)
    })
  })
}

;(async function main(){
  try {
    for (const m of manifests) {
      const mpath = path.join(MODEL_DIR, m)
      if (!fs.existsSync(mpath)) {
        console.warn('Manifest not found, skipping:', mpath)
        continue
      }
      const content = fs.readFileSync(mpath, 'utf8')
      let json
      try { json = JSON.parse(content) } catch (e) { console.warn('Invalid JSON in', mpath); continue }

      // Normalize manifests that may be arrays like [{ weights: [...], paths: [...] }]
      if (Array.isArray(json) && json.length === 1) json = json[0]

      // Some manifests list 'weights[].file', others list 'paths' with shard basenames.
      const weightFiles = []
      if (Array.isArray(json.weights)) {
        for (const w of json.weights) {
          if (w && typeof w.file === 'string') weightFiles.push(w.file)
        }
      }
      if (Array.isArray(json.paths)) {
        for (const p of json.paths) {
          if (typeof p === 'string') weightFiles.push(p)
        }
      }

      if (!weightFiles.length) {
        console.warn('No weight files referenced in', m)
        continue
      }

      for (const shard of Array.from(new Set(weightFiles))) {
            const dest = path.join(MODEL_DIR, shard)
            if (fs.existsSync(dest)) {
              console.log('Already exists:', shard)
              continue
            }
            const url = `${BASE_URL}/${shard}`
            console.log('Downloading', url)
            try {
              await download(url, dest)
              console.log('Saved', shard)
            } catch (err) {
              console.error('Failed to download', shard, err.message)
            }
          }
    }
    console.log('Done')
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
})()
