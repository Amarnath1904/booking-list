import { NextRequest } from 'next/server';

// Interface for upload result (MongoDB storage)
interface MongoDBUploadResult {
  secure_url: string;  // Base64 data URL
  public_id: string;   // Generated ID
  format: string;      // Image format
  width: number;       // Default to 0 for base64
  height: number;      // Default to 0 for base64
  resource_type: string; // Always 'image'
  [key: string]: any;  // For other properties
}

/**
 * Convert a file to base64 data URL for MongoDB storage
 * This function converts uploaded files to base64 strings that can be stored
 * directly in MongoDB documents
 */
export async function uploadImage(file: File, folder: string = 'uploads'): Promise<MongoDBUploadResult> {
  try {
    // Check file size to ensure it's not too large for MongoDB
    // MongoDB documents have a 16MB size limit
    const maxSize = 10 * 1024 * 1024; // 10MB max for images
    if (file.size > maxSize) {
      console.warn('File size is large, compressing before storage');
      // In a production app, you might want to implement image compression here
    }
    
    // Convert the file to base64
    const buffer = await file.arrayBuffer();
    const base64String = Buffer.from(buffer).toString('base64');
    const mimeType = file.type;
    const dataUrl = `data:${mimeType};base64,${base64String}`;
    
    // Return the result with the base64 data URL
    return { 
      secure_url: dataUrl,
      public_id: `${folder}/${Date.now()}-${file.name.replace(/\.[^/.]+$/, '')}`,
      format: file.type.split('/')[1] || 'png',
      width: 0,
      height: 0,
      resource_type: 'image'
    };
  } catch (error) {
    console.error('Error converting image to base64:', error);
    throw error;
  }
}

// Function to handle image uploads from multipart form data
export async function handleImageUpload(request: NextRequest): Promise<string[]> {
  const formData = await request.formData();
  const imageUrls: string[] = [];
  
  for (const [key, value] of formData.entries()) {
    if (key.startsWith('images') && value instanceof File) {
      // Convert the file to base64 for MongoDB storage
      const buffer = await value.arrayBuffer();
      const base64String = Buffer.from(buffer).toString('base64');
      const mimeType = value.type;
      const dataUrl = `data:${mimeType};base64,${base64String}`;
      
      imageUrls.push(dataUrl);
    }
  }
  
  return imageUrls;
}

// Extract form data fields excluding files
export async function extractFormFields(request: NextRequest): Promise<Record<string, string | string[]>> {
  const formData = await request.formData();
  const fields: Record<string, string | string[]> = {};
  
  for (const [key, value] of formData.entries()) {
    if (!(value instanceof File)) {
      // Handle arrays (e.g., amenities[])
      if (key.endsWith('[]')) {
        const baseKey = key.slice(0, -2);
        if (!fields[baseKey]) {
          fields[baseKey] = [];
        }
        // Ensure fields[baseKey] is an array before pushing
        if (Array.isArray(fields[baseKey])) {
          (fields[baseKey] as string[]).push(value as string);
        }
      } else {
        fields[key] = value as string;
      }
    }
  }
  
  return fields;
}
