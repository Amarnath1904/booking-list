'use client';

import { useState, useEffect, FormEvent, ChangeEvent, use } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import Image from 'next/image';
import { PricingType, RoomCapacity } from '@/types/room';

interface Property {
  _id: string;
  name: string;
  location: string;
}

interface Category {
  _id: string;
  name: string;
}

interface AddRoomPageProps {
  params: Promise<{ id: string }>;
}

export default function AddRoomPage({ params: paramsPromise }: AddRoomPageProps) {
  const params = use(paramsPromise); // Resolve the params promise
  const { user } = useAuth();
  const router = useRouter();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    pricingType: PricingType.ROOM,
    roomCategory: '',
    ratePerRoom: '',
    capacity: RoomCapacity.SINGLE,
    extraPersonCharge: '',
    agentCommission: '',
    advanceAmount: '',
    amenities: {
      wifi: false,
      geyser: false,
      ac: false,
      tv: false,
      breakfast: false,
      parking: false
    }
  });

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
        
        // Fetch existing room categories for this property
        const categoriesResponse = await fetch(`/api/room-categories?propertyId=${params.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (categoriesResponse.ok) {
          const categoriesData = await categoriesResponse.json();
          setCategories(categoriesData);
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

  // Handle form input change
  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checkbox = e.target as HTMLInputElement;
      setFormData({
        ...formData,
        amenities: {
          ...formData.amenities,
          [name.replace('amenities.', '')]: checkbox.checked
        }
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  // Add a new category
  const handleAddCategory = async () => {
    if (newCategory.trim() && property) {
      try {
        const token = await user!.getIdToken();
        
        const response = await fetch('/api/room-categories', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            propertyId: property._id,
            name: newCategory
          })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create category');
        }
        
        const newCategoryData = await response.json();
        setCategories([...categories, newCategoryData]);
        setFormData({
          ...formData,
          roomCategory: newCategoryData.name
        });
        setNewCategory('');
        setShowNewCategoryInput(false);
      } catch (err) {
        console.error('Error creating category:', err);
        // Still add it to the local state even if the API call fails
        const tempCategory = { _id: newCategory, name: newCategory };
        setCategories([...categories, tempCategory]);
        setFormData({
          ...formData,
          roomCategory: newCategory
        });
        setNewCategory('');
        setShowNewCategoryInput(false);
      }
    }
  };

  // Handle form submission
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!property) return;
    
    try {
      setSubmitting(true);
      setError(null);
      
      const token = await user!.getIdToken();
      
      // First, upload images if any
      let imageUrls: string[] = [];
      
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
        imageUrls = uploadResult.imageUrls;
      }
      
      // Convert amenities object to array
      const amenitiesArray = Object.entries(formData.amenities)
        .filter(([, enabled]) => enabled)
        .map(([name]) => name);
      
      // Create room data
      const roomData = {
        propertyId: property._id,
        pricingType: formData.pricingType,
        roomCategory: formData.roomCategory, // Always include room category regardless of pricing type
        ratePerRoom: formData.ratePerRoom ? parseFloat(formData.ratePerRoom) : undefined,
        capacity: formData.capacity,
        amenities: amenitiesArray,
        images: imageUrls,
        extraPersonCharge: formData.extraPersonCharge ? parseFloat(formData.extraPersonCharge) : undefined,
        agentCommission: formData.agentCommission ? parseFloat(formData.agentCommission) : undefined,
        advanceAmount: formData.advanceAmount ? parseFloat(formData.advanceAmount) : undefined
      };
      
      // Create the room
      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(roomData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create room');
      }
      
      setSuccess(true);
      
      // Reset form
      setFormData({
        pricingType: PricingType.ROOM,
        roomCategory: '',
        ratePerRoom: '',
        capacity: RoomCapacity.SINGLE,
        extraPersonCharge: '',
        agentCommission: '',
        advanceAmount: '',
        amenities: {
          wifi: false,
          geyser: false,
          ac: false,
          tv: false,
          breakfast: false,
          parking: false
        }
      });
      setSelectedFiles([]);
      setPreviewUrls([]);
      
      // Redirect back to property page after a brief delay
      setTimeout(() => {
        router.push(`/property/${property._id}`);
      }, 2000);
      
    } catch (err) {
      console.error('Error creating room:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while creating the room');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error && !property) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="bg-red-100 border border-red-200 rounded p-4 text-center">
          <p className="text-red-700">{error}</p>
          <Link href="/host-dashboard" className="mt-3 inline-block text-blue-600 hover:underline">
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
    <div className="max-w-3xl mx-auto px-4 py-6">
      {success && (
        <div className="mb-4 bg-green-100 border border-green-200 rounded p-4 text-center">
          <p className="text-green-700 font-medium">Room added successfully! Redirecting...</p>
        </div>
      )}
      
      <div className="mb-4">
        <Link href={`/property/${property._id}`} className="text-blue-700 hover:underline font-medium">
          ← Back to {property.name}
        </Link>
      </div>
      
      <div className="bg-white border border-gray-200 rounded p-6 mb-4">
        <h1 className="text-xl font-bold mb-1 text-black">Add New Room</h1>
        <p className="text-gray-700 mb-4">Property: {property.name} - {property.location}</p>
        
        {error && (
          <div className="mb-4 bg-red-100 border border-red-200 rounded p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          {/* Pricing Type */}
          <div className="mb-4">
            <label className="block text-black font-medium mb-2">Pricing Type</label>
            <div className="flex gap-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="pricingType"
                  value={PricingType.ROOM}
                  checked={formData.pricingType === PricingType.ROOM}
                  onChange={handleChange}
                  className="mr-2"
                />
                <span className="text-gray-800">Pricing per room</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="pricingType"
                  value={PricingType.PERSON}
                  checked={formData.pricingType === PricingType.PERSON}
                  onChange={handleChange}
                  className="mr-2"
                />
                <span className="text-gray-800">Pricing per person</span>
              </label>
            </div>
          </div>
          
          {/* Room Category */}
          <div className="mb-4">
            <label className="block text-black font-medium mb-2">Room Category</label>
            {categories.length > 0 && (
              <div className="mb-2">
                <select
                  name="roomCategory"
                  value={formData.roomCategory}
                  onChange={handleChange}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-gray-800"
                >
                  <option value="" className="text-gray-800">Select a category</option>
                  {categories.map((category) => (
                    <option key={category._id} value={category.name} className="text-gray-800">
                      {category.name}
                    </option>
                  ))}
                  <option value="new" className="text-gray-800">+ Add new category</option>
                </select>
              </div>
            )}
            
            {(formData.roomCategory === 'new' || categories.length === 0 || showNewCategoryInput) && (
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="Enter new category name"
                  className="flex-grow px-2 py-1 border border-gray-300 rounded text-gray-800 placeholder-gray-500"
                />
                <button
                  type="button"
                  onClick={handleAddCategory}
                  className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Add
                </button>
              </div>
            )}
            
            {!showNewCategoryInput && categories.length === 0 && (
              <button
                type="button"
                onClick={() => setShowNewCategoryInput(true)}
                className="text-blue-700 hover:underline font-medium"
              >
                + Add new category
              </button>
            )}
          </div>
          
          {/* Rate per Room/Person */}
          <div className="mb-4">
            <label htmlFor="ratePerRoom" className="block text-black font-medium mb-2">
              {formData.pricingType === PricingType.ROOM ? 'Rate per Room' : 'Rate per Person'}
            </label>
            <input
              type="number"
              id="ratePerRoom"
              name="ratePerRoom"
              value={formData.ratePerRoom}
              onChange={handleChange}
              placeholder={formData.pricingType === PricingType.ROOM ? "Enter rate per room" : "Enter rate per person"}
              className="w-full px-2 py-1 border border-gray-300 rounded text-gray-800 placeholder-gray-500"
            />
          </div>
          
          {/* Room Capacity */}
          <div className="mb-4">
            <label htmlFor="capacity" className="block text-black font-medium mb-2">
              Room Capacity
            </label>
            <select
              id="capacity"
              name="capacity"
              value={formData.capacity}
              onChange={handleChange}
              className="w-full px-2 py-1 border border-gray-300 rounded text-gray-800"
            >
              {Object.values(RoomCapacity).map((capacity) => (
                <option key={capacity} value={capacity} className="text-gray-800">
                  {capacity}
                </option>
              ))}
            </select>
          </div>
          
          {/* Amenities */}
          <div className="mb-4">
            <label className="block text-black font-medium mb-2">Amenities</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              <label className="inline-flex items-center">
                <input
                  type="checkbox"
                  name="amenities.wifi"
                  checked={formData.amenities.wifi}
                  onChange={handleChange}
                  className="mr-2"
                />
                <span className="text-gray-800">WiFi</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="checkbox"
                  name="amenities.geyser"
                  checked={formData.amenities.geyser}
                  onChange={handleChange}
                  className="mr-2"
                />
                <span className="text-gray-800">Geyser</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="checkbox"
                  name="amenities.ac"
                  checked={formData.amenities.ac}
                  onChange={handleChange}
                  className="mr-2"
                />
                <span className="text-gray-800">AC</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="checkbox"
                  name="amenities.tv"
                  checked={formData.amenities.tv}
                  onChange={handleChange}
                  className="mr-2"
                />
                <span className="text-gray-800">TV</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="checkbox"
                  name="amenities.breakfast"
                  checked={formData.amenities.breakfast}
                  onChange={handleChange}
                  className="mr-2"
                />
                <span className="text-gray-800">Breakfast</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="checkbox"
                  name="amenities.parking"
                  checked={formData.amenities.parking}
                  onChange={handleChange}
                  className="mr-2"
                />
                <span className="text-gray-800">Parking</span>
              </label>
            </div>
          </div>
          
          {/* Extra Person Charge */}
          <div className="mb-4">
            <label htmlFor="extraPersonCharge" className="block text-black font-medium mb-2">
              Extra Person Charge <span className="text-gray-800 font-normal">(optional)</span>
            </label>
            <input
              type="number"
              id="extraPersonCharge"
              name="extraPersonCharge"
              value={formData.extraPersonCharge}
              onChange={handleChange}
              placeholder="Enter extra person charge"
              className="w-full px-2 py-1 border border-gray-300 rounded text-gray-800 placeholder-gray-500"
            />
          </div>
          
          {/* Agent Commission */}
          <div className="mb-4">
            <label htmlFor="agentCommission" className="block text-black font-medium mb-2">
              Agent Commission <span className="text-gray-800 font-normal">(optional)</span>
            </label>
            <input
              type="number"
              id="agentCommission"
              name="agentCommission"
              value={formData.agentCommission}
              onChange={handleChange}
              placeholder="Enter agent commission"
              className="w-full px-2 py-1 border border-gray-300 rounded text-gray-800 placeholder-gray-500"
            />
          </div>
          
          {/* Advance Amount */}
          <div className="mb-4">
            <label htmlFor="advanceAmount" className="block text-black font-medium mb-2">
              Advance Amount <span className="text-gray-800 font-normal">(optional)</span>
            </label>
            <input
              type="number"
              id="advanceAmount"
              name="advanceAmount"
              value={formData.advanceAmount}
              onChange={handleChange}
              placeholder="Enter advance amount"
              className="w-full px-2 py-1 border border-gray-300 rounded text-gray-800 placeholder-gray-500"
            />
          </div>
          
          {/* Photo Upload */}
          <div className="mb-4">
            <label className="block text-black font-medium mb-2">Room Photos</label>
            <div className="border-2 border-dashed border-gray-300 p-6 rounded text-center bg-gray-50">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileChange}
                className="hidden"
                id="room-photos"
              />
              <label htmlFor="room-photos" className="cursor-pointer">
                <div className="flex flex-col items-center">
                  <svg className="w-12 h-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                  </svg>
                  <p className="text-gray-800 font-medium mb-1">Click to upload room photos</p>
                  <p className="text-gray-600 text-sm">or drag and drop files here</p>
                  <p className="text-gray-500 text-xs mt-2">Supported formats: JPG, PNG</p>
                </div>
              </label>
            </div>
            
            {/* Photo Previews */}
            {previewUrls.length > 0 && (
              <div className="mt-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-black font-medium">Uploaded Photos ({previewUrls.length})</h3>
                  {previewUrls.length > 1 && (
                    <button 
                      type="button" 
                      onClick={() => {
                        previewUrls.forEach(url => URL.revokeObjectURL(url));
                        setPreviewUrls([]);
                        setSelectedFiles([]);
                      }}
                      className="text-red-600 text-sm hover:underline font-medium"
                    >
                      Remove All
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {previewUrls.map((url, index) => (
                    <div key={index} className="relative group">
                      <div className="border border-gray-200 rounded overflow-hidden bg-white shadow-sm">
                        <div className="aspect-square relative">
                          <Image
                            src={url} 
                            alt={`Room preview ${index + 1}`} 
                            fill
                            className="object-cover"
                            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                          />
                        </div>
                        <div className="p-1 text-xs text-gray-500 truncate border-t border-gray-100 bg-gray-50">
                          Photo {index + 1}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="absolute top-1 right-1 bg-black bg-opacity-50 text-white rounded-full p-1 w-6 h-6 flex items-center justify-center text-xs hover:bg-opacity-70 transition-opacity"
                        aria-label="Remove photo"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className={`px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 ${
                submitting ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {submitting ? 'Adding Room...' : 'Add Room'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
