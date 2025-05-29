'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import { UserRole } from '@/constants/userRoles'; // Import UserRole enum

// Define the Property interface based on MongoDB model
interface Property {
  _id: string;
  hostId: string;
  name: string;
  location: string;
  images: string[];
  phoneNumber: string;
  alternateNumber?: string;
  upiId: string;
  bankAccountName: string;
  createdAt: string;
  updatedAt: string;
}

// Define the Room interface based on MongoDB model
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

export default function PropertyDetails() {
  const { user, loading: authLoading, userRole } = useAuth();
  const router = useRouter();
  const params = useParams();
  const propertyId = params.id as string;

  // console.log(`PropertyDetails render: authLoading=${authLoading}, user=${user ? user.uid : 'null'}, userRole=${userRole}, propertyId=${propertyId}`);
  
  const [property, setProperty] = useState<Property | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [pageLoading, setPageLoading] = useState(true); 
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const bookingUrl = typeof window !== 'undefined' ? `${window.location.origin}/property/${propertyId}/book` : '';

  const copyToClipboard = () => {
    navigator.clipboard.writeText(bookingUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  useEffect(() => {
    const currentRole = userRole;
    console.log(`MainEffect triggered. Dependencies: authLoading=${authLoading}, user=${user ? 'exists' : 'null'}, propertyId=${propertyId}, currentRole=${currentRole}, currentPropertyId=${property?._id}`);

    const fetchPropertyAndRoomData = async (currentFirebaseUser: NonNullable<typeof user>) => {
      console.log("MainEffect: Starting fetchPropertyAndRoomData for ID:", propertyId);
      setPageLoading(true); 
      setError(null);     
      
      // Clear old data only if fetching for a new propertyId or if property is not yet loaded for current ID
      // This check is important to ensure we don't clear data if the effect re-runs for other reasons
      // while data for the current propertyId is already being fetched or is present.
      if (!property || property._id !== propertyId) {
        setProperty(null);  
        setRooms([]);       
      }

      try {
        const token = await currentFirebaseUser.getIdToken(true);
        console.log("MainEffect: Token obtained for API request.");

        // Fetch Property Data
        const propertyResponse = await fetch(`/api/properties/${propertyId}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (!propertyResponse.ok) {
          const errorText = await propertyResponse.text();
          console.error(`MainEffect: API error fetching property: ${propertyResponse.status}`, errorText);
          if (propertyResponse.status === 404) setError('Property not found.');
          else if (propertyResponse.status === 401 || propertyResponse.status === 403) setError('Authentication error or forbidden. Please log in again.');
          else setError(`Failed to load property details: ${propertyResponse.status}.`);
          setProperty(null); 
          setRooms([]);
          setPageLoading(false);
          return;
        }
        
        const propertyData = await propertyResponse.json();
        console.log("MainEffect: Property data received:", propertyData);
        setProperty(propertyData);

        // Fetch Rooms Data
        const roomsResponse = await fetch(`/api/rooms?propertyId=${propertyId}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        
        if (roomsResponse.ok) {
          const roomsData = await roomsResponse.json();
          console.log("MainEffect: Rooms data received:", roomsData.length);
          setRooms(roomsData);
        } else {
          console.warn("MainEffect: Failed to fetch rooms:", roomsResponse.status);
          setRooms([]); 
        }
        
        console.log("MainEffect: Data fetching successful.");

      } catch (err) {
        console.error('MainEffect: Exception during fetchPropertyAndRoomData:', err);
        setError('An unexpected error occurred while fetching property details.');
        setProperty(null); 
        setRooms([]);
      } finally {
        setPageLoading(false);
        console.log("MainEffect: fetchPropertyAndRoomData finished.");
      }
    };

    if (authLoading) {
      console.log("MainEffect: Auth context is still loading. Page will show 'Verifying authentication...' if pageLoading is also true.");
      // No need to explicitly setPageLoading(true) here if its initial state is true,
      // and the render logic correctly shows "Verifying authentication..."
      return; 
    }

    if (!user) {
      console.log("MainEffect: No user found after auth loading. Setting authentication error.");
      setError('Authentication required. Please log in to view this page.');
      setPageLoading(false);
      return;
    }

    if (!propertyId) {
      console.error("MainEffect: propertyId is missing. Cannot fetch property details.");
      setError("Property ID is missing. Cannot load details.");
      setPageLoading(false);
      return;
    }

    if (!property || property._id !== propertyId) {
      console.log(`MainEffect: Conditions met to fetch data. Current loaded property: ${property?._id}, Target propertyId: ${propertyId}`);
      fetchPropertyAndRoomData(user); 
    } else {
      console.log("MainEffect: Correct property data already loaded. Ensuring pageLoading is false.");
      setPageLoading(false); 
    }
    
  }, [user, authLoading, propertyId, userRole, property]); // Refined dependency array

  // Add this log before the return statements for rendering
  console.log(`PropertyDetails RENDER: pageLoading=${pageLoading}, authLoading=${authLoading}, user=${user ? 'exists' : 'null'}, error=${error}, property=${property ? 'exists' : 'null'}, propertyId=${propertyId}`);

  // Rendering logic based on states
  if (pageLoading) {
    console.log("Render: pageLoading is true.");
    let loadingMessage = "Loading property details...";
    if (authLoading) {
        loadingMessage = "Verifying authentication...";
    } else if (user && (!property || (property && property._id !== propertyId))) { 
        loadingMessage = "Fetching property data...";
    } else if (user && property && property._id === propertyId) {
        // This case should ideally not be hit if pageLoading is true, as data is ready.
        // But if it does, it means we are about to stop loading.
        loadingMessage = "Finalizing display..."; 
    }
    
    return (
      <div className="flex flex-col justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-blue-500 text-lg font-medium">{loadingMessage}</p>
      </div>
    );
  }

  // If there's an error, display the error message.
  // This should be checked before trying to render the property.
  if (error) {
    console.log("Render: Error state is active:", error);
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6 text-center">
          <svg className="mx-auto h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">{error}</h3>
          {error.includes('Authentication') && (
            <p className="mt-2 text-sm text-gray-600">
              You may need to sign out and sign back in to refresh your authentication.
            </p>
          )}
          <div className="mt-6 flex justify-center space-x-4">
            <button
              onClick={() => router.push('/host-dashboard')}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Return to Dashboard
            </button>
            {error.includes('Authentication') && (
              <button
                onClick={() => router.push('/login')}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                Go to Login
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!property) {
    // This case should ideally be covered by pageLoading or error states.
    // If property is null and not loading and no error, it might be an unhandled state.
    console.log("Render: Property is null, not loading, and no error. Displaying fallback.");
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6 text-center">
          <h3 className="text-lg font-medium text-gray-900">Property details are not available.</h3>
          <p className="mt-2 text-sm text-gray-600">
            The property might not exist or there was an issue loading its data.
          </p>
          <div className="mt-6">
            <button
              onClick={() => router.push('/host-dashboard')}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If property data is available, render the details.
  return (
    <div className="bg-gray-100 min-h-screen">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900">Property Details</h1>
          <button
            onClick={() => router.push('/host-dashboard')}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Back to Host Dashboard
          </button>
        </div>
      </header>

      <main className="py-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">          {/* Property Information Card */}
          <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-8">
            <div className="px-4 py-5 sm:px-6">
              <h2 className="text-xl font-semibold text-gray-900">{property.name}</h2>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">{property.location}</p>
            </div>
            <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
              <dl className="sm:divide-y sm:divide-gray-200">
                {userRole === UserRole.HOST && (
                  <div className="py-3 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Shareable Booking URL</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2 flex items-center">
                      <input 
                        type="text" 
                        value={bookingUrl} 
                        readOnly 
                        className="flex-1 block w-full border-gray-300 rounded-md shadow-sm text-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                      <button 
                        onClick={copyToClipboard} 
                        className="ml-2 inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        {copied ? 'Copied!' : 'Copy'}
                      </button>
                    </dd>
                  </div>
                )}
                <div className="py-3 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Contact Number</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{property.phoneNumber}</dd>
                </div>
                {property.alternateNumber && (
                  <div className="py-3 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Alternate Number</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{property.alternateNumber}</dd>
                  </div>
                )}
                <div className="py-3 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">UPI ID</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{property.upiId}</dd>
                </div>
                <div className="py-3 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Bank Account Name</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{property.bankAccountName}</dd>
                </div>
                <div className="py-3 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Property Images</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {property.images && property.images.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {property.images.map((image, index) => (
                          <div key={index} className="relative w-full h-32 rounded-lg overflow-hidden shadow">
                            <Image 
                              src={image} 
                              alt={`Property Image ${index + 1}`} 
                              layout="fill" 
                              objectFit="cover" 
                              className="hover:opacity-75 transition-opacity duration-300"
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p>No images available for this property.</p>
                    )}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Rooms Section */}
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Rooms</h2>
              {userRole === UserRole.HOST && (
                <button
                  onClick={() => router.push(`/add-room?propertyId=${propertyId}`)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Add New Room
                </button>
              )}
            </div>
            {rooms.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {rooms.map((room) => (
                  <li key={room._id} className="px-4 py-4 sm:px-6 hover:bg-gray-50 transition duration-150 ease-in-out">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-medium text-blue-600">
                          {room.roomCategory || 'Standard Room'} (Capacity: {room.capacity})
                        </h3>
                        <p className="text-sm text-gray-700">
                          Pricing: {room.pricingType === 'perRoom' ? `₹${room.ratePerRoom}/room` : 'Per Person (Details not shown)'}
                        </p>
                        {room.amenities && room.amenities.length > 0 && (
                          <p className="text-sm text-gray-500 mt-1">
                            Amenities: {room.amenities.join(', ')}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={() => router.push(`/room/${room._id}`)}
                          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                        >
                          View Details
                        </button>
                        {userRole === UserRole.HOST && (
                          <button 
                            onClick={() => router.push(`/room/${room._id}/edit`)}
                            className="text-sm text-green-600 hover:text-green-800 font-medium"
                          >
                            Edit
                          </button>
                        )}
                      </div>
                    </div>
                    {room.images && room.images.length > 0 && (
                      <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                        {room.images.map((img, idx) => (
                          <div key={idx} className="relative w-full h-20 rounded-md overflow-hidden shadow-sm">
                            <Image 
                              src={img} 
                              alt={`Room Image ${idx + 1}`} 
                              layout="fill" 
                              objectFit="cover" 
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-4 py-5 sm:px-6">
                <div className="flex items-center justify-center text-gray-500 py-8">
                  <svg className="w-10 h-10 mr-3 text-gray-400" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z"></path>
                  </svg>
                  <div>
                    <p className="text-lg font-medium">No rooms found for this property yet.</p>
                    {userRole === UserRole.HOST && (
                      <p className="text-sm">Click &quot;Add New Room&quot; to get started.</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
