"use client"


import type React from "react"
import { useEffect, useRef, useState } from "react"
import * as faceapi from "face-api.js"


interface FaceDetectorProps {
  videoRef: React.RefObject<HTMLVideoElement>
  onFaceDetected: (faceDescriptor: string) => void
  isCapturing: boolean
  onProceed?: () => void
}

export default function FaceDetector({ videoRef, onFaceDetected, isCapturing, onProceed }: FaceDetectorProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDetecting, setIsDetecting] = useState(false)
  const [scanStage, setScanStage] = useState(0)
  const [faceDescriptor, setFaceDescriptor] = useState<string | null>(null)
  const detectionRef = useRef<NodeJS.Timeout | null>(null)

  // Load models on mount
  useEffect(() => {
    async function loadModels() {
      try {
        setIsLoading(true)
        setError(null)

        // Load models directly
        await faceapi.nets.tinyFaceDetector.load("/")
        await faceapi.nets.faceRecognitionNet.load("/")

        setIsLoading(false)
        console.log("Face models loaded successfully")
      } catch (err) {
        console.error("Error loading face models:", err)
        setError("Failed to load face detection models")
        setIsLoading(false)
      }
    }

    loadModels()

    return () => {
      if (detectionRef.current) {
        clearTimeout(detectionRef.current)
      }
    }
  }, [])


  // Start multi-scan averaging when capturing
  useEffect(() => {
    if (isCapturing && !isLoading && !error && videoRef.current) {
      runMultiScan()
    }
    return () => {
      if (detectionRef.current) {
        clearTimeout(detectionRef.current)
      }
    }
  }, [isCapturing, isLoading, error])


  // Multi-scan averaging logic
  const runMultiScan = async () => {
    setIsDetecting(true);
    setScanStage(1);
    setError(null);
    const SCAN_COUNT = 7;
    let descriptors: Float32Array[] = [];
    for (let i = 1; i <= SCAN_COUNT; i++) {
      setScanStage(i);
      try {
        const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 });
        const detection = await faceapi.detectSingleFace(videoRef.current!, options);
        if (detection) {
          const descriptor = await faceapi.computeFaceDescriptor(videoRef.current!);
          if (descriptor) {
            // Normalize and bin descriptor to match backend logic
            const arr = Array.prototype.slice.call(descriptor as Float32Array);
            const mean = arr.reduce((sum, v) => sum + v, 0) / arr.length;
            const std = Math.sqrt(arr.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / arr.length) || 1;
            const normalized = arr.map((v) => (v - mean) / std);
            // Coarse binning: bin to nearest 1.0 and round to integer
            const binned = new Float32Array(normalized.map((v) => Math.round(v)));
            descriptors.push(binned);
            // Debug log each scan descriptor
            console.log(`[SCAN ${i}/${SCAN_COUNT}] Descriptor (coarse):`, binned);
          } else {
            setError("Could not extract face descriptor. Please try again.");
            setIsDetecting(false);
            setScanStage(0);
            return;
          }
        } else {
          setError("No face detected. Please try again.");
          setIsDetecting(false);
          setScanStage(0);
          return;
        }
      } catch (err) {
        setError("Error during face detection.");
        setIsDetecting(false);
        setScanStage(0);
        return;
      }
      await new Promise(res => setTimeout(res, 500));
    }
    // Calculate variance between scans for quality check
    let totalVariance = 0;
    for (let i = 0; i < descriptors[0].length; i++) {
      const values = descriptors.map(d => d[i]);
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
      totalVariance += variance;
    }
    const avgVariance = totalVariance / descriptors[0].length;
    // Debug log variance
    console.log(`[SCAN] Average variance between scans:`, avgVariance);
    // Threshold: if variance is too high, reject scan
    if (avgVariance > 0.05) {
      setError("Scan quality too low. Please keep your face steady and try again.");
      setIsDetecting(false);
      setScanStage(0);
      return;
    }
    // Average descriptors
    const avg = new Float32Array(descriptors[0].length);
    for (let i = 0; i < avg.length; i++) {
      avg[i] = descriptors.map(d => d[i]).reduce((a, b) => a + b, 0) / descriptors.length;
    }
    // Normalize and round descriptor for determinism
  const mean = avg.reduce((sum, v) => sum + v, 0) / avg.length;
  const std = Math.sqrt(avg.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / avg.length) || 1;
  const normalized = avg.map((v) => (v - mean) / std);
  // Ensure integer conversion: Math.round returns a number, but we want explicit integer type
  const rounded = normalized.map((v) => Number(Math.round(v)));
  const finalDescriptor = new Int32Array(rounded);
  const jsonString = JSON.stringify(Array.from(finalDescriptor));
  sessionStorage.setItem("faceDescriptor", jsonString);
  setFaceDescriptor(jsonString);
  if (typeof onFaceDetected === "function") onFaceDetected(jsonString);
  setIsDetecting(false);
  setScanStage(0);
  }


  // UI rendering
  return (
    <>
      {isDetecting && scanStage > 0 && (
        <div className="overlay scan-progress">
          <div className="scan-wheel">
            {[1,2,3].map(i => (
              <div
                key={i}
                className={`scan-dot${scanStage === i ? ' active' : ''}${scanStage > i ? ' done' : ''}`}
              >
                {scanStage > i ? '✔' : ''}
              </div>
            ))}
          </div>
              <span className="scan-label">Scan {scanStage} of 7</span>
        </div>
      )}
      {error && (
        <div className="overlay error">
          <span>{error}</span>
        </div>
      )}
      {faceDescriptor && (
        <button className="proceed-btn" onClick={() => (typeof onProceed === "function" ? onProceed() : undefined)}>
          Proceed
        </button>
      )}
    </>
  )
}
