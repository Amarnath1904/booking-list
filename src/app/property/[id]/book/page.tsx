'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { DateRange, RangeKeyDict } from 'react-date-range';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';

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

interface BookingFormData {
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  guestAddress: string;
  checkInDate: Date | null;
  checkOutDate: Date | null;
  selectedRoomId: string;
}

export default function GuestBookingPage() {
  const params = useParams();
  const router = useRouter();
  const propertyId = params.id as string;
  
  const [property, setProperty] = useState<Property | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(1); // 1: Room selection, 2: Guest info, 3: Payment, 4: Confirmation
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [paymentUploading, setPaymentUploading] = useState(false);
  const [unavailableDates, setUnavailableDates] = useState<Date[]>([]);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [dateRange, setDateRange] = useState<{
    startDate: Date;
    endDate: Date;
    key: string;
  }>({
    startDate: new Date(),
    endDate: new Date(),
    key: 'selection'
  });

  const [formData, setFormData] = useState<BookingFormData>({
    guestName: '',
    guestEmail: '',
    guestPhone: '',
    guestAddress: '',
    checkInDate: null,
    checkOutDate: null,
    selectedRoomId: ''
  });

  const handleDateSelect = (ranges: RangeKeyDict) => {
    const { selection } = ranges;
    if (selection.startDate && selection.endDate) {
      setDateRange({
        startDate: selection.startDate,
        endDate: selection.endDate,
        key: 'selection'
      });
      
      setFormData(prev => ({
        ...prev,
        checkInDate: selection.startDate || null,
        checkOutDate: selection.endDate || null
      }));
    }
  };

  // Fetch property data
  useEffect(() => {
    const fetchPropertyData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Public endpoint, no auth required
        const propertyResponse = await fetch(`/api/properties/${propertyId}`);
        
        if (!propertyResponse.ok) {
          throw new Error(`Failed to fetch property: ${propertyResponse.status}`);
        }
        
        const propertyData = await propertyResponse.json();
        setProperty(propertyData);
        
        // Fetch rooms data
        const roomsResponse = await fetch(`/api/rooms?propertyId=${propertyId}`);
        
        if (!roomsResponse.ok) {
          throw new Error(`Failed to fetch rooms: ${roomsResponse.status}`);
        }
        
        const roomsData = await roomsResponse.json();
        setRooms(roomsData);
      } catch (err) {
        console.error('Error fetching property data:', err);
        setError('Failed to load property data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    if (propertyId) {
      fetchPropertyData();
    }
  }, [propertyId]);

  // Fetch unavailable dates when a room is selected
  useEffect(() => {
    const fetchUnavailableDates = async () => {
      if (!formData.selectedRoomId) return;
      
      try {
        const month = currentMonth.getMonth() + 1; // JavaScript months are 0-indexed
        const year = currentMonth.getFullYear();
        
        const response = await fetch(`/api/room-availability?roomId=${formData.selectedRoomId}&month=${month}&year=${year}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch availability: ${response.status}`);
        }
        
        const data = await response.json();
        // Convert string dates to Date objects
        const dateObjects = data.unavailableDates.map((dateStr: string) => new Date(dateStr));
        setUnavailableDates(dateObjects);
      } catch (err) {
        console.error('Error fetching unavailable dates:', err);
      }
    };
    
    fetchUnavailableDates();
  }, [formData.selectedRoomId, currentMonth]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRoomSelection = (roomId: string) => {
    setFormData(prev => ({ ...prev, selectedRoomId: roomId }));
  };

  const handleNextStep = async () => {
    if (step === 1) {
      // Validate room and date selection
      if (!formData.selectedRoomId) {
        alert('Please select a room.');
        return;
      }
      
      if (!formData.checkInDate || !formData.checkOutDate) {
        alert('Please select both check-in and check-out dates.');
        return;
      }
      
      // Move to next step
      setStep(2);
    } else if (step === 2) {
      // Validate guest info
      if (!formData.guestName || !formData.guestPhone || !formData.guestEmail || !formData.guestAddress) {
        alert('Please fill in all guest information fields.');
        return;
      }
      
      // Create the booking
      try {
        const selectedRoom = rooms.find(room => room._id === formData.selectedRoomId);
        if (!selectedRoom) {
          throw new Error('Selected room not found');
        }
        
        // Calculate number of nights
        const checkInDate = formData.checkInDate as Date;
        const checkOutDate = formData.checkOutDate as Date;
        const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
        
        // Calculate total amount
        const baseAmount = selectedRoom.ratePerRoom ? selectedRoom.ratePerRoom * nights : 0;
        const totalAmount = baseAmount; // Add any additional charges here
        
        const bookingData = {
          propertyId,
          roomId: formData.selectedRoomId,
          guestName: formData.guestName,
          guestEmail: formData.guestEmail,
          guestPhone: formData.guestPhone,
          guestAddress: formData.guestAddress,
          checkInDate: formData.checkInDate?.toISOString(),
          checkOutDate: formData.checkOutDate?.toISOString(),
          nights,
          baseAmount,
          totalAmount,
          status: 'pending'
        };
        
        const response = await fetch('/api/bookings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(bookingData)
        });
        
        if (!response.ok) {
          throw new Error(`Failed to create booking: ${response.status}`);
        }
        
        const result = await response.json();
        setBookingId(result._id);
        
        // Move to next step
        setStep(3);
      } catch (err) {
        console.error('Error creating booking:', err);
        alert('Failed to create booking. Please try again.');
      }
    } else if (step === 3) {
      // This step is handled by handlePaymentUpload
    }
  };

  const handlePaymentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!bookingId) {
      alert('Booking ID not found. Please try again.');
      return;
    }
    
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const screenshot = files[0];
    
    // Check file type
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(screenshot.type)) {
      alert('Please upload a valid image file (JPEG, PNG, or WebP).');
      return;
    }
    
    // Check file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (screenshot.size > maxSize) {
      alert('File size exceeds 5MB. Please upload a smaller image.');
      return;
    }
    
    setPaymentUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('bookingId', bookingId);
      formData.append('screenshot', screenshot);
      
      const response = await fetch('/api/upload-payment', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`Failed to upload payment: ${response.status}`);
      }
      
      // Move to confirmation step
      setStep(4);
    } catch (err) {
      console.error('Error uploading payment screenshot:', err);
      alert('Failed to upload payment screenshot. Please try again.');
    } finally {
      setPaymentUploading(false);
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
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-bold text-red-600 mb-2">Error</h2>
          <p className="text-gray-700">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-800 mb-2">Property Not Found</h2>
          <p className="text-gray-700">The requested property could not be found.</p>
          <button 
            onClick={() => window.location.href = '/'} 
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="py-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">{property.name}</h1>
            <p className="text-gray-600">{property.location}</p>
          </div>
          
          {step === 1 && (
            <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
              <div className="px-4 py-5 sm:px-6">
                <h2 className="text-lg font-medium text-gray-900">Select Room and Dates</h2>
                <p className="mt-1 text-sm text-gray-500">Choose your room and stay dates</p>
              </div>
              <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
                {rooms.length === 0 ? (
                  <p className="text-gray-500">No rooms available for this property.</p>
                ) : (
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {rooms.map(room => (
                      <div 
                        key={room._id}
                        onClick={() => handleRoomSelection(room._id)}
                        className={`border rounded-lg overflow-hidden cursor-pointer hover:shadow-md transition-shadow ${formData.selectedRoomId === room._id ? 'ring-2 ring-blue-500' : ''}`}
                      >
                        <div className="relative h-48">
                          {room.images && room.images.length > 0 ? (
                            <Image
                              src={room.images[0]}
                              alt={room.roomCategory || 'Room'}
                              fill
                              style={{ objectFit: 'cover' }}
                            />
                          ) : (
                            <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                              <span className="text-gray-400">No image</span>
                            </div>
                          )}
                        </div>
                        <div className="p-4">
                          <h3 className="font-medium text-gray-900">{room.roomCategory || 'Standard Room'}</h3>
                          <p className="text-gray-500 mb-2">Capacity: {room.capacity}</p>
                          {room.ratePerRoom && (
                            <p className="text-gray-900 font-bold">₹{room.ratePerRoom} per night</p>
                          )}
                          <div className="mt-2">
                            <span className="text-sm text-blue-600">
                              {formData.selectedRoomId === room._id ? 'Selected' : 'Click to select'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Select Your Stay Dates</h3>
                  <div className="border rounded-md p-4">
                    <DateRange
                      editableDateInputs={true}
                      onChange={handleDateSelect}
                      moveRangeOnFirstSelection={false}
                      ranges={[dateRange]}
                      minDate={new Date()}
                      disabledDates={unavailableDates}
                      months={1}
                      direction="horizontal"
                      className="border rounded-md"
                    />
                  </div>
                  <div className="mt-4 text-sm text-gray-600">
                    {formData.checkInDate && formData.checkOutDate && (
                      <p>
                        Selected dates: {formData.checkInDate.toLocaleDateString()} to {formData.checkOutDate.toLocaleDateString()} 
                        ({Math.ceil((formData.checkOutDate.getTime() - formData.checkInDate.getTime()) / (1000 * 60 * 60 * 24))} nights)
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-6">
                  <button
                    type="button"
                    onClick={handleNextStep}
                    disabled={!formData.selectedRoomId || !formData.checkInDate || !formData.checkOutDate}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    Continue to Guest Info
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {step === 2 && (
            <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
              <div className="px-4 py-5 sm:px-6">
                <h2 className="text-lg font-medium text-gray-900">Guest Information</h2>
                <p className="mt-1 text-sm text-gray-500">Please provide your details for the booking</p>
              </div>
              <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
                <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                  <div className="sm:col-span-3">
                    <label htmlFor="guestName" className="block text-sm font-medium text-gray-700">
                      Full Name
                    </label>
                    <input
                      type="text"
                      name="guestName"
                      id="guestName"
                      value={formData.guestName}
                      onChange={handleInputChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      required
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label htmlFor="guestPhone" className="block text-sm font-medium text-gray-700">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      name="guestPhone"
                      id="guestPhone"
                      value={formData.guestPhone}
                      onChange={handleInputChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      required
                    />
                  </div>

                  <div className="sm:col-span-6">
                    <label htmlFor="guestEmail" className="block text-sm font-medium text-gray-700">
                      Email Address
                    </label>
                    <input
                      type="email"
                      name="guestEmail"
                      id="guestEmail"
                      value={formData.guestEmail}
                      onChange={handleInputChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      required
                    />
                  </div>

                  <div className="sm:col-span-6">
                    <label htmlFor="guestAddress" className="block text-sm font-medium text-gray-700">
                      Address
                    </label>
                    <textarea
                      name="guestAddress"
                      id="guestAddress"
                      value={formData.guestAddress}
                      onChange={handleInputChange}
                      rows={3}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      required
                    />
                  </div>
                </div>

                <div className="mt-6 flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Proceed to Payment
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {step === 3 && (
            <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
              <div className="px-4 py-5 sm:px-6">
                <h2 className="text-lg font-medium text-gray-900">Payment Information</h2>
                <p className="mt-1 text-sm text-gray-500">Complete your booking with payment</p>
              </div>
              <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
                <div className="bg-gray-50 p-4 rounded-md mb-6">
                  <h3 className="text-md font-medium text-gray-900 mb-2">Payment Instructions</h3>
                  <ol className="list-decimal list-inside text-sm text-gray-700 space-y-2">
                    <li>Make payment via UPI to the ID shown below.</li>
                    <li>Take a screenshot of the payment confirmation.</li>
                    <li>Upload the screenshot below to verify your payment.</li>
                    <li>Click &quot;Complete Booking&quot; to finish the process.</li>
                  </ol>
                </div>
                
                <div className="mb-6">
                  <h3 className="text-md font-medium text-gray-900 mb-2">Payment Details</h3>
                  <div className="border rounded-md p-4">
                    <p className="text-sm text-gray-600">Account Name: <span className="font-mono text-gray-900">{property.bankAccountName}</span></p>
                    <p className="text-sm text-gray-600">UPI ID: <span className="font-mono text-gray-900">{property.upiId}</span></p>
                    
                    {/* Selected room information */}
                    {formData.selectedRoomId && (
                      <>
                        <div className="my-4 border-t border-gray-200 pt-4">
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Booking Summary</h4>
                          <p className="text-sm text-gray-600">
                            Room: {rooms.find(r => r._id === formData.selectedRoomId)?.roomCategory || 'Standard Room'}
                          </p>
                          {formData.checkInDate && formData.checkOutDate && (
                            <>
                              <p className="text-sm text-gray-600">
                                Check-in: {formData.checkInDate.toLocaleDateString()}
                              </p>
                              <p className="text-sm text-gray-600">
                                Check-out: {formData.checkOutDate.toLocaleDateString()}
                              </p>
                              <p className="text-sm text-gray-600">
                                Duration: {Math.ceil((formData.checkOutDate.getTime() - formData.checkInDate.getTime()) / (1000 * 60 * 60 * 24))} nights
                              </p>
                            </>
                          )}
                          <p className="text-sm font-medium text-gray-900 mt-2">
                            Total Amount: ₹{
                              formData.checkInDate && formData.checkOutDate && rooms.find(r => r._id === formData.selectedRoomId)?.ratePerRoom
                                ? (rooms.find(r => r._id === formData.selectedRoomId)?.ratePerRoom || 0) * 
                                  Math.ceil((formData.checkOutDate.getTime() - formData.checkInDate.getTime()) / (1000 * 60 * 60 * 24))
                                : 0
                            }
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="mb-6">
                  <h3 className="text-md font-medium text-gray-900 mb-2">Upload Payment Screenshot</h3>
                  <div className="mt-2">
                    <label className="block">
                      <span className="sr-only">Choose payment screenshot</span>
                      <input 
                        type="file" 
                        accept="image/jpeg,image/png,image/webp" 
                        onChange={handlePaymentUpload}
                        disabled={paymentUploading}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                    </label>
                    {paymentUploading && (
                      <div className="mt-2 flex items-center text-sm text-gray-500">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
                        <span>Uploading payment proof...</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="mt-6 flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Back
                  </button>
                  <a
                    href={`upi://pay?pa=${property.upiId}&pn=${encodeURIComponent(property.bankAccountName)}`}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    Pay with UPI
                  </a>
                </div>
              </div>
            </div>
          )}
          
          {step === 4 && (
            <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
              <div className="px-4 py-5 sm:px-6">
                <h2 className="text-lg font-medium text-green-600">Booking Confirmed!</h2>
                <p className="mt-1 text-sm text-gray-500">Your booking has been successfully confirmed</p>
              </div>
              <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
                <div className="text-center mb-6">
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                    <svg className="h-6 w-6 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900">Thank you for your booking!</h3>
                  <p className="mt-2 text-sm text-gray-500">
                    Your booking reference is: <span className="font-mono font-medium">{bookingId}</span>
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    A confirmation has been sent to your email address.
                  </p>
                </div>
                
                <div className="border rounded-md p-4 mb-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Booking Details</h4>
                  <p className="text-sm text-gray-600">
                    Property: {property.name}
                  </p>
                  <p className="text-sm text-gray-600">
                    Room: {rooms.find(r => r._id === formData.selectedRoomId)?.roomCategory || 'Standard Room'}
                  </p>
                  {formData.checkInDate && formData.checkOutDate && (
                    <>
                      <p className="text-sm text-gray-600">
                        Check-in: {formData.checkInDate.toLocaleDateString()}
                      </p>
                      <p className="text-sm text-gray-600">
                        Check-out: {formData.checkOutDate.toLocaleDateString()}
                      </p>
                      <p className="text-sm text-gray-600">
                        Duration: {Math.ceil((formData.checkOutDate.getTime() - formData.checkInDate.getTime()) / (1000 * 60 * 60 * 24))} nights
                      </p>
                    </>
                  )}
                  <p className="text-sm text-gray-600 mt-2">
                    Guest: {formData.guestName}
                  </p>
                </div>
                
                <div className="mt-6">
                  <button
                    type="button"
                    onClick={() => window.location.href = '/'}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Return to Home
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
