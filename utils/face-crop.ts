/**
 * Detect face and crop to just the face region
 * Returns cropped face as base64 data URL, or null if no face found
 */
export async function detectAndCropFace(imageDataUrl: string): Promise<string | null> {
  try {
    // Dynamic import to avoid server-side bundling issues
    const faceapi = await import("face-api.js");

    // Create image element
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = imageDataUrl;
    });

    // Detect face with bounding box
    const detection = await faceapi
      .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks();

    if (!detection) {
      console.log("[face-crop] No face detected");
      return null;
    }

    // Get bounding box with some padding
    const box = detection.detection.box;
    const padding = 0.3; // 30% padding around face
    
    const expandedBox = {
      x: Math.max(0, box.x - box.width * padding),
      y: Math.max(0, box.y - box.height * padding),
      width: box.width * (1 + padding * 2),
      height: box.height * (1 + padding * 2),
    };

    // Ensure box doesn't exceed image boundaries
    expandedBox.width = Math.min(expandedBox.width, img.width - expandedBox.x);
    expandedBox.height = Math.min(expandedBox.height, img.height - expandedBox.y);

    // Create canvas and crop to face
    const canvas = document.createElement("canvas");
    canvas.width = expandedBox.width;
    canvas.height = expandedBox.height;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(
      img,
      expandedBox.x,
      expandedBox.y,
      expandedBox.width,
      expandedBox.height,
      0,
      0,
      expandedBox.width,
      expandedBox.height
    );

    // Convert to base64
    const croppedDataUrl = canvas.toDataURL("image/jpeg", 0.95);
    
    console.log(`[face-crop] Cropped face: ${expandedBox.width}x${expandedBox.height}`);
    return croppedDataUrl;
  } catch (error) {
    console.error("[face-crop] Error:", error);
    return null;
  }
}
