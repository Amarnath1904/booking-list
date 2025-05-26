'use client';

import { UserRole } from '@/constants/userRoles';
import { useRouteProtection } from '@/app/utils/auth-helpers';
import { useState, ChangeEvent, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

// Define the Property interface
interface Property {
  _id: string;
  name: string;
  location: string;
  numberOfRooms: string;
  pricingType: 'perRoom' | 'perPerson';
  pricePerUnit: number;
  description?: string;
  amenities?: string[];
  images?: string[];
  createdAt: string;
  updatedAt: string;
}

export default function HostDashboard() {
  // Protect this route - only hosts can access
  const isLoading = useRouteProtection(UserRole.HOST);
  // Get current user from auth context
  const { user } = useAuth();
  // State for properties
  const [properties, setProperties] = useState<Property[]>([]);
  const [propertiesLoading, setPropertiesLoading] = useState(true);
  const [isDetailsMissing, setIsDetailsMissing] = useState(true);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [formData, setFormData] = useState({
    propertyName: '',
    location: '',
    phoneNumber: '',
    alternateNumber: '',
    upiId: '',
    bankAccountName: '',
    numberOfRooms: '',
    pricingType: 'perRoom', // Default to per room pricing
  });
  const router = useRouter();

  // Fetch user profile data when component mounts
  useEffect(() => {
    async function fetchUserProfile() {
      if (user && user.uid) {
        try {
          setIsProfileLoading(true);
          const response = await fetch(`/api/users/${user.uid}`);
          
          if (response.ok) {
            const userData = await response.json();
            
            // Check if user has already completed the host details
            const hasCompletedProfile = Boolean(
              userData.propertyName && 
              userData.location && 
              userData.phoneNumber && 
              userData.upiId && 
              userData.bankAccountName && 
              userData.numberOfRooms
            );
            
            if (hasCompletedProfile) {
              // Pre-fill the form with existing data
              setFormData({
                propertyName: userData.propertyName || '',
                location: userData.location || '',
                phoneNumber: userData.phoneNumber || '',
                alternateNumber: userData.alternateNumber || '',
                upiId: userData.upiId || '',
                bankAccountName: userData.bankAccountName || '',
                numberOfRooms: userData.numberOfRooms || '',
                pricingType: userData.pricingType || 'perRoom',
              });
              setIsDetailsMissing(false);
            }
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
        } finally {
          setIsProfileLoading(false);
        }
      }
    }
    
    fetchUserProfile();
  }, [user]);
  // Fetch properties when profile is complete
  useEffect(() => {
    async function fetchProperties() {
      if (user && user.uid && !isDetailsMissing && !isProfileLoading) {
        try {
          setPropertiesLoading(true);
          
          // Add authentication token to the request
          const token = await user.getIdToken();
          
          const response = await fetch('/api/properties', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            console.log("Properties fetched successfully:", data);
            setProperties(data);
          } else {
            const errorData = await response.json();
            console.error('Failed to fetch properties', errorData);
          }
        } catch (error) {
          console.error('Error fetching properties:', error);
        } finally {
          setPropertiesLoading(false);
        }
      }
    }
    
    fetchProperties();
  }, [user, isDetailsMissing, isProfileLoading]);
  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      // Make sure we have a user
      if (!user) {
        console.error('User not authenticated');
        return;
      }

      // Get Firebase auth token
      const token = await user.getIdToken();

      const response = await fetch('/api/host-details', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          firebaseUid: user.uid
        }),
      });

      if (response.ok) {
        // Update local state to indicate profile is complete
        setIsDetailsMissing(false);
        // Show success message or redirect
        router.refresh();
      } else {
        const errorData = await response.json();
        console.error('Failed to save details', errorData);
      }
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  };  // Function to add a sample property for demonstration
  const addSampleProperty = async () => {
    try {
      if (!user) {
        console.error('User not authenticated');
        return;
      }

      // Create a new property
      const newProperty = {
        name: `${formData.propertyName || 'My Property'} ${properties.length + 1}`,
        location: formData.location || 'Sample Location',
        numberOfRooms: formData.numberOfRooms || '4',
        pricingType: formData.pricingType || 'perRoom',
        pricePerUnit: 1000, // Sample price
        description: 'A comfortable property with all amenities',
        amenities: ['WiFi', 'AC', 'TV', 'Kitchen'],
      };

      console.log('Adding new property:', newProperty);
      
      // Add authentication token to the request
      const token = await user.getIdToken();

      const response = await fetch('/api/properties', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newProperty),
      });

      if (response.ok) {
        // Refresh properties
        const propertiesResponse = await fetch('/api/properties', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (propertiesResponse.ok) {
          const data = await propertiesResponse.json();
          setProperties(data);
        }
      } else {
        const errorData = await response.json();
        console.error('Failed to add property', errorData);
      }
    } catch (error) {
      console.error('Error adding property:', error);
    }
  };if (isLoading || isProfileLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }
  if (isDetailsMissing) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="w-full max-w-3xl px-4 py-8">          <div className="bg-white shadow-lg rounded-lg overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-400 p-6">
              <h2 className="text-2xl font-bold text-white">Complete Your Host Profile</h2>
              <p className="text-white text-opacity-90 mt-2">
                Please provide these details to set up your property on our platform
              </p>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label htmlFor="propertyName" className="block text-sm font-medium text-gray-700">
                    Property Name
                  </label>
                  <input
                    id="propertyName"
                    name="propertyName"
                    type="text"
                    value={formData.propertyName}
                    onChange={handleInputChange}
                    className="w-full text-black p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="location" className="block text-sm font-medium text-gray-700">
                    Location
                  </label>
                  <input
                    id="location"
                    name="location"
                    type="text"
                    value={formData.location}
                    onChange={handleInputChange}
                    className="w-full text-black p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700">
                    Phone Number (WhatsApp)
                  </label>
                  <input
                    id="phoneNumber"
                    name="phoneNumber"
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={handleInputChange}
                    className="w-full p-3 text-black border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="alternateNumber" className="block text-sm font-medium text-gray-700">
                    Alternate Number
                  </label>
                  <input
                    id="alternateNumber"
                    name="alternateNumber"
                    type="tel"
                    value={formData.alternateNumber}
                    onChange={handleInputChange}
                    className="w-full p-3 text-black border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                  />
                  <p className="text-xs text-gray-500 mt-1">Optional</p>
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="upiId" className="block text-sm font-medium text-gray-700">
                    UPI ID
                  </label>
                  <input
                    id="upiId"
                    name="upiId"
                    type="text"
                    value={formData.upiId}
                    onChange={handleInputChange}
                    className="w-full p-3 text-black border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="bankAccountName" className="block text-sm font-medium text-gray-700">
                    Name on Bank Account
                  </label>
                  <input
                    id="bankAccountName"
                    name="bankAccountName"
                    type="text"
                    value={formData.bankAccountName}
                    onChange={handleInputChange}
                    className="w-full p-3 border text-black border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    required
                  />
                </div>                <div className="space-y-2">
                  <label htmlFor="numberOfRooms" className="block text-sm font-medium text-gray-700">
                    Number of Rooms
                  </label>
                  <input
                    id="numberOfRooms"
                    name="numberOfRooms"
                    type="number"
                    min="1"
                    value={formData.numberOfRooms}
                    onChange={handleInputChange}
                    className="w-full p-3 border text-black border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    required
                  />
                </div>
                
                <div className="space-y-2 md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Pricing Type
                  </label>
                  <div className="mt-2 flex gap-6">
                    <div className="flex items-center">
                      <input
                        id="perRoom"
                        name="pricingType"
                        type="radio"
                        value="perRoom"
                        checked={formData.pricingType === 'perRoom'}
                        onChange={handleInputChange}
                        className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                      <label htmlFor="perRoom" className="ml-2 block text-sm text-gray-700">
                        Per Room
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        id="perPerson"
                        name="pricingType"
                        type="radio"
                        value="perPerson"
                        checked={formData.pricingType === 'perPerson'}
                        onChange={handleInputChange}
                        className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                      <label htmlFor="perPerson" className="ml-2 block text-sm text-gray-700">
                        Per Person
                      </label>
                    </div>
                  </div>
                </div>
              </div>
                <div className="mt-8 flex justify-end">
                <button
                  type="submit"
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-gradient-to-r from-blue-600 to-blue-400 hover:from-blue-700 hover:to-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
                >
                  Complete Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Host Dashboard</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage your properties, bookings, and earnings
          </p>
        </div>
        <button
          onClick={addSampleProperty}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Add Property
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">
              Total Properties
            </dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">
              {properties.length}
            </dd>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">
              Average Occupancy
            </dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">0%</dd>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">
              Active Bookings
            </dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">0</dd>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">
              Monthly Revenue
            </dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">₹0</dd>
          </div>
        </div>
      </div>

      {/* Properties List */}
      {propertiesLoading ? (
        <div className="text-center py-10">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <p className="mt-2 text-gray-500">Loading properties...</p>
        </div>
      ) : properties.length > 0 ? (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {properties.map((property) => (
              <li key={property._id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-medium text-gray-900 truncate">{property.name}</h3>
                    <div className="mt-1 flex items-center text-sm text-gray-500">
                      <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                      </svg>
                      <span className="truncate">{property.location}</span>
                    </div>
                    <div className="mt-1 flex items-center">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {property.numberOfRooms} Rooms
                      </span>
                      <span className="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        {property.pricingType === 'perRoom' ? 'Per Room' : 'Per Person'}
                      </span>
                      <span className="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                        ₹{property.pricePerUnit} {property.pricingType === 'perRoom' ? '/room' : '/person'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <Link
                      href={`/property/${property._id}`}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="text-center bg-white shadow overflow-hidden sm:rounded-md p-10">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No properties</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by adding your first property.
          </p>
          <div className="mt-6">
            <button
              onClick={addSampleProperty}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Add a Property
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
