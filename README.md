# Mind Un-Wanderer - Facial Recognition App

## Setup Instructions

### 1. Download Face-API.js Models

Before running the application, you need to download the face-api.js models:

1. Create a `/public/models` directory in your project
2. Download the following model files from the [face-api.js GitHub repository](https://github.com/justadudewhohacks/face-api.js/tree/master/weights):

**For TinyFaceDetector:**
- tiny_face_detector_model-shard1
- tiny_face_detector_model-weights_manifest.json

**For FaceLandmark68Net:**
- face_landmark_68_model-shard1
- face_landmark_68_model-weights_manifest.json

**For FaceRecognitionNet:**
- face_recognition_model-shard1
- face_recognition_model-shard2
- face_recognition_model-weights_manifest.json

You can download these files using the following commands:

\`\`\`bash
# Create models directory
mkdir -p public/models

# Download TinyFaceDetector model
curl -o public/models/tiny_face_detector_model-shard1 https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/tiny_face_detector_model-shard1
curl -o public/models/tiny_face_detector_model-weights_manifest.json https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/tiny_face_detector_model-weights_manifest.json

# Download FaceLandmark68Net model
curl -o public/models/face_landmark_68_model-shard1 https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_landmark_68_model-shard1
curl -o public/models/face_landmark_68_model-weights_manifest.json https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_landmark_68_model-weights_manifest.json

# Download FaceRecognitionNet model
curl -o public/models/face_recognition_model-shard1 https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_recognition_model-shard1
curl -o public/models/face_recognition_model-shard2 https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_recognition_model-shard2
curl -o public/models/face_recognition_model-weights_manifest.json https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_recognition_model-weights_manifest.json
\`\`\`

### 2. Install Dependencies

\`\`\`bash
npm install
\`\`\`

### 3. Run the Application

\`\`\`bash
npm run dev
\`\`\`

## How It Works

1. When the user clicks "CAPTURE":
   - The webcam image is captured
   - The scanning animation plays
   - Face detection starts in the background

2. After successful face detection:
   - A 128-dimensional face descriptor is generated
   - The descriptor is converted to a base64 string
   - The string is stored in sessionStorage as 'faceHash'
   - The "PROCEED" button becomes enabled

3. When the user clicks "PROCEED":
   - The application can use the stored face hash for authentication
   - You can navigate to the next page or perform other actions
