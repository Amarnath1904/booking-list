'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Image from 'next/image';

// Define BookingStatus enum here instead of importing from server-side model
enum BookingStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  REJECTED = 'rejected'
}

interface Booking {
  _id: string;
  propertyId: {
    _id: string;
    name: string;
  };
  roomId: {
    _id: string;
    roomCategory: string;
  };
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  guestAddress: string;
  checkInDate: string;
  checkOutDate: string;
  paymentScreenshotUrl: string;
  bookingStatus: BookingStatus;
  bookingCode: string;
  createdAt: string;
}

export default function BookingsPage() {
  const { user, loading: authLoading, userRole } = useAuth();
  const router = useRouter();
  
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailsBooking, setDetailsBooking] = useState<Booking | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<BookingStatus | 'all'>('all');
  
  // Fetch bookings data
  useEffect(() => {
    const fetchBookings = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        const token = await user.getIdToken(true);
        
        // We get all bookings since the host dashboard needs to show all properties' bookings
        const url = selectedStatus === 'all' 
          ? `/api/bookings` 
          : `/api/bookings?status=${selectedStatus}`;
        
        const response = await fetch(url, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch bookings: ${response.status}`);
        }
        
        const data = await response.json();
        setBookings(data);
      } catch (err) {
        console.error('Error fetching bookings:', err);
        setError('Failed to load bookings. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    if (!authLoading && user) {
      fetchBookings();
    }
  }, [user, authLoading, selectedStatus]);

  const handleViewDetails = (booking: Booking) => {
    setDetailsBooking(booking);
    setShowDetailsModal(true);
  };

  const handleViewImage = (booking: Booking) => {
    setDetailsBooking(booking);
    setShowImageModal(true);
  };

  const handleUpdateStatus = async (bookingId: string, newStatus: BookingStatus) => {
    if (!user) return;
    
    try {
      const token = await user.getIdToken(true);
      
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ bookingStatus: newStatus })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update booking: ${response.status}`);
      }
      
      // Update booking in the UI
      setBookings(prevBookings => 
        prevBookings.map(booking => 
          booking._id === bookingId 
            ? { ...booking, bookingStatus: newStatus } 
            : booking
        )
      );
      
      // Close modals
      setShowDetailsModal(false);
      
      // Show success message
      alert(`Booking ${newStatus === BookingStatus.CONFIRMED ? 'confirmed' : 'rejected'} successfully!`);
    } catch (err) {
      console.error('Error updating booking status:', err);
      alert('Failed to update booking status. Please try again.');
    }
  };

  if (authLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6 text-center">
          <h3 className="text-lg font-medium text-gray-900">Authentication required</h3>
          <p className="mt-2 text-sm text-gray-600">
            Please log in to view this page.
          </p>
          <div className="mt-6">
            <button
              onClick={() => router.push('/login')}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Bookings</h1>
            <p className="mt-1 text-sm text-gray-600">
              Manage all bookings for your properties
            </p>
          </div>
          
          <div className="mt-4 md:mt-0">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as BookingStatus | 'all')}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              <option value="all">All Bookings</option>
              <option value={BookingStatus.PENDING}>Pending</option>
              <option value={BookingStatus.CONFIRMED}>Confirmed</option>
              <option value={BookingStatus.REJECTED}>Rejected</option>
            </select>
          </div>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6 text-center">
            <h3 className="text-lg font-medium text-red-500">{error}</h3>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Retry
            </button>
          </div>
        ) : bookings.length === 0 ? (
          <div className="bg-white shadow overflow-hidden sm:rounded-lg p-8 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
              <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">No bookings found</h3>
            <p className="mt-2 text-sm text-gray-600">
              {selectedStatus === 'all' 
                ? 'You don\'t have any bookings yet.' 
                : `You don't have any ${selectedStatus} bookings.`}
            </p>
          </div>
        ) : (
          <div className="mt-4 flex flex-col">
            <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
              <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
                <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Booking Info
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Guest
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Stay Dates
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Payment
                        </th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {bookings.map((booking) => (
                        <tr key={booking._id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {booking.propertyId.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {booking.roomId.roomCategory || 'Standard Room'}
                            </div>
                            <div className="text-xs text-gray-400">
                              #{booking.bookingCode}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{booking.guestName}</div>
                            <div className="text-sm text-gray-500">{booking.guestEmail}</div>
                            <div className="text-sm text-gray-500">{booking.guestPhone}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {new Date(booking.checkInDate).toLocaleDateString()}
                            </div>
                            <div className="text-sm text-gray-500">
                              to {new Date(booking.checkOutDate).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                              ${booking.bookingStatus === BookingStatus.CONFIRMED ? 'bg-green-100 text-green-800' : 
                                booking.bookingStatus === BookingStatus.PENDING ? 'bg-yellow-100 text-yellow-800' : 
                                'bg-red-100 text-red-800'}`}>
                              {booking.bookingStatus.charAt(0).toUpperCase() + booking.bookingStatus.slice(1)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {booking.paymentScreenshotUrl && (
                              <button 
                                onClick={() => handleViewImage(booking)}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                View Screenshot
                              </button>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => handleViewDetails(booking)}
                              className="text-blue-600 hover:text-blue-900 mr-4"
                            >
                              View Details
                            </button>
                            {booking.bookingStatus === BookingStatus.PENDING && (
                              <>
                                <button
                                  onClick={() => handleUpdateStatus(booking._id, BookingStatus.CONFIRMED)}
                                  className="text-green-600 hover:text-green-900 mr-4"
                                >
                                  Confirm
                                </button>
                                <button
                                  onClick={() => handleUpdateStatus(booking._id, BookingStatus.REJECTED)}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Booking Details Modal */}
      {showDetailsModal && detailsBooking && (
        <div className="fixed inset-0 overflow-y-auto z-50" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setShowDetailsModal(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                      Booking Details
                    </h3>
                    <div className="mt-4 space-y-4">
                      <div>
                        <h4 className="text-sm font-medium text-gray-500">Booking Reference</h4>
                        <p className="mt-1 text-sm text-gray-900">{detailsBooking.bookingCode}</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-500">Property</h4>
                        <p className="mt-1 text-sm text-gray-900">{detailsBooking.propertyId.name}</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-500">Room</h4>
                        <p className="mt-1 text-sm text-gray-900">{detailsBooking.roomId.roomCategory || 'Standard Room'}</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-500">Guest Information</h4>
                        <p className="mt-1 text-sm text-gray-900">
                          {detailsBooking.guestName}<br />
                          {detailsBooking.guestEmail}<br />
                          {detailsBooking.guestPhone}<br />
                          {detailsBooking.guestAddress}
                        </p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-500">Stay Dates</h4>
                        <p className="mt-1 text-sm text-gray-900">
                          Check-in: {new Date(detailsBooking.checkInDate).toLocaleDateString()}<br />
                          Check-out: {new Date(detailsBooking.checkOutDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-500">Status</h4>
                        <p className={`mt-1 text-sm font-semibold
                          ${detailsBooking.bookingStatus === BookingStatus.CONFIRMED ? 'text-green-600' : 
                            detailsBooking.bookingStatus === BookingStatus.PENDING ? 'text-yellow-600' : 
                            'text-red-600'}`}>
                          {detailsBooking.bookingStatus.charAt(0).toUpperCase() + detailsBooking.bookingStatus.slice(1)}
                        </p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-500">Booking Date</h4>
                        <p className="mt-1 text-sm text-gray-900">
                          {new Date(detailsBooking.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button 
                  type="button" 
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm" 
                  onClick={() => setShowDetailsModal(false)}
                >
                  Close
                </button>
                {detailsBooking.bookingStatus === BookingStatus.PENDING && (
                  <>
                    <button 
                      type="button" 
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm" 
                      onClick={() => handleUpdateStatus(detailsBooking._id, BookingStatus.CONFIRMED)}
                    >
                      Confirm Booking
                    </button>
                    <button 
                      type="button" 
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm" 
                      onClick={() => handleUpdateStatus(detailsBooking._id, BookingStatus.REJECTED)}
                    >
                      Reject Booking
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Screenshot Modal */}
      {showImageModal && detailsBooking && (
        <div className="fixed inset-0 overflow-y-auto z-50" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setShowImageModal(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                      Payment Screenshot
                    </h3>
                    <div className="mt-4 relative w-full h-96">
                      <Image 
                        src={detailsBooking.paymentScreenshotUrl} 
                        alt="Payment Screenshot" 
                        layout="fill" 
                        objectFit="contain" 
                        className="rounded"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button 
                  type="button" 
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm" 
                  onClick={() => setShowImageModal(false)}
                >
                  Close
                </button>
                <a 
                  href={detailsBooking.paymentScreenshotUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm" 
                >
                  Open Full Size
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
