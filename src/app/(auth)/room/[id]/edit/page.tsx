'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useState, useEffect, ChangeEvent, FormEvent, use } from 'react'; // Added 'use'
import Link from 'next/link';
import { Room, PricingType, RoomCapacity } from '@/types/room';
import { Property } from '@/models/Property'; // Ensure this type is correctly defined/imported
import { Category } from '@/models/RoomCategory'; // Ensure this type is correctly defined/imported

// Define an interface for the component props if not already defined elsewhere
interface EditRoomPageProps {
  params: Promise<{ id: string }>;

}

export default function EditRoomPage({ params: paramsPromise }: EditRoomPageProps) {
  const params = use(paramsPromise); // Resolve the params promise
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
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="bg-white p-6 rounded-lg shadow-md flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-t-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-700 font-medium">Loading room details...</p>
        </div>
      </div>
    );
  }
  if (error && !room) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center shadow-md">
          <svg className="h-10 w-10 text-red-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
          </svg>
          <p className="text-red-700 font-medium text-lg mb-3">{error}</p>
          <Link href="/host-dashboard" className="mt-4 inline-block text-indigo-600 hover:text-indigo-800 font-medium border border-indigo-200 bg-white rounded-md px-4 py-2 shadow-sm transition-colors duration-200">
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
    <div className="bg-gray-100 min-h-screen py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center shadow-sm">
            <svg className="w-5 h-5 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
            <p className="text-green-700 font-medium">Room updated successfully! Redirecting...</p>
          </div>
        )}
        
        <div className="mb-6">
          <Link href={`/property/${property._id}`} className="text-gray-600 hover:text-gray-900 flex items-center group transition duration-150">
            <svg className="w-4 h-4 mr-2 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
            </svg>
            <span className="font-medium">Back to {property.name}</span>
          </Link>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-semibold text-gray-800">Edit Room Details</h1>
                <p className="text-gray-500 text-sm mt-1">Update room information and photos</p>
              </div>
              <span className="px-3 py-1 bg-gray-200 text-gray-700 text-xs font-medium rounded-full">{property.name}</span>
            </div>
          </div>
            {error && (
            <div className="m-6 bg-red-50 border border-red-200 rounded-lg p-4 shadow-sm">
              <div className="flex">
                <svg className="h-5 w-5 text-red-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                </svg>
                <p className="text-red-800 text-sm font-medium">{error}</p>
              </div>
            </div>
          )}
            <form onSubmit={handleSubmit} className="p-6 space-y-8">
            <div className="space-y-8">
              {/* Basic Information Section */}
              <section className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
                  <h2 className="text-base font-semibold text-gray-800">Basic Information</h2>
                </div>
                <div className="p-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                    {/* Pricing Type */}
                    <div className="md:col-span-2">
                      <fieldset>
                        <legend className="block text-sm font-medium text-gray-700 mb-1">Pricing Type</legend>
                        <div className="flex gap-4">
                          <label className="inline-flex items-center">
                            <input
                              type="radio"
                              name="pricingType"
                              value={PricingType.ROOM}
                              checked={formData.pricingType === PricingType.ROOM}
                              onChange={handleChange}
                              className="form-radio h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                            />
                            <span className="ml-2 text-sm text-gray-700">Pricing per room</span>
                          </label>
                          <label className="inline-flex items-center">
                            <input
                              type="radio"
                              name="pricingType"
                              value={PricingType.PERSON}
                              checked={formData.pricingType === PricingType.PERSON}
                              onChange={handleChange}
                              className="form-radio h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                            />
                            <span className="ml-2 text-sm text-gray-700">Pricing per person</span>
                          </label>
                        </div>
                      </fieldset>
                    </div>
                    
                    {/* Room Category */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Room Category</label>
                      {categories.length > 0 && (
                        <div className="mb-2">                          <select
                            name="roomCategory"
                            value={formData.roomCategory}
                            onChange={handleChange}
                            className="block w-full rounded-md border border-gray-300 bg-white text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm h-10 px-3"
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
                            className="block w-full rounded-md border border-gray-300 bg-white text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3"
                          />
                          <button
                            type="button"
                            onClick={handleAddCategory}
                            className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                          >
                            Add
                          </button>
                        </div>
                      )}
                      
                      {!showNewCategoryInput && categories.length === 0 && (
                        <button
                          type="button"
                          onClick={() => setShowNewCategoryInput(true)}
                          className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
                          </svg>
                          Add new category
                        </button>
                      )}
                    </div>
                    
                    {/* Room Capacity */}
                    <div>
                      <label htmlFor="capacity" className="block text-sm font-medium text-gray-700 mb-1">
                        Room Capacity
                      </label>                      <select
                        id="capacity"
                        name="capacity"
                        value={formData.capacity}
                        onChange={handleChange}
                        className="block w-full rounded-md border border-gray-300 bg-white text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm h-10 px-3"
                      >
                        {Object.values(RoomCapacity).map((capacity) => (
                          <option key={capacity} value={capacity}>
                            {capacity}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </section>
              
              {/* Pricing Section */}
              <section className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
                  <h2 className="text-base font-semibold text-gray-800">Pricing Information</h2>
                </div>
                <div className="p-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                    {/* Rate per Room/Person */}
                    <div>
                      <label htmlFor="ratePerRoom" className="block text-sm font-medium text-gray-700 mb-1">
                        {formData.pricingType === PricingType.ROOM ? 'Rate per Room' : 'Rate per Person'}
                      </label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-gray-500 sm:text-sm">₹</span>
                        </div>                          <input
                            type="number"
                            id="ratePerRoom"
                            name="ratePerRoom"
                            value={formData.ratePerRoom}
                            onChange={handleChange}
                            placeholder="0.00"
                            className="block w-full pl-7 pr-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm shadow-sm"
                          />
                        </div>
                      </div>
                    
                    {/* Extra Person Charge */}
                    <div>
                      <label htmlFor="extraPersonCharge" className="block text-sm font-medium text-gray-700 mb-1">
                        Extra Person Charge <span className="text-gray-400 font-normal">(optional)</span>
                      </label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-gray-500 sm:text-sm">₹</span>
                        </div>
                        <input
                          type="number"
                          id="extraPersonCharge"
                          name="extraPersonCharge"
                          value={formData.extraPersonCharge}
                          onChange={handleChange}
                          placeholder="0.00"
                          className="block w-full pl-7 pr-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm shadow-sm"
                        />
                      </div>
                    </div>
                    
                    {/* Agent Commission */}
                    <div>
                      <label htmlFor="agentCommission" className="block text-sm font-medium text-gray-700 mb-1">
                        Agent Commission <span className="text-gray-400 font-normal">(optional)</span>
                      </label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-gray-500 sm:text-sm">₹</span>
                        </div>                        <input
                          type="number"
                          id="agentCommission"
                          name="agentCommission"
                          value={formData.agentCommission}
                          onChange={handleChange}
                          placeholder="0.00"
                          className="block w-full pl-7 pr-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm shadow-sm"
                        />
                      </div>
                    </div>
                    
                    {/* Advance Amount */}
                    <div>
                      <label htmlFor="advanceAmount" className="block text-sm font-medium text-gray-700 mb-1">
                        Advance Amount <span className="text-gray-400 font-normal">(optional)</span>
                      </label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-gray-500 sm:text-sm">₹</span>
                        </div>
                        <input
                          type="number"
                          id="advanceAmount"
                          name="advanceAmount"
                          value={formData.advanceAmount}
                          onChange={handleChange}
                          placeholder="0.00"
                          className="block w-full pl-7 pr-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm shadow-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </section>
                {/* Amenities Section */}
              <section className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
                  <h2 className="text-base font-semibold text-gray-800">Room Amenities</h2>
                </div>
                <div className="p-5">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-6">
                    <div className="relative flex items-start">
                      <div className="flex items-center h-5">
                        <input
                          type="checkbox"
                          name="amenities.wifi"
                          checked={formData.amenities.wifi}
                          onChange={handleChange}
                          className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label className="font-medium text-gray-700">WiFi</label>
                        <p className="text-gray-500 text-xs">Free wireless internet</p>
                      </div>
                    </div>
                    <div className="relative flex items-start">
                      <div className="flex items-center h-5">
                        <input
                          type="checkbox"
                          name="amenities.geyser"
                          checked={formData.amenities.geyser}
                          onChange={handleChange}
                          className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label className="font-medium text-gray-700">Geyser</label>
                        <p className="text-gray-500 text-xs">Hot water availability</p>
                      </div>
                    </div>
                    <div className="relative flex items-start">
                      <div className="flex items-center h-5">
                        <input
                          type="checkbox"
                          name="amenities.ac"
                          checked={formData.amenities.ac}
                          onChange={handleChange}
                          className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label className="font-medium text-gray-700">AC</label>
                        <p className="text-gray-500 text-xs">Air conditioning</p>
                      </div>
                    </div>
                    <div className="relative flex items-start">
                      <div className="flex items-center h-5">
                        <input
                          type="checkbox"
                          name="amenities.tv"
                          checked={formData.amenities.tv}
                          onChange={handleChange}
                          className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label className="font-medium text-gray-700">TV</label>
                        <p className="text-gray-500 text-xs">Television available</p>
                      </div>
                    </div>
                    <div className="relative flex items-start">
                      <div className="flex items-center h-5">
                        <input
                          type="checkbox"
                          name="amenities.breakfast"
                          checked={formData.amenities.breakfast}
                          onChange={handleChange}
                          className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label className="font-medium text-gray-700">Breakfast</label>
                        <p className="text-gray-500 text-xs">Complimentary breakfast</p>
                      </div>
                    </div>
                    <div className="relative flex items-start">
                      <div className="flex items-center h-5">
                        <input
                          type="checkbox"
                          name="amenities.parking"
                          checked={formData.amenities.parking}
                          onChange={handleChange}
                          className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label className="font-medium text-gray-700">Parking</label>
                        <p className="text-gray-500 text-xs">Free parking available</p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
              
              {/* Room Photos Section */}
              <section className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
                  <h2 className="text-base font-semibold text-gray-800">Room Photos</h2>
                </div>
                <div className="p-5 space-y-6">
                  {/* Existing Photos */}
                  {existingImages.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-3">Current Photos</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {existingImages.map((url, index) => (
                          <div key={index} className="group relative rounded-lg overflow-hidden bg-gray-100 border border-gray-200 shadow-sm">
                            <div className="aspect-w-4 aspect-h-3 relative">
                              <Image 
                                src={url} 
                                alt={`Room photo ${index + 1}`} 
                                className="object-cover"
                                layout="fill"
                              />
                              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-opacity duration-200"></div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeExistingImage(index)}
                              className="absolute top-2 right-2 rounded-full bg-white p-1.5 shadow-md text-gray-600 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
                            >
                              <span className="sr-only">Remove image</span>
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Add New Photos */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Add New Photos</h3>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 transition-colors duration-200 hover:border-gray-400">
                      <div className="text-center">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                        </svg>
                        <div className="mt-3 flex flex-col justify-center text-sm">
                          <label htmlFor="photo-upload" className="cursor-pointer rounded-md font-medium text-indigo-600 hover:text-indigo-700 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
                            <span>Upload photos</span>
                            <input
                              id="photo-upload"
                              name="photo-upload"
                              type="file"
                              accept="image/*"
                              multiple
                              onChange={handleFileChange}
                              className="sr-only"
                            />
                          </label>
                          <p className="text-gray-500 text-xs mt-1">PNG, JPG, GIF up to 10MB</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* New Photo Previews */}
                  {previewUrls.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-3">New Photos Preview</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {previewUrls.map((url, index) => (
                          <div key={index} className="group relative rounded-lg overflow-hidden bg-gray-100 border border-gray-200 shadow-sm">
                            <div className="aspect-w-4 aspect-h-3 relative">
                              <Image 
                                src={url} 
                                alt={`Preview ${index + 1}`}
                                className="object-cover"
                                layout="fill"
                              />
                              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-opacity duration-200"></div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeFile(index)}
                              className="absolute top-2 right-2 rounded-full bg-white p-1.5 shadow-md text-gray-600 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
                            >
                              <span className="sr-only">Remove image</span>
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </section>
                {/* Submit Button Section */}
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-5 py-6 bg-gray-50 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700">Ready to update this room?</h3>
                    <p className="text-gray-500 text-xs mt-1">Save your changes or cancel to return to property details</p>
                  </div>
                  <div className="flex space-x-3">
                    <Link
                      href={`/property/${property._id}`}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-sm transition-colors duration-200"
                    >
                      Cancel
                    </Link>
                    <button
                      type="submit"
                      disabled={submitting}
                      className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200 ${
                        submitting ? 'opacity-70 cursor-not-allowed' : ''
                      }`}
                    >
                      {submitting ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Saving Changes...
                        </>
                      ) : 'Save Changes'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
