'use client';

import { useState, useEffect, FormEvent, ChangeEvent, use } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import Image from 'next/image';

interface Property {
  _id: string;
  name: string;
  location: string;
  images?: string[];
}

// Define interface for page props in Next.js 15
interface AddPropertyImagesPageProps {
  params: Promise<{ id: string }>;
}

export default function AddPropertyImagesPage({ 
  params: paramsPromise,
}: AddPropertyImagesPageProps) {
  const params = use(paramsPromise); // Resolve the params promise
  const { user } = useAuth();
  const router = useRouter();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);

  // Load property data
  useEffect(() => {
    async function fetchPropertyDetails() {
      if (!user) return;

      try {
        setLoading(true);
        const token = await user.getIdToken();
        
        const response = await fetch(`/api/properties/${params.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to load property details');
        }

        const data = await response.json();
        setProperty(data);
        
        // Set existing images if any
        if (data.images && data.images.length > 0) {
          setExistingImages(data.images);
        }
      } catch (err) {
        setError('An error occurred while fetching property details');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchPropertyDetails();
  }, [params.id, user]);

  // Handle file selection
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setSelectedFiles([...selectedFiles, ...filesArray]);
      
      // Create preview URLs
      const newPreviewUrls = filesArray.map(file => URL.createObjectURL(file));
      setPreviewUrls([...previewUrls, ...newPreviewUrls]);
    }
  };

  // Remove a selected file
  const removeFile = (index: number) => {
    const newFiles = [...selectedFiles];
    newFiles.splice(index, 1);
    setSelectedFiles(newFiles);
    
    const newPreviewUrls = [...previewUrls];
    URL.revokeObjectURL(newPreviewUrls[index]);
    newPreviewUrls.splice(index, 1);
    setPreviewUrls(newPreviewUrls);
  };

  // Remove an existing image
  const removeExistingImage = (index: number) => {
    const newImages = [...existingImages];
    newImages.splice(index, 1);
    setExistingImages(newImages);
  };

  // Handle form submission
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!property) return;
    
    try {
      setSubmitting(true);
      setError(null);
      
      const token = await user!.getIdToken();
      
      // First, upload new images if any
      let newImageUrls: string[] = [];
      
      if (selectedFiles.length > 0) {
        const formData = new FormData();
        selectedFiles.forEach((file, index) => {
          formData.append(`images[${index}]`, file);
        });
        
        const uploadResponse = await fetch('/api/upload-images', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });
        
        if (!uploadResponse.ok) {
          throw new Error('Failed to upload images');
        }
        
        const uploadResult = await uploadResponse.json();
        newImageUrls = uploadResult.imageUrls;
      }
      
      // Update the property with all images (existing + new)
      const propertyData = {
        images: [...existingImages, ...newImageUrls]
      };
      
      const response = await fetch(`/api/properties/${property._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(propertyData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update property images');
      }
      
      setSuccess(true);
      
      // Reset form
      setSelectedFiles([]);
      setPreviewUrls([]);
      
      // Redirect back to property page after a brief delay
      setTimeout(() => {
        router.push(`/property/${property._id}`);
      }, 2000);
      
    } catch (err) {
      console.error('Error updating property images:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while updating property images');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error && !property) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-md p-4 text-center">
          <p className="text-red-700">{error}</p>
          <Link href="/host-dashboard" className="mt-4 inline-block text-blue-600 hover:underline">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!property) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-md p-4 text-center">
          <p className="text-green-700">Images updated successfully! Redirecting...</p>
        </div>
      )}
      
      <div className="mb-6">
        <Link href={`/property/${property._id}`} className="text-blue-600 hover:underline">
          ← Back to {property.name}
        </Link>
      </div>
      
      <div className="bg-white shadow-md rounded-lg p-6">
        <h1 className="text-2xl font-semibold mb-2">Manage Property Images</h1>
        <p className="text-gray-600 mb-6">Property: {property.name} - {property.location}</p>
        
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-700">{error}</p>
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          {/* Existing Photos */}
          {existingImages.length > 0 && (
            <div className="mb-6">
              <label className="block text-gray-700 font-medium mb-2">Existing Photos</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {existingImages.map((url, index) => (
                  <div key={index} className="relative">
                    <Image 
                      src={url} 
                      alt={`Property photo ${index + 1}`} 
                      className="h-24 w-full object-cover rounded-md"
                      width={120}
                      height={96}
                    />
                    <button
                      type="button"
                      onClick={() => removeExistingImage(index)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 w-6 h-6 flex items-center justify-center"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Add New Photos */}
          <div className="mb-6">
            <label className="block text-gray-700 font-medium mb-2">Add New Photos</label>
            <div className="border-dashed border-2 border-gray-300 p-6 rounded-md">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileChange}
                className="hidden"
                id="photo-upload"
              />
              <label
                htmlFor="photo-upload"
                className="cursor-pointer flex flex-col items-center justify-center text-gray-500"
              >
                <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                </svg>
                <span>Click to upload photos</span>
                <span className="text-sm text-gray-400 mt-1">You can select multiple files</span>
              </label>
            </div>
            
            {/* New Photo Previews */}
            {previewUrls.length > 0 && (
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {previewUrls.map((url, index) => (
                  <div key={index} className="relative">
                    <Image 
                      src={url} 
                      alt={`Preview ${index + 1}`} 
                      className="h-24 w-full object-cover rounded-md"
                      width={120}
                      height={96}
                    />
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 w-6 h-6 flex items-center justify-center"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className={`px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                submitting ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {submitting ? 'Updating Images...' : 'Update Images'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
