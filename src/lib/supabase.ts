import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xgsxiednpuxqhcqerdzu.supabase.co/';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhnc3hpZWRucHV4cWhjcWVyZHp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5MjE3MTcsImV4cCI6MjA4NjQ5NzcxN30.3TF2asecsxafYmscgEz60ty1iBsosjSjOiVBoTrZjVU';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const STORAGE_BUCKET = 'media-files';

/**
 * Upload file to its own unique folder inside the bucket
 * Each file gets a folder named by timestamp + random string
 */
export async function uploadFile(file: File): Promise<{ publicUrl: string; folderPath: string } | null> {
  const folderName = `${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  const filePath = `${folderName}/${file.name}`;

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    console.error('Upload error:', error);
    return null;
  }

  const { data } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(filePath);

  return {
    publicUrl: data.publicUrl,
    folderPath: folderName,
  };
}

/**
 * Save shared URL to the shared_files table
 */
export async function saveSharedUrl(
  fileUrl: string,
  fileName: string,
  fileType: string
): Promise<boolean> {
  const { error } = await supabase
    .from('shared_files')
    .insert({
      file_url: fileUrl,
      file_name: fileName,
      file_type: fileType,
      shared_at: new Date().toISOString(),
    });

  if (error) {
    console.error('Save shared URL error:', error);
    return false;
  }
  return true;
}

/**
 * Get all uploaded files by listing all folders in the bucket
 */
export async function getUploadedFiles() {
  // List all folders at root
  const { data: folders, error: folderError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .list('', {
      limit: 200,
      offset: 0,
      sortBy: { column: 'created_at', order: 'desc' },
    });

  if (folderError) {
    console.error('List folders error:', folderError);
    return [];
  }

  if (!folders || folders.length === 0) return [];

  const allFiles: Array<{
    id: string;
    name: string;
    folder: string;
    publicUrl: string;
    created_at: string;
    metadata?: { mimetype?: string; size?: number };
  }> = [];

  // For each folder, list files inside
  for (const folder of folders) {
    // Skip if it's a file at root level (not a folder)
    if (folder.metadata && (folder.metadata as Record<string, unknown>).mimetype) continue;

    const { data: files, error: filesError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .list(folder.name, {
        limit: 10,
        sortBy: { column: 'created_at', order: 'desc' },
      });

    if (filesError || !files) continue;

    for (const file of files) {
      if (file.name === '.emptyFolderPlaceholder') continue;
      
      const filePath = `${folder.name}/${file.name}`;
      const { data: urlData } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(filePath);

      allFiles.push({
        id: file.id || `${folder.name}-${file.name}`,
        name: file.name,
        folder: folder.name,
        publicUrl: urlData.publicUrl,
        created_at: file.created_at || folder.created_at || '',
        metadata: file.metadata as { mimetype?: string; size?: number } | undefined,
      });
    }
  }

  // Sort by created_at descending
  allFiles.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return allFiles;
}

/**
 * Delete a file and its folder
 */
export async function deleteFile(folder: string, fileName: string): Promise<boolean> {
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .remove([`${folder}/${fileName}`]);

  if (error) {
    console.error('Delete error:', error);
    return false;
  }
  return true;
}
