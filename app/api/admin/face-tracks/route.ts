import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action') || 'stats';

    switch (action) {
      case 'stats':
        return await getFaceTrackStats();
      case 'list':
        return await getFaceTrackList();
      case 'storage':
        return await getStorageStats();
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Admin endpoint error:", error);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}

async function getFaceTrackStats() {
  try {
    // Get database stats
    const { data: dbStats, error: dbError } = await supabase
      .from('face_track_mappings')
      .select('generated_count, created_at')
      .order('created_at', { ascending: false });

    // Get storage stats
    const { data: storageFiles, error: storageError } = await supabase.storage
      .from("generated")
      .list("");

    const stats = {
      database: {
        available: !dbError,
        error: dbError?.message,
        totalMappings: dbStats?.length || 0,
        totalGenerations: dbStats?.reduce((sum, mapping) => sum + mapping.generated_count, 0) || 0,
        averageGenerationsPerFace: dbStats?.length ? 
          (dbStats.reduce((sum, mapping) => sum + mapping.generated_count, 0) / dbStats.length).toFixed(2) : 0
      },
      storage: {
        available: !storageError,
        error: storageError?.message,
        totalFiles: storageFiles?.length || 0,
        files: storageFiles?.map(file => ({
          name: file.name,
          size: file.metadata?.size,
          lastModified: file.updated_at
        })) || []
      },
      consistency: {
        dbVsStorage: dbStats && storageFiles ? 
          `${dbStats.length} DB mappings vs ${storageFiles.length} storage files` : 
          'Cannot compare - one source unavailable'
      }
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Stats error:", error);
    return NextResponse.json({ error: "Failed to get stats" }, { status: 500 });
  }
}

async function getFaceTrackList() {
  try {
    const { data: mappings, error } = await supabase
      .from('face_track_mappings')
      .select('*')
      .order('last_accessed', { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json({ 
        error: "Database not available", 
        details: error.message,
        fallback: "Using file-based tracking only"
      }, { status: 200 });
    }

    const formattedMappings = mappings.map(mapping => ({
      trackId: mapping.track_id,
      faceHashPreview: `${mapping.face_hash.substring(0, 8)}...`,
      generatedCount: mapping.generated_count,
      createdAt: new Date(mapping.created_at).toLocaleString(),
      lastAccessed: new Date(mapping.last_accessed).toLocaleString(),
      audioUrl: mapping.audio_url
    }));

    return NextResponse.json({
      total: mappings.length,
      mappings: formattedMappings
    });
  } catch (error) {
    console.error("List error:", error);
    return NextResponse.json({ error: "Failed to get mappings list" }, { status: 500 });
  }
}

async function getStorageStats() {
  try {
    const { data: files, error } = await supabase.storage
      .from("generated")
      .list("");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const fileStats = files.map(file => ({
      name: file.name,
      trackId: file.name.replace('.mp3', ''),
      size: file.metadata?.size ? `${(file.metadata.size / 1024 / 1024).toFixed(2)} MB` : 'Unknown',
      lastModified: file.updated_at ? new Date(file.updated_at).toLocaleString() : 'Unknown',
      publicUrl: supabase.storage.from("generated").getPublicUrl(file.name).data.publicUrl
    }));

    return NextResponse.json({
      totalFiles: files.length,
      totalSize: files.reduce((sum, file) => sum + (file.metadata?.size || 0), 0),
      files: fileStats.sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime())
    });
  } catch (error) {
    console.error("Storage stats error:", error);
    return NextResponse.json({ error: "Failed to get storage stats" }, { status: 500 });
  }
}
