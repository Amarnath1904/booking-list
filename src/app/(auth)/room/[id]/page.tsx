'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import Image from 'next/image';

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
  createdAt: string;
  updatedAt: string;
}

interface Property {
  _id: string;
  name: string;
  location: string;
}

export default function RoomDetailsPage({ params }: { params: { id: string } }) {
  const { user } = useAuth();
  const router = useRouter();
  const [room, setRoom] = useState<Room | null>(null);
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

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
      } catch (err) {
        setError('An error occurred while fetching room details');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchRoomDetails();
  }, [params.id, user]);

  const handleDelete = async () => {
    if (!room || !property || !confirm('Are you sure you want to delete this room?')) {
      return;
    }
    
    try {
      setDeleting(true);
      const token = await user!.getIdToken();
      
      const response = await fetch(`/api/rooms/${room._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete room');
      }
      
      // Redirect back to property page
      router.push(`/property/${property._id}`);
    } catch (err) {
      console.error('Error deleting room:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while deleting the room');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
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

  const handleThumbnailClick = (index: number) => {
    setCurrentImageIndex(index);
  };

  return (
    <div className="bg-white min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6 border-b pb-4">
          <Link href={`/property/${property._id}`} className="text-gray-700 hover:text-gray-900 font-medium flex items-center">
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd"></path>
            </svg>
            Back to {property.name}
          </Link>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Column - Images */}
          <div className="lg:w-2/3">
            <div className="bg-gray-50 border rounded-lg overflow-hidden shadow-sm">
              {room.images && room.images.length > 0 ? (
                <div>
                  <div className="relative h-96 lg:h-[450px]">
                    <Image 
                      src={room.images[currentImageIndex]} 
                      alt={`${room.roomCategory || room.capacity} in ${property.name}`} 
                      fill
                      className="object-cover"
                      priority={currentImageIndex === 0}
                    />
                  </div>
                  
                  {room.images.length > 1 && (
                    <div className="p-4 border-t">
                      <div className="flex overflow-x-auto pb-2 space-x-2">
                        {room.images.map((imgUrl, index) => (
                          <button
                            key={index}
                            onClick={() => handleThumbnailClick(index)}
                            className={`relative h-16 w-20 flex-shrink-0 rounded overflow-hidden border-2 ${
                              currentImageIndex === index ? 'border-gray-700' : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <Image
                              src={imgUrl}
                              alt={`Room thumbnail ${index + 1}`}
                              fill
                              className="object-cover"
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-80 flex items-center justify-center bg-gray-100">
                  <div className="text-center">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="mt-2 text-sm text-gray-500">No images available</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Details */}
          <div className="lg:w-1/3">
            <div className="bg-white border rounded-lg shadow-sm p-6">
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-1">
                  {room.roomCategory || `Room for ${room.capacity}`}
                </h1>
                <p className="text-gray-600">
                  {property.name} • {property.location}
                </p>
              </div>

              {room.ratePerRoom && (
                <div className="mb-6 bg-gray-50 p-4 rounded-md border">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Rate</span>
                    <div className="text-right">
                      <span className="text-2xl font-bold text-gray-900">₹{room.ratePerRoom}</span>
                      <span className="text-sm text-gray-500 block">
                        {room.pricingType === 'room' ? 'per night' : 'per person'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Room Details</h2>
                <div className="divide-y">
                  <div className="py-3 flex justify-between">
                    <span className="text-gray-500">Type</span>
                    <span className="font-medium text-gray-900">{room.pricingType === 'room' ? 'Per Room' : 'Per Person'}</span>
                  </div>
                  
                  {room.roomCategory && (
                    <div className="py-3 flex justify-between">
                      <span className="text-gray-500">Category</span>
                      <span className="font-medium text-gray-900">{room.roomCategory}</span>
                    </div>
                  )}
                  
                  <div className="py-3 flex justify-between">
                    <span className="text-gray-500">Capacity</span>
                    <span className="font-medium text-gray-900">{room.capacity}</span>
                  </div>
                  
                  {room.extraPersonCharge !== undefined && (
                    <div className="py-3 flex justify-between">
                      <span className="text-gray-500">Extra Person Charge</span>
                      <span className="font-medium text-gray-900">₹{room.extraPersonCharge}</span>
                    </div>
                  )}
                  
                  {room.agentCommission !== undefined && (
                    <div className="py-3 flex justify-between">
                      <span className="text-gray-500">Agent Commission</span>
                      <span className="font-medium text-gray-900">₹{room.agentCommission}</span>
                    </div>
                  )}
                  
                  {room.advanceAmount !== undefined && (
                    <div className="py-3 flex justify-between">
                      <span className="text-gray-500">Advance Amount</span>
                      <span className="font-medium text-gray-900">₹{room.advanceAmount}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mb-8">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Amenities</h2>
                {room.amenities && room.amenities.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {room.amenities.map((amenity, index) => (
                      <div 
                        key={index}
                        className="flex items-center text-sm text-gray-700 py-1"
                      >
                        <svg className="w-4 h-4 mr-2 text-gray-700" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                        </svg>
                        {amenity}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No amenities listed</p>
                )}
              </div>

              <div className="flex flex-col space-y-3">
                <Link
                  href={`/room/${room._id}/edit`}
                  className="w-full flex justify-center items-center px-5 py-2.5 border border-gray-800 bg-gray-800 text-white text-sm font-medium rounded hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-700 transition-colors"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                  </svg>
                  Edit Room
                </Link>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className={`w-full flex justify-center items-center px-5 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors ${
                    deleting ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {deleting ? (
                    <>
                      <svg className="animate-spin h-4 w-4 mr-2 text-gray-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Deleting...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                      </svg>
                      Delete Room
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
