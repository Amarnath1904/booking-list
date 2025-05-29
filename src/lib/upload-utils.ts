import { NextRequest } from 'next/server';

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
