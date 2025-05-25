'use client';

import { UserRole } from '@/constants/userRoles';
import { useRouteProtection } from '@/app/utils/auth-helpers';
import { useState, ChangeEvent, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function HostDashboard() {
  // Protect this route - only hosts can access
  const isLoading = useRouteProtection(UserRole.HOST);
  // Simulate an empty properties array
  const properties = [];

  const [isDetailsMissing, setIsDetailsMissing] = useState(true); // Simulate missing details
  const [formData, setFormData] = useState({
    propertyName: '',
    location: '',
    phoneNumber: '',
    alternateNumber: '',
    upiId: '',
    bankAccountName: '',
    numberOfRooms: '',
    pricingAmount: '',
    pricingType: 'perRoom', // Default to per room pricing
  });
  const router = useRouter();
  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/host-details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setIsDetailsMissing(false);
        router.refresh();
      } else {
        console.error('Failed to save details');
      }
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  };

  if (isLoading) {
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
                </div>
                  <div className="space-y-2">
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
                
                <div className="space-y-2">
                  <label htmlFor="pricingAmount" className="block text-sm font-medium text-gray-700">
                    Pricing Amount
                  </label>
                  <input
                    id="pricingAmount"
                    name="pricingAmount"
                    type="text"
                    value={formData.pricingAmount}
                    onChange={handleInputChange}
                    className="w-full p-3 border text-black border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    required
                    placeholder="e.g., ₹1000"
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
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Host Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600">
          Manage your properties, bookings, and earnings
        </p>
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
            <dd className="mt-1 text-3xl font-semibold text-gray-900">$0</dd>
          </div>
        </div>
      </div>

      {/* No data to display */}
      <div className="text-center text-gray-500 mt-10">
        No properties available to display.
      </div>
    </div>
  );
}
