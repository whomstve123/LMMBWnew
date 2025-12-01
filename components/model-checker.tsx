"use client"

import { useState, useEffect } from "react"

export default function ModelChecker() {
  const [modelStatus, setModelStatus] = useState<Record<string, boolean>>({})
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    async function checkModels() {
      setChecking(true)
      const modelFiles = [
        "/models/ssd_mobilenetv1_model-weights_manifest.json",
        "/models/face_landmark_68_model-weights_manifest.json",
        "/models/face_recognition_model-weights_manifest.json",
      ]

      const results: Record<string, boolean> = {}

      for (const modelFile of modelFiles) {
        try {
          const response = await fetch(modelFile, { method: "HEAD" })
          results[modelFile] = response.ok
        } catch (e) {
          results[modelFile] = false
        }
      }

      setModelStatus(results)
      setChecking(false)
    }

    checkModels()
  }, [])

  if (checking) {
    return <div className="fixed bottom-2 right-2 bg-yellow-100 p-2 text-xs z-50">Checking model files...</div>
  }

  const allModelsAvailable = Object.values(modelStatus).every((status) => status)

  if (!allModelsAvailable) {
    return (
      <div className="fixed bottom-2 right-2 bg-red-100 p-2 text-xs z-50 max-w-xs">
        <p className="font-bold">Missing face-api.js model files:</p>
        <ul className="list-disc pl-4 mt-1">
          {Object.entries(modelStatus).map(([file, available]) => !available && <li key={file}>{file}</li>)}
        </ul>
        <p className="mt-1">Please make sure these files are in the public directory.</p>
      </div>
    )
  }

  return null
}
