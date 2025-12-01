import {
  RekognitionClient,
  CreateCollectionCommand,
  IndexFacesCommand,
  SearchFacesByImageCommand,
  DetectFacesCommand,
  DeleteCollectionCommand,
} from "@aws-sdk/client-rekognition";

const rekognitionClient = new RekognitionClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const COLLECTION_ID = process.env.REKOGNITION_COLLECTION_ID || "face-tracks-collection";

/**
 * Delete and recreate the collection (clears all faces)
 */
export async function resetCollection() {
  try {
    await rekognitionClient.send(new DeleteCollectionCommand({ CollectionId: COLLECTION_ID }));
    console.log(`[Rekognition] Deleted collection: ${COLLECTION_ID}`);
  } catch (error: any) {
    if (error.name === "ResourceNotFoundException") {
      console.log(`[Rekognition] Collection doesn't exist: ${COLLECTION_ID}`);
    } else {
      throw error;
    }
  }
  
  await ensureCollection();
}

/**
 * Ensure the Rekognition collection exists (create if needed)
 */
export async function ensureCollection() {
  try {
    await rekognitionClient.send(new CreateCollectionCommand({ CollectionId: COLLECTION_ID }));
    console.log(`[Rekognition] Created collection: ${COLLECTION_ID}`);
  } catch (error: any) {
    if (error.name === "ResourceAlreadyExistsException") {
      console.log(`[Rekognition] Collection already exists: ${COLLECTION_ID}`);
    } else {
      throw error;
    }
  }
}

/**
 * Search for matching faces in the collection
 * Returns face ID and similarity if match found, null otherwise
 */
export async function searchFaceByImage(imageBytes: Buffer, similarityThreshold: number = 90) {
  try {
    const response = await rekognitionClient.send(
      new SearchFacesByImageCommand({
        CollectionId: COLLECTION_ID,
        Image: { Bytes: imageBytes },
        FaceMatchThreshold: similarityThreshold,
        MaxFaces: 1,
      })
    );

    if (response.FaceMatches && response.FaceMatches.length > 0) {
      const match = response.FaceMatches[0];
      return {
        faceId: match.Face?.FaceId,
        similarity: match.Similarity,
        externalImageId: match.Face?.ExternalImageId,
      };
    }

    return null;
  } catch (error: any) {
    if (error.name === "InvalidParameterException" && error.message.includes("no faces")) {
      return null; // No face detected in image
    }
    throw error;
  }
}

/**
 * Index a new face in the collection
 * Returns the face ID
 */
export async function indexFace(imageBytes: Buffer, externalImageId: string) {
  const response = await rekognitionClient.send(
    new IndexFacesCommand({
      CollectionId: COLLECTION_ID,
      Image: { Bytes: imageBytes },
      ExternalImageId: externalImageId,
      MaxFaces: 1,
      QualityFilter: "AUTO",
      DetectionAttributes: ["DEFAULT"],
    })
  );

  if (!response.FaceRecords || response.FaceRecords.length === 0) {
    throw new Error("No face detected in image");
  }

  return {
    faceId: response.FaceRecords[0].Face?.FaceId,
    externalImageId: response.FaceRecords[0].Face?.ExternalImageId,
  };
}

/**
 * Detect faces in image (quality check)
 */
export async function detectFaces(imageBytes: Buffer) {
  const response = await rekognitionClient.send(
    new DetectFacesCommand({
      Image: { Bytes: imageBytes },
      Attributes: ["ALL"],
    })
  );

  return response.FaceDetails || [];
}
