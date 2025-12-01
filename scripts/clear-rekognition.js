const { RekognitionClient, DeleteCollectionCommand, CreateCollectionCommand } = require("@aws-sdk/client-rekognition");
require('dotenv').config();

const client = new RekognitionClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const COLLECTION_ID = process.env.REKOGNITION_COLLECTION_ID || "face-tracks-collection";

async function resetCollection() {
  try {
    // Delete existing collection
    await client.send(new DeleteCollectionCommand({ CollectionId: COLLECTION_ID }));
    console.log(`✓ Deleted collection: ${COLLECTION_ID}`);
  } catch (error) {
    if (error.name === "ResourceNotFoundException") {
      console.log(`Collection doesn't exist: ${COLLECTION_ID}`);
    } else {
      throw error;
    }
  }
  
  // Create new collection
  await client.send(new CreateCollectionCommand({ CollectionId: COLLECTION_ID }));
  console.log(`✓ Created collection: ${COLLECTION_ID}`);
}

resetCollection().catch(console.error);
