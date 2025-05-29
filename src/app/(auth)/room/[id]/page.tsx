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

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href={`/property/${property._id}`} className="text-blue-600 hover:underline">
          ← Back to {property.name}
        </Link>
      </div>
      
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        {/* Room Images */}
        {room.images && room.images.length > 0 ? (          <div className="relative h-80">
            <Image
              src={room.images[0]}
              alt={`${room.roomCategory || room.capacity} in ${property.name}`}
              className="w-full h-full object-cover"
              width={800}
              height={400}
            />
            {room.images.length > 1 && (
              <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-2">
                {room.images.map((_, index) => (
                  <span
                    key={index}
                    className={`h-2 w-2 rounded-full ${index === 0 ? 'bg-white' : 'bg-white/50'}`}
                  ></span>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="h-80 bg-gray-200 flex items-center justify-center">
            <span className="text-gray-400">No images available</span>
          </div>
        )}
        
        <div className="p-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {room.roomCategory || room.capacity}
              </h1>
              <p className="text-gray-600">
                {property.name} - {property.location}
              </p>
            </div>            {room.ratePerRoom && (
              <div className="text-xl font-bold text-blue-600">
                ₹{room.ratePerRoom} {room.pricingType === 'room' ? 'per night' : 'per person'}
              </div>
            )}
          </div>
          
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Room Details</h2>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <span className="font-medium w-40 text-gray-500">Pricing Type:</span>
                  <span>{room.pricingType === 'room' ? 'Per Room' : 'Per Person'}</span>
                </li>
                {room.roomCategory && (
                  <li className="flex items-start">
                    <span className="font-medium w-40 text-gray-500">Room Category:</span>
                    <span>{room.roomCategory}</span>
                  </li>
                )}
                <li className="flex items-start">
                  <span className="font-medium w-40 text-gray-500">Capacity:</span>
                  <span>{room.capacity}</span>
                </li>
                {room.extraPersonCharge && (
                  <li className="flex items-start">
                    <span className="font-medium w-40 text-gray-500">Extra Person Charge:</span>
                    <span>₹{room.extraPersonCharge}</span>
                  </li>
                )}
                {room.agentCommission && (
                  <li className="flex items-start">
                    <span className="font-medium w-40 text-gray-500">Agent Commission:</span>
                    <span>₹{room.agentCommission}</span>
                  </li>
                )}
                {room.advanceAmount && (
                  <li className="flex items-start">
                    <span className="font-medium w-40 text-gray-500">Advance Amount:</span>
                    <span>₹{room.advanceAmount}</span>
                  </li>
                )}
              </ul>
            </div>
            
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Amenities</h2>
              {room.amenities && room.amenities.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {room.amenities.map((amenity, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                    >
                      {amenity}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No amenities listed</p>
              )}
            </div>
          </div>
          
          {/* Additional Images */}
          {room.images && room.images.length > 1 && (
            <div className="mt-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Photos</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {room.images.slice(1).map((url, index) => (                  <div key={index} className="aspect-square">
                    <Image
                      src={url}
                      alt={`Room photo ${index + 2}`}
                      className="h-full w-full object-cover rounded-md"
                      width={200}
                      height={200}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="mt-8 flex justify-end space-x-4">
            <Link
              href={`/room/${room._id}/edit`}
              className="px-4 py-2 border border-blue-600 text-blue-600 rounded-md hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Edit Room
            </Link>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className={`px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 ${
                deleting ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {deleting ? 'Deleting...' : 'Delete Room'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
