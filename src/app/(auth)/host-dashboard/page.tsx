'use client';

import { UserRole } from '@/constants/userRoles';
import { useRouteProtection } from '@/app/utils/auth-helpers';
import { useState, ChangeEvent, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

// Define the Property interface
interface Property {
  _id: string;
  name: string;
  location: string;
  numberOfRooms: string;
  phoneNumber: string;
  alternateNumber?: string;
  upiId: string;
  bankAccountName: string;
  createdAt: string;
  updatedAt: string;
}

// Define the property form data interface
interface PropertyFormData {
  name: string;
  location: string;
  numberOfRooms: string;
  phoneNumber: string;
  alternateNumber: string;
  upiId: string;
  bankAccountName: string;
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
  // State for showing property form
  const [showPropertyForm, setShowPropertyForm] = useState(false);
  // State for currently editing property
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);  // State for property form data
  const [propertyFormData, setPropertyFormData] = useState<PropertyFormData>({
    name: '',
    location: '',
    numberOfRooms: '1',
    phoneNumber: '',
    alternateNumber: '',
    upiId: '',
    bankAccountName: '',
  });
  const [formData, setFormData] = useState({
    displayName: '',
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
            // We now check only for displayName
            const hasCompletedProfile = Boolean(userData.displayName);
            
            if (hasCompletedProfile) {
              // Pre-fill the form with existing user data
              setFormData({
                displayName: userData.displayName || '',
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

  // Fetch properties when component mounts
  useEffect(() => {
    async function fetchProperties() {
      if (user && user.uid && !isProfileLoading) {
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
            setProperties(data);
            // If no properties, show the property form automatically
            if (data.length === 0) {
              setShowPropertyForm(true);
            }
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
  }, [user, isProfileLoading]);

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
      console.log('Submitting host details with token:', token ? 'Token present' : 'No token');

      const response = await fetch('/api/users/' + user.uid, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          displayName: formData.displayName
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Host details saved successfully:', data);
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
  };

  // Handle property form input changes
  const handlePropertyInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setPropertyFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle property form submission
  const handlePropertySubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      if (!user) {
        console.error('User not authenticated');
        return;
      }

      // Get Firebase auth token
      const token = await user.getIdToken();

      // Determine if we're adding or editing
      const isEditing = Boolean(editingProperty);
      const endpoint = isEditing 
        ? `/api/properties/${editingProperty?._id}` 
        : '/api/properties';
      const method = isEditing ? 'PUT' : 'POST';

      // Only send the required fields
      const {
        name, location, numberOfRooms, phoneNumber, alternateNumber, upiId, bankAccountName
      } = propertyFormData;
      const response = await fetch(endpoint, {
        method: method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name, location, numberOfRooms, phoneNumber, alternateNumber, upiId, bankAccountName
        }),
      });

      if (response.ok) {        // Reset form and close it
        setPropertyFormData({
          name: '',
          location: '',
          numberOfRooms: '1',
          phoneNumber: '',
          alternateNumber: '',
          upiId: '',
          bankAccountName: '',
        });
        setShowPropertyForm(false);
        setEditingProperty(null);
        
        // Refresh properties list
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
        console.error('Failed to save property', errorData);
      }
    } catch (error) {
      console.error('Error submitting property form:', error);
    }
  };
  // Open property form for editing
  const editProperty = (property: Property) => {
    setEditingProperty(property);
    setPropertyFormData({
      name: property.name,
      location: property.location,
      numberOfRooms: property.numberOfRooms,
      phoneNumber: property.phoneNumber || '',
      alternateNumber: property.alternateNumber || '',
      upiId: property.upiId || '',
      bankAccountName: property.bankAccountName || '',
    });
    setShowPropertyForm(true);
  };

  // Remove the modal from inside the dashboard return and instead conditionally render either the modal or the dashboard, not both.
  if (isLoading || isProfileLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (isDetailsMissing) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="w-full max-w-3xl px-4 py-8">
          <div className="bg-white shadow-lg rounded-lg overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-400 p-6">
              <h2 className="text-2xl font-bold text-white">Complete Your Host Profile</h2>
              <p className="text-white text-opacity-90 mt-2">
                Please provide these details to set up your property on our platform
              </p>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                  <label htmlFor="displayName" className="block text-sm font-medium text-gray-700">
                    Display Name
                  </label>
                  <input
                    id="displayName"
                    name="displayName"
                    type="text"
                    value={formData.displayName}
                    onChange={handleInputChange}
                    className="w-full p-3 text-black border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition placeholder-black"
                    required
                  />
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
  }

  // If there are no properties or the modal is open, show ONLY the property form modal and do not render the dashboard
  if (showPropertyForm || properties.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <form onSubmit={handlePropertySubmit} className="bg-white p-8 rounded shadow-md w-full max-w-lg">
          <h3 className="text-lg leading-6 font-medium text-black mb-4">
            {editingProperty ? 'Edit Property' : 'Add New Property'}
          </h3>
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-black">Property Name</label>
              <input
                type="text"
                name="name"
                id="name"
                value={propertyFormData.name}
                onChange={handlePropertyInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-black placeholder-black"
                required
              />
            </div>
            <div>
              <label htmlFor="location" className="block text-sm font-medium text-black">Location</label>
              <input
                type="text"
                name="location"
                id="location"
                value={propertyFormData.location}
                onChange={handlePropertyInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-black placeholder-black"
                required
              />
            </div>
            <div>
              <label htmlFor="numberOfRooms" className="block text-sm font-medium text-black">Number of Rooms</label>
              <input
                type="number"
                name="numberOfRooms"
                id="numberOfRooms"
                min="1"
                value={propertyFormData.numberOfRooms}
                onChange={handlePropertyInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-black placeholder-black"
                required
              />
            </div>
            <div>
              <label htmlFor="phoneNumber" className="block text-sm font-medium text-black">Phone Number (WhatsApp)</label>
              <input
                type="tel"
                name="phoneNumber"
                id="phoneNumber"
                value={propertyFormData.phoneNumber}
                onChange={handlePropertyInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-black placeholder-black"
                required
              />
            </div>
            <div>
              <label htmlFor="alternateNumber" className="block text-sm font-medium text-black">Alternate Number</label>
              <input
                type="tel"
                name="alternateNumber"
                id="alternateNumber"
                value={propertyFormData.alternateNumber}
                onChange={handlePropertyInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-black placeholder-black"
              />
            </div>
            <div>
              <label htmlFor="upiId" className="block text-sm font-medium text-black">UPI ID</label>
              <input
                type="text"
                name="upiId"
                id="upiId"
                value={propertyFormData.upiId}
                onChange={handlePropertyInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-black placeholder-black"
                required
              />
            </div>
            <div>
              <label htmlFor="bankAccountName" className="block text-sm font-medium text-black">Name on Bank Account</label>
              <input
                type="text"
                name="bankAccountName"
                id="bankAccountName"
                value={propertyFormData.bankAccountName}
                onChange={handlePropertyInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-black placeholder-black"
                required
              />
            </div>
          </div>
          <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
            <button
              type="submit"
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:col-start-2 sm:text-sm"
            >
              {editingProperty ? 'Save Changes' : 'Add Property'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowPropertyForm(false);
                setEditingProperty(null);
              }}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:col-start-1 sm:text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    );
  }

  // Otherwise, show the dashboard
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Host Dashboard</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage your properties, bookings, and earnings
          </p>
        </div>
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
                    <div className="mt-1 flex flex-wrap gap-2 text-sm">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {property.numberOfRooms} Rooms
                      </span>
                    </div>
                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 text-sm text-gray-700">
                      <div><span className="font-semibold">Phone Number:</span> {property.phoneNumber}</div>
                      {property.alternateNumber && <div><span className="font-semibold">Alternate Number:</span> {property.alternateNumber}</div>}
                      <div><span className="font-semibold">UPI ID:</span> {property.upiId}</div>
                      <div><span className="font-semibold">Bank Account Name:</span> {property.bankAccountName}</div>
                    </div>
                  </div>
                  <div className="flex space-x-2 ml-4">
                    <button
                      onClick={() => editProperty(property)}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
