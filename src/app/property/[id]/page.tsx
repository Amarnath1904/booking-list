'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

interface Property {
  _id: string;
  name: string;
  location: string;
  numberOfRooms: string;
  pricingType: 'perRoom' | 'perPerson';
  pricePerUnit: number;
  images?: string[];
  phoneNumber: string;
  alternateNumber?: string;
  upiId: string;
  bankAccountName: string;
  createdAt: string;
  updatedAt: string;
}

export default function PropertyDetails({ params }: { params: { id: string } }) {  const { user } = useAuth();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    async function fetchPropertyDetails() {
      if (!user) {
        return;
      }

      try {
        setLoading(true);
        
        // Add authentication token to the request
        const token = await user.getIdToken();
        
        const response = await fetch(`/api/properties/${params.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          if (response.status === 404) {
            setError('Property not found');
          } else {
            setError('Failed to load property details');
          }
          return;
        }

        const data = await response.json();
        setProperty(data);
      } catch (err) {
        setError('An error occurred while fetching property details');
        console.error('Error fetching property details:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchPropertyDetails();
  }, [params.id, user]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6 text-center">
          <svg className="mx-auto h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">{error}</h3>
          <div className="mt-6">
            <Link href="/host-dashboard" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
              Return to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!property) {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <Link href="/host-dashboard" className="text-blue-600 hover:text-blue-800">
          ← Back to Dashboard
        </Link>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 bg-gradient-to-r from-blue-600 to-blue-400">
          <h1 className="text-xl font-bold text-white">{property.name}</h1>
          <p className="mt-1 max-w-2xl text-sm text-white opacity-80">{property.location}</p>
        </div>
        <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
          <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500">Number of Rooms</dt>
              <dd className="mt-1 text-sm text-gray-900">{property.numberOfRooms}</dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500">Created</dt>
              <dd className="mt-1 text-sm text-gray-900">{new Date(property.createdAt).toLocaleDateString()}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-sm font-medium text-gray-500">Contact Information</dt>
              <dd className="mt-1 text-sm text-gray-900">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="font-medium">Phone Number (WhatsApp):</p>
                    <p>{property.phoneNumber}</p>
                  </div>
                  {property.alternateNumber && (
                    <div>
                      <p className="font-medium">Alternate Number:</p>
                      <p>{property.alternateNumber}</p>
                    </div>
                  )}
                </div>
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-sm font-medium text-gray-500">Payment Information</dt>
              <dd className="mt-1 text-sm text-gray-900">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="font-medium">UPI ID:</p>
                    <p>{property.upiId}</p>
                  </div>
                  <div>
                    <p className="font-medium">Bank Account Name:</p>
                    <p>{property.bankAccountName}</p>
                  </div>
                </div>
              </dd>
            </div>
          </dl>
        </div>        <div className="px-4 py-5 sm:px-6 bg-gray-50 flex justify-end">
          <Link
            href="/host-dashboard"
            className="inline-flex items-center px-4 py-2 mr-3 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Edit Property
          </Link>
          <button
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Manage Bookings
          </button>
        </div>
      </div>
    </div>
  );
}
