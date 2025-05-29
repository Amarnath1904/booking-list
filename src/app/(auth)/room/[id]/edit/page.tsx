'use client';

import { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import Image from 'next/image';
import { PricingType, RoomCapacity } from '@/types/room';

interface Room {
  _id: string;
  propertyId: string;
  pricingType: string;
  roomCategory?: string;
  ratePerRoom?: number;
  capacity: string;
  amenities: string[];
  images: string[];
  extraPersonCharge?: number;
  agentCommission?: number;
  advanceAmount?: number;
}

interface Property {
  _id: string;
  name: string;
  location: string;
}

interface Category {
  _id: string;
  name: string;
}

export default function EditRoomPage({ params }: { params: { id: string } }) {
  const { user } = useAuth();
  const router = useRouter();
  const [room, setRoom] = useState<Room | null>(null);
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
  const [existingImages, setExistingImages] = useState<string[]>([]);

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

  // Load room data
  useEffect(() => {
    async function fetchRoomDetails() {
      if (!user) return;

      try {
        setLoading(true);
        const token = await user.getIdToken();
        
        // Fetch room details
        const response = await fetch(`/api/rooms/${params.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to load room details');
        }

        const roomData = await response.json();
        setRoom(roomData);
        
        // Fetch property details
        const propertyResponse = await fetch(`/api/properties/${roomData.propertyId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (propertyResponse.ok) {
          const propertyData = await propertyResponse.json();
          setProperty(propertyData);
        }
          // Fetch room categories for this property
        const categoriesResponse = await fetch(`/api/room-categories?propertyId=${roomData.propertyId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (categoriesResponse.ok) {
          const categoriesData = await categoriesResponse.json();
          setCategories(categoriesData);
        }
        
        // Initialize form with room data
        setFormData({
          pricingType: roomData.pricingType || PricingType.ROOM,
          roomCategory: roomData.roomCategory || '',
          ratePerRoom: roomData.ratePerRoom?.toString() || '',
          capacity: roomData.capacity || RoomCapacity.SINGLE,
          extraPersonCharge: roomData.extraPersonCharge?.toString() || '',
          agentCommission: roomData.agentCommission?.toString() || '',
          advanceAmount: roomData.advanceAmount?.toString() || '',
          amenities: {
            wifi: roomData.amenities?.includes('wifi') || false,
            geyser: roomData.amenities?.includes('geyser') || false,
            ac: roomData.amenities?.includes('ac') || false,
            tv: roomData.amenities?.includes('tv') || false,
            breakfast: roomData.amenities?.includes('breakfast') || false,
            parking: roomData.amenities?.includes('parking') || false
          }
        });
        
        // Set existing images
        if (roomData.images && roomData.images.length > 0) {
          setExistingImages(roomData.images);
        }
      } catch (err) {
        setError('An error occurred while fetching room details');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchRoomDetails();
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
    
    if (!room || !property) return;
    
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
        // Convert amenities object to array
      const amenitiesArray = Object.entries(formData.amenities)
        .filter(([, enabled]) => enabled)
        .map(([name]) => name);
      
      // Create room data
      const roomData = {
        pricingType: formData.pricingType,
        roomCategory: formData.pricingType === PricingType.ROOM ? formData.roomCategory : undefined,
        ratePerRoom: formData.ratePerRoom ? parseFloat(formData.ratePerRoom) : undefined,
        capacity: formData.capacity,
        amenities: amenitiesArray,
        images: [...existingImages, ...newImageUrls],
        extraPersonCharge: formData.extraPersonCharge ? parseFloat(formData.extraPersonCharge) : undefined,
        agentCommission: formData.agentCommission ? parseFloat(formData.agentCommission) : undefined,
        advanceAmount: formData.advanceAmount ? parseFloat(formData.advanceAmount) : undefined
      };
      
      // Update the room
      const response = await fetch(`/api/rooms/${room._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(roomData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update room');
      }
      
      setSuccess(true);
      
      // Redirect back to property page after a brief delay
      setTimeout(() => {
        router.push(`/property/${property._id}`);
      }, 2000);
      
    } catch (err) {
      console.error('Error updating room:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while updating the room');
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

  if (error && !room) {
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

  if (!room || !property) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-md p-4 text-center">
          <p className="text-green-700">Room updated successfully! Redirecting...</p>
        </div>
      )}
      
      <div className="mb-6">
        <Link href={`/property/${property._id}`} className="text-blue-600 hover:underline">
          ← Back to {property.name}
        </Link>
      </div>
      
      <div className="bg-white shadow-md rounded-lg p-6">
        <h1 className="text-2xl font-semibold mb-2">Edit Room</h1>
        <p className="text-gray-600 mb-6">Property: {property.name} - {property.location}</p>
        
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-700">{error}</p>
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          {/* Pricing Type */}
          <div className="mb-6">
            <label className="block text-black font-medium mb-2">Pricing Type</label>
            <div className="flex gap-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="pricingType"
                  value={PricingType.ROOM}
                  checked={formData.pricingType === PricingType.ROOM}
                  onChange={handleChange}
                  className="form-radio h-5 w-5 text-blue-600"
                />
                <span className="ml-2">Pricing per room</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="pricingType"
                  value={PricingType.PERSON}
                  checked={formData.pricingType === PricingType.PERSON}
                  onChange={handleChange}
                  className="form-radio h-5 w-5 text-blue-600"
                />
                <span className="ml-2">Pricing per person</span>
              </label>
            </div>
          </div>
          
          {/* Room Category - Show for all pricing types */}
          <div className="mb-6">
            <label className="block text-black font-medium mb-2">Room Category</label>
            {categories.length > 0 && (
              <div className="mb-2">
                <select
                  name="roomCategory"
                  value={formData.roomCategory}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a category</option>
                  {categories.map((category) => (
                    <option key={category._id} value={category.name}>
                      {category.name}
                    </option>
                  ))}
                  <option value="new">+ Add new category</option>
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
                  className="flex-grow px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={handleAddCategory}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Add
                </button>
              </div>
            )}
            
            {!showNewCategoryInput && categories.length === 0 && (
              <button
                type="button"
                onClick={() => setShowNewCategoryInput(true)}
                className="text-blue-600 hover:underline"
              >
                + Add new category
              </button>
            )}
          </div>
          
          {/* Rate per Room/Person - Show for all pricing types */}
          <div className="mb-6">
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          {/* Room Capacity */}
          <div className="mb-6">
            <label htmlFor="capacity" className="block text-black font-medium mb-2">
              Room Capacity
            </label>
            <select
              id="capacity"
              name="capacity"
              value={formData.capacity}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Object.values(RoomCapacity).map((capacity) => (
                <option key={capacity} value={capacity}>
                  {capacity}
                </option>
              ))}
            </select>
          </div>
          
          {/* Amenities */}
          <div className="mb-6">
            <label className="block text-black font-medium mb-2">Amenities</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <label className="inline-flex items-center">
                <input
                  type="checkbox"
                  name="amenities.wifi"
                  checked={formData.amenities.wifi}
                  onChange={handleChange}
                  className="form-checkbox h-5 w-5 text-blue-600"
                />
                <span className="ml-2">WiFi</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="checkbox"
                  name="amenities.geyser"
                  checked={formData.amenities.geyser}
                  onChange={handleChange}
                  className="form-checkbox h-5 w-5 text-blue-600"
                />
                <span className="ml-2">Geyser</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="checkbox"
                  name="amenities.ac"
                  checked={formData.amenities.ac}
                  onChange={handleChange}
                  className="form-checkbox h-5 w-5 text-blue-600"
                />
                <span className="ml-2">AC</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="checkbox"
                  name="amenities.tv"
                  checked={formData.amenities.tv}
                  onChange={handleChange}
                  className="form-checkbox h-5 w-5 text-blue-600"
                />
                <span className="ml-2">TV</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="checkbox"
                  name="amenities.breakfast"
                  checked={formData.amenities.breakfast}
                  onChange={handleChange}
                  className="form-checkbox h-5 w-5 text-blue-600"
                />
                <span className="ml-2">Breakfast</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="checkbox"
                  name="amenities.parking"
                  checked={formData.amenities.parking}
                  onChange={handleChange}
                  className="form-checkbox h-5 w-5 text-blue-600"
                />
                <span className="ml-2">Parking</span>
              </label>
            </div>
          </div>
          
          {/* Extra Person Charge */}
          <div className="mb-6">
            <label htmlFor="extraPersonCharge" className="block text-black font-medium mb-2">
              Extra Person Charge (optional)
            </label>
            <input
              type="number"
              id="extraPersonCharge"
              name="extraPersonCharge"
              value={formData.extraPersonCharge}
              onChange={handleChange}
              placeholder="Enter extra person charge"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          {/* Agent Commission */}
          <div className="mb-6">
            <label htmlFor="agentCommission" className="block text-black font-medium mb-2">
              Agent Commission (optional)
            </label>
            <input
              type="number"
              id="agentCommission"
              name="agentCommission"
              value={formData.agentCommission}
              onChange={handleChange}
              placeholder="Enter agent commission"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          {/* Advance Amount */}
          <div className="mb-6">
            <label htmlFor="advanceAmount" className="block text-black font-medium mb-2">
              Advance Amount (optional)
            </label>
            <input
              type="number"
              id="advanceAmount"
              name="advanceAmount"
              value={formData.advanceAmount}
              onChange={handleChange}
              placeholder="Enter advance amount"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          {/* Existing Photos */}
          {existingImages.length > 0 && (
            <div className="mb-6">
              <label className="block text-gray-700 font-medium mb-2">Existing Photos</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">                {existingImages.map((url, index) => (
                  <div key={index} className="relative">
                    <Image 
                      src={url} 
                      alt={`Room photo ${index + 1}`} 
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
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">                {previewUrls.map((url, index) => (
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
              {submitting ? 'Updating Room...' : 'Update Room'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
