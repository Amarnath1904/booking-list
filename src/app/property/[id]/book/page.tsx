'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
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

type ValidationErrorType = {
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
  guestAddress?: string;
  selectedRoomId?: string;
  dates?: string;
  [key: string]: string | undefined;
};

interface BookingAttemptData {
  propertyId: string;
  roomId: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  guestAddress: string;
  checkInDate: string | undefined;
  checkOutDate: string | undefined;
  nights: number;
  baseAmount: number;
  totalAmount: number;
  status: string;
  // paymentScreenshotUrl will be added later before final submission
}

export default function GuestBookingPage() {
  const params = useParams();
  const propertyId = params.id as string;
  
  const [property, setProperty] = useState<Property | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(1); // 1: Room selection, 2: Guest info, 3: Payment, 4: Confirmation
  
  // DateRange component responsiveness
  const [datePickerMonths, setDatePickerMonths] = useState(2);
  const [datePickerDirection, setDatePickerDirection] = useState<'horizontal' | 'vertical'>('horizontal');
  
  // Initialize responsive values based on window size
  useEffect(() => {
    // Only run on client-side
    if (typeof window !== 'undefined') {
      const handleResize = () => {
        const mobile = window.innerWidth < 768;
        // setIsMobile(mobile); // Directly use mobile here if needed, or remove if isMobile state is not used elsewhere
        setDatePickerMonths(mobile ? 1 : 2);
        setDatePickerDirection(mobile ? 'vertical' : 'horizontal');
      };
      
      handleResize(); // Initial check
      window.addEventListener('resize', handleResize);
      
      return () => {
        window.removeEventListener('resize', handleResize);
      };
    }
  }, []);

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

  // Store all form data including room, dates, and guest info
  const [bookingAttemptData, setBookingAttemptData] = useState<BookingAttemptData | null>(null);

  const [formData, setFormData] = useState<BookingFormData>({
    guestName: '',
    guestEmail: '',
    guestPhone: '',
    guestAddress: '',
    checkInDate: null,
    checkOutDate: null,
    selectedRoomId: ''
  });

  // Form validation state
  const [validationErrors, setValidationErrors] = useState<ValidationErrorType>({});
  
  // State for drag and drop UI feedback
  const [isDragging, setIsDragging] = useState(false);
  const [fileUploadStatus, setFileUploadStatus] = useState<'idle' | 'error' | 'success'>('idle');
  const [fileUploadMessage, setFileUploadMessage] = useState<string | null>(null);

  const handleMonthChange = (date: Date) => {
    setCurrentMonth(date);
  };

  const handleDateSelect = (ranges: RangeKeyDict) => {
    const { selection } = ranges;
    if (selection.startDate && selection.endDate) {
      setDateRange({
        startDate: selection.startDate,
        endDate: selection.endDate,
        key: 'selection'
      });
      
      // Update current month when user selects a date to fetch new availability data
      setCurrentMonth(selection.startDate);
      
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
    
    // Clear validation error when user types
    if (validationErrors[name as keyof typeof validationErrors]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
  };

  const handleRoomSelection = (roomId: string) => {
    setFormData(prev => ({ ...prev, selectedRoomId: roomId }));
  };

  const validateEmail = (email: string): boolean => {
    // More comprehensive email validation regex
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string): boolean => {
    // Simple phone validation that allows for country codes and various formats
    const phoneRegex = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/;
    return phoneRegex.test(phone.replace(/\s+/g, ''));
  };
  
  const validateName = (name: string): boolean => {
    // Name should be at least 3 characters and contain only letters, spaces, and common name punctuation
    return name.length >= 3 && /^[a-zA-Z\s.',-]+$/.test(name);
  };

  const validatePaymentFile = (file: File): { valid: boolean; message?: string } => {
    // Check file type
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return { valid: false, message: 'Please upload a valid image file (JPEG, PNG, or WebP).' };
    }
    
    // Check file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return { valid: false, message: 'File size exceeds 5MB. Please upload a smaller image.' };
    }
    
    return { valid: true };
  };

  const handleNextStep = async () => {
    if (step === 1) {
      // Validate room and date selection
      const errors: Record<string, string> = {};
      if (!formData.selectedRoomId) {
        errors.selectedRoomId = 'Please select a room.';
      }
      
      if (!formData.checkInDate || !formData.checkOutDate) {
        errors.dates = 'Please select both check-in and check-out dates.';
      }
      
      if (Object.keys(errors).length > 0) {
        setValidationErrors(errors);
        return;
      }
      
      // Move to next step
      setValidationErrors({});
      setStep(2);
    } else if (step === 2) {
      // Validate guest info
      const errors: Record<string, string> = {};
      
      // Required field validations
      if (!formData.guestName) {
        errors.guestName = 'Name is required';
      } else if (!validateName(formData.guestName)) {
        errors.guestName = 'Please enter a valid name (at least 3 characters)';
      }
      
      // Phone validation
      if (!formData.guestPhone) {
        errors.guestPhone = 'Phone number is required';
      } else if (!validatePhone(formData.guestPhone)) {
        errors.guestPhone = 'Please enter a valid phone number';
      }
      
      // Email validation
      if (!formData.guestEmail) {
        errors.guestEmail = 'Email is required';
      } else if (!validateEmail(formData.guestEmail)) {
        errors.guestEmail = 'Please enter a valid email address';
      }
      
      // Address validation
      if (!formData.guestAddress) {
        errors.guestAddress = 'Address is required';
      } else if (formData.guestAddress.length < 10) {
        errors.guestAddress = 'Please enter a complete address with at least 10 characters';
      }
      
      if (Object.keys(errors).length > 0) {
        setValidationErrors(errors);
        return;
      }
      
      // Store current form data and move to payment step
      // Booking will be created after payment screenshot is uploaded
      const selectedRoom = rooms.find(room => room._id === formData.selectedRoomId);
      if (!selectedRoom) {
        // This should ideally not happen if validation passed in step 1
        alert('Selected room not found. Please go back and select a room.');
        return;
      }

      const checkInDate = formData.checkInDate as Date;
      const checkOutDate = formData.checkOutDate as Date;
      const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
      const baseAmount = selectedRoom.ratePerRoom ? selectedRoom.ratePerRoom * nights : 0;
      const totalAmount = baseAmount; // Add any additional charges here

      setBookingAttemptData({
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
        status: 'pending' // Initial status
      });

      setValidationErrors({});
      setStep(3); // Move to payment step
    }
  };

  const processPaymentAndBooking = async (screenshotFile: File) => {
    setPaymentUploading(true);
    setFileUploadStatus('idle');
    setFileUploadMessage(null);

    try {
      // Step 1: Upload payment screenshot
      const screenshotFormData = new FormData();
      screenshotFormData.append('screenshot', screenshotFile);
      // Assuming /api/upload-payment now accepts only the screenshot
      // and returns { paymentScreenshotUrl: '...' }
      const uploadResponse = await fetch('/api/upload-payment', {
        method: 'POST',
        body: screenshotFormData,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json().catch(() => ({ message: 'Failed to upload payment screenshot.' }));
        throw new Error(errorData.message || `Failed to upload payment: ${uploadResponse.status}`);
      }

      const uploadResult = await uploadResponse.json();
      const paymentScreenshotUrl = uploadResult.paymentScreenshotUrl;

      if (!paymentScreenshotUrl) {
        throw new Error('Payment screenshot URL not returned from upload.');
      }

      // Step 2: Create booking with all data including paymentScreenshotUrl
      if (!bookingAttemptData) {
        throw new Error('Booking data not found. Please start over.');
      }

      const finalBookingData = {
        ...bookingAttemptData,
        paymentScreenshotUrl: paymentScreenshotUrl,
      };

      const bookingResponse = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(finalBookingData),
      });

      if (!bookingResponse.ok) {
        const errorData = await bookingResponse.json().catch(() => ({ message: 'Failed to create booking.' }));
        throw new Error(errorData.message || `Failed to create booking: ${bookingResponse.status}`);
      }

      const bookingResult = await bookingResponse.json();
      setBookingId(bookingResult._id);

      setFileUploadStatus('success');
      setFileUploadMessage('Payment proof uploaded and booking confirmed!');

      setTimeout(() => {
        setStep(4);
      }, 1500); // Slightly longer delay to read confirmation

    } catch (err) {
      console.error('Error in payment and booking process:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.';
      setFileUploadStatus('error');
      setFileUploadMessage(errorMessage);
    } finally {
      setPaymentUploading(false);
    }
  };

  const handlePaymentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const screenshot = files[0];
    const validation = validatePaymentFile(screenshot);
    if (!validation.valid) {
      setFileUploadStatus('error');
      setFileUploadMessage(validation.message || 'Invalid file');
      return;
    }

    await processPaymentAndBooking(screenshot);
  };

  // Handle drag and drop file upload
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = e.dataTransfer.files;
    if (!droppedFiles || droppedFiles.length === 0) return;

    const screenshot = droppedFiles[0];
    const validation = validatePaymentFile(screenshot);
    if (!validation.valid) {
      setFileUploadStatus('error');
      setFileUploadMessage(validation.message || 'Invalid file');
      return;
    }

    await processPaymentAndBooking(screenshot);
  };

  // CSS transition style for step animations
  const getStepTransitionStyle = (currentStep: number, targetStep: number) => {
    return {
      transition: 'all 0.5s ease-in-out',
      transform: step === targetStep ? 'translateX(0)' : 'translateX(100%)',
      opacity: step === targetStep ? 1 : 0,
    };
  };

  // Helper functions for rendering UI components
  const renderProgressStepper = () => {
    const steps = [
      { number: 1, title: "Room Selection" },
      { number: 2, title: "Guest Information" },
      { number: 3, title: "Payment" },
      { number: 4, title: "Confirmation" }
    ];

    return (
      <div className="w-full mb-8">
        <div className="px-4 md:px-8 py-2">
          {/* Desktop view */}
          <div className="hidden md:flex items-center justify-between">
            {steps.map((s, i) => (
              <div key={s.number} className="flex items-center">
                <div className={`flex flex-col items-center ${i > 0 ? 'ml-4' : ''}`}>
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full ${step >= s.number ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'} transition-colors duration-300`}>
                    {step > s.number ? (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <span className="text-sm font-medium">{s.number}</span>
                    )}
                  </div>
                  <div className="mt-2 text-sm font-medium text-gray-700">{s.title}</div>
                </div>
                {i < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-4 ${step > i + 1 ? 'bg-blue-600' : 'bg-gray-200'} transition-colors duration-300`} style={{ width: '100px' }}></div>
                )}
              </div>
            ))}
          </div>
          
          {/* Mobile view */}
          <div className="flex md:hidden items-center justify-between">
            {steps.map((s) => (
              <div key={s.number} className="flex flex-col items-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= s.number ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'} transition-colors duration-300`}>
                  {step > s.number ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span className="text-xs font-medium">{s.number}</span>
                  )}
                </div>
                <div className="mt-1 text-xs font-medium text-gray-700 hidden sm:block">{s.title}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <main className="py-6 md:py-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Progress Steps */}
          {renderProgressStepper()}

          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 hover:text-blue-700 transition-colors">{property.name}</h1>
            <div className="flex items-center mt-1">
              <svg className="w-4 h-4 text-gray-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p className="text-gray-600">{property.location}</p>
            </div>
          </div>

          {/* Step 1: Room Selection */}
          {step === 1 && (
            <div 
              className="bg-white shadow-md rounded-xl overflow-hidden mb-6 transition-all duration-300 hover:shadow-lg"
              style={getStepTransitionStyle(step, 1)}
            >
              <div className="px-4 py-5 sm:px-6 border-b border-gray-200 bg-gray-50">
                <h2 className="text-xl font-semibold text-gray-900">Select Room and Dates</h2>
                <p className="mt-1 text-sm text-gray-500">Choose your preferred room and stay dates</p>
              </div>
              <div className="px-4 py-5 sm:p-6">
                {rooms.length === 0 ? (
                  <div className="text-center py-10">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    <p className="mt-2 text-gray-500">No rooms available for this property.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {rooms.map(room => (
                      <div 
                        key={room._id}
                        onClick={() => handleRoomSelection(room._id)}
                        className={`border rounded-xl overflow-hidden cursor-pointer hover:shadow-md transition-all duration-300 transform hover:-translate-y-1 ${formData.selectedRoomId === room._id ? 'ring-2 ring-blue-500 shadow-md' : 'hover:border-blue-300'}`}
                      >
                        <div className="relative h-48 sm:h-40 md:h-48 overflow-hidden">
                          {room.images && room.images.length > 0 ? (
                            <Image
                              src={room.images[0]}
                              alt={room.roomCategory || 'Room'}
                              fill
                              sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
                              style={{ objectFit: 'cover' }}
                              className="transition-transform duration-500 hover:scale-110"
                            />
                          ) : (
                            <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                              <span className="text-gray-400">No image</span>
                            </div>
                          )}
                          {room.ratePerRoom && (
                            <div className="absolute top-0 right-0 bg-blue-600 text-white px-2 py-1 text-sm font-bold rounded-bl-lg">
                              ₹{room.ratePerRoom}/night
                            </div>
                          )}
                        </div>
                        <div className="p-4">
                          <h3 className="font-medium text-gray-900 text-lg">{room.roomCategory || 'Standard Room'}</h3>
                          <div className="flex items-center mt-1 mb-2">
                            <svg className="w-4 h-4 text-gray-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            <p className="text-gray-500">Capacity: {room.capacity}</p>
                          </div>
                          <div className="flex flex-wrap gap-1 mb-3">
                            {room.amenities && room.amenities.slice(0, 3).map((amenity, idx) => (
                              <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                                {amenity}
                              </span>
                            ))}
                            {room.amenities && room.amenities.length > 3 && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-50 text-gray-600">
                                +{room.amenities.length - 3} more
                              </span>
                            )}
                          </div>
                          <div className="mt-2">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${formData.selectedRoomId === room._id ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                              {formData.selectedRoomId === room._id ? (
                                <>
                                  <svg className="mr-1 h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                  Selected
                                </>
                              ) : 'Click to select'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-8">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Select Your Stay Dates</h3>
                  <div className="border rounded-xl p-4 shadow-sm bg-white overflow-hidden overflow-x-auto">
                    <div className="flex justify-center">
                      <DateRange
                        editableDateInputs={true}
                        onChange={handleDateSelect}
                        moveRangeOnFirstSelection={false}
                        ranges={[dateRange]}
                        minDate={new Date()}
                        disabledDates={unavailableDates}
                        months={datePickerMonths}
                        direction={datePickerDirection}
                        className="border rounded-xl !w-full md:w-auto overflow-hidden"
                        rangeColors={['#2563eb']}
                        showMonthAndYearPickers={true}
                        showDateDisplay={true}
                        preventSnapRefocus={true}
                        showPreview={true}
                        monthDisplayFormat="MMMM yyyy"
                        weekdayDisplayFormat="E"
                        dayDisplayFormat="d"
                        onShownDateChange={handleMonthChange}
                      />
                    </div>
                  </div>
                  <div className="mt-4 text-sm text-gray-600">
                    {formData.checkInDate && formData.checkOutDate && (
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <p className="font-medium text-blue-700 flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          Selected dates: {formData.checkInDate.toLocaleDateString()} to {formData.checkOutDate.toLocaleDateString()} 
                          <span className="ml-1 px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs font-bold">
                            {Math.ceil((formData.checkOutDate.getTime() - formData.checkInDate.getTime()) / (1000 * 60 * 60 * 24))} nights
                          </span>
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-8 flex justify-end">
                  <button
                    type="button"
                    onClick={handleNextStep}
                    disabled={!formData.selectedRoomId || !formData.checkInDate || !formData.checkOutDate}
                    className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-300"
                  >
                    Continue to Guest Info
                    <svg className="ml-2 -mr-1 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Guest Information */}
          {step === 2 && (
            <div 
              className="bg-white shadow-md rounded-xl overflow-hidden mb-6 transition-all duration-300 hover:shadow-lg"
              style={getStepTransitionStyle(step, 2)}
            >
              <div className="px-4 py-5 sm:px-6 border-b border-gray-200 bg-gray-50">
                <h2 className="text-xl font-semibold text-gray-900">Guest Information</h2>
                <p className="mt-1 text-sm text-gray-500">Please provide your details for the booking</p>
              </div>
              <div className="px-4 py-6 sm:p-6">
                {/* Booking Summary */}
                <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <h3 className="text-md font-medium text-blue-800 mb-3 flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Booking Summary
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-gray-600 flex items-center">
                        <svg className="w-4 h-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        <span className="font-medium text-gray-700">Room:</span> 
                        <span className="ml-1">{rooms.find(r => r._id === formData.selectedRoomId)?.roomCategory || 'Standard Room'}</span>
                      </p>
                      <p className="text-gray-600 flex items-center mt-2">
                        <svg className="w-4 h-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <span className="font-medium text-gray-700">Capacity:</span> 
                        <span className="ml-1">{rooms.find(r => r._id === formData.selectedRoomId)?.capacity || '-'}</span>
                      </p>
                    </div>
                    <div>
                      {formData.checkInDate && formData.checkOutDate && (
                        <>
                          <p className="text-gray-600 flex items-center">
                            <svg className="w-4 h-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2h2a2 2 0 012 2v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-2a2 2 0 012-2h2" />
                            </svg>
                            <span className="font-medium text-gray-700">Check-in:</span> 
                            <span className="ml-1">{formData.checkInDate.toLocaleDateString()}</span>
                          </p>
                          <p className="text-gray-600 flex items-center mt-2">
                            <svg className="w-4 h-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2h2a2 2 0 012 2v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-2a2 2 0 012-2h2" />
                            </svg>
                            <span className="font-medium text-gray-700">Check-out:</span> 
                            <span className="ml-1">{formData.checkOutDate.toLocaleDateString()}</span>
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-blue-100">
                    <p className="font-medium text-blue-800 flex items-center justify-between">
                      <span>Total amount:</span>
                      <span className="text-lg">
                        ₹{
                          formData.checkInDate && formData.checkOutDate && rooms.find(r => r._id === formData.selectedRoomId)?.ratePerRoom
                            ? (rooms.find(r => r._id === formData.selectedRoomId)?.ratePerRoom || 0) * 
                              Math.ceil((formData.checkOutDate.getTime() - formData.checkInDate.getTime()) / (1000 * 60 * 60 * 24))
                            : 0
                        }
                      </span>
                    </p>
                  </div>
                </div>
                
                <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); handleNextStep(); }}>
                  <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                    <div className="sm:col-span-3">
                      <label htmlFor="guestName" className="block text-sm font-medium text-gray-700">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <input
                          type="text"
                          name="guestName"
                          id="guestName"
                          value={formData.guestName}
                          onChange={handleInputChange}
                          placeholder="John Doe"
                          className={`pl-10 block w-full border ${validationErrors.guestName ? 'border-red-300 focus:ring-red-500 focus:border-red-500 bg-red-50' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'} rounded-lg shadow-sm py-3 px-4 placeholder-gray-400 text-black focus:outline-none sm:text-sm transition duration-150 ease-in-out`}
                          required
                        />
                        {validationErrors.guestName && (
                          <p className="mt-1 text-xs text-red-600 flex items-center">
                            <svg className="h-3 w-3 mr-1 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            {validationErrors.guestName}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="sm:col-span-3">
                      <label htmlFor="guestPhone" className="block text-sm font-medium text-gray-700">
                        Phone Number <span className="text-red-500">*</span>
                      </label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                        </div>
                        <input
                          type="tel"
                          name="guestPhone"
                          id="guestPhone"
                          value={formData.guestPhone}
                          onChange={handleInputChange}
                          placeholder="+91 9876543210"
                          className={`pl-10 block w-full border ${validationErrors.guestPhone ? 'border-red-300 focus:ring-red-500 focus:border-red-500 bg-red-50' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'} rounded-lg shadow-sm py-3 px-4 placeholder-gray-400 text-black focus:outline-none sm:text-sm transition duration-150 ease-in-out`}
                          required
                        />
                        {validationErrors.guestPhone && (
                          <p className="mt-1 text-xs text-red-600 flex items-center">
                            <svg className="h-3 w-3 mr-1 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            {validationErrors.guestPhone}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="sm:col-span-6">
                      <label htmlFor="guestEmail" className="block text-sm font-medium text-gray-700">
                        Email Address <span className="text-red-500">*</span>
                      </label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <input
                          type="email"
                          name="guestEmail"
                          id="guestEmail"
                          value={formData.guestEmail}
                          onChange={handleInputChange}
                          placeholder="john.doe@example.com"
                          className={`pl-10 block w-full border ${validationErrors.guestEmail ? 'border-red-300 focus:ring-red-500 focus:border-red-500 bg-red-50' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'} rounded-lg shadow-sm py-3 px-4 placeholder-gray-400 text-black focus:outline-none sm:text-sm transition duration-150 ease-in-out`}
                          required
                        />
                        {validationErrors.guestEmail && (
                          <p className="mt-1 text-xs text-red-600 flex items-center">
                            <svg className="h-3 w-3 mr-1 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            {validationErrors.guestEmail}
                          </p>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-gray-500">We&apos;ll send your booking confirmation to this email</p>
                    </div>

                    <div className="sm:col-span-6">
                      <label htmlFor="guestAddress" className="block text-sm font-medium text-gray-700">
                        Address <span className="text-red-500">*</span>
                      </label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute top-3 left-0 pl-3 flex items-start pointer-events-none">
                          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </div>
                        <textarea
                          name="guestAddress"
                          id="guestAddress"
                          value={formData.guestAddress}
                          onChange={handleInputChange}
                          rows={3}
                          placeholder="Enter your full address"
                          className={`pl-10 block w-full border ${validationErrors.guestAddress ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'} rounded-lg shadow-sm py-3 px-4 placeholder-gray-400 text-black focus:outline-none sm:text-sm transition duration-150 ease-in-out`}
                          required
                        />
                        {validationErrors.guestAddress && (
                          <p className="mt-1 text-xs text-red-600">{validationErrors.guestAddress}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 flex items-center justify-between flex-wrap gap-4">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-300"
                    >
                      <svg className="mr-2 -ml-1 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      Back
                    </button>
                    <button
                      type="submit"
                      className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-300"
                    >
                      Proceed to Payment
                      <svg className="ml-2 -mr-1 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Step 3: Payment */}
          {step === 3 && (
            <div 
              className="bg-white shadow-md rounded-xl overflow-hidden mb-6 transition-all duration-300 hover:shadow-lg"
              style={getStepTransitionStyle(step, 3)}
            >
              <div className="px-4 py-5 sm:px-6 border-b border-gray-200 bg-gray-50">
                <h2 className="text-xl font-semibold text-gray-900">Payment Information</h2>
                <p className="mt-1 text-sm text-gray-500">Complete your booking with payment</p>
              </div>
              <div className="px-4 py-6 sm:p-6">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg mb-6 border border-blue-100 shadow-sm">
                  <h3 className="text-md font-medium text-gray-900 mb-3 flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Payment Instructions
                  </h3>
                  <ol className="list-decimal list-inside text-sm text-gray-700 space-y-3 pl-1">
                    <li className="flex items-start">
                      <span className="mr-2">1.</span>
                      <span>Make payment via UPI to the ID shown below.</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">2.</span>
                      <span>Take a screenshot of the payment confirmation.</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">3.</span>
                      <span>Upload the screenshot below to verify your payment.</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">4.</span>
                      <span>Your booking will be confirmed after verification.</span>
                    </li>
                  </ol>
                </div>

                <div className="mb-8">
                  <h3 className="text-md font-medium text-gray-900 mb-3">Payment Details</h3>
                  <div className="border rounded-lg p-5 bg-white shadow-sm">
                    <div className="flex flex-col md:flex-row md:justify-between md:items-center">
                      <div className="mb-4 md:mb-0">
                        <div className="flex items-center mb-3">
                          <svg className="w-5 h-5 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <p className="text-sm text-gray-600">
                            <span className="font-medium text-gray-700">Account Name:</span>
                            <span className="ml-1 font-mono text-gray-900">{property.bankAccountName}</span>
                          </p>
                        </div>
                        <div className="flex items-center">
                          <svg className="w-5 h-5 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3h2a3 3 0 013 3v2a3 3 0 01-3 3H6a3 3 0 01-3-3v-2a3 3 0 013-3h2" />
                          </svg>
                          <p className="text-sm text-gray-600">
                            <span className="font-medium text-gray-700">UPI ID:</span>
                            <span className="ml-1 font-mono text-gray-900">{property.upiId}</span>
                          </p>
                        </div>
                      </div>
                      
                      <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 flex flex-col items-center justify-center">
                        <div className="font-medium text-sm text-blue-800 mb-1">Scan to Pay</div>
                        <div className="w-32 h-32 bg-white p-2 rounded-lg flex items-center justify-center border border-gray-200">
                          <div className="text-center text-xs text-gray-500">
                            <svg className="w-16 h-16 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                            </svg>
                            UPI QR Code
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Selected room information */}
                    {formData.selectedRoomId && (
                      <div className="mt-6 pt-5 border-t border-gray-200">
                        <h4 className="text-sm font-medium text-gray-800 mb-3">Booking Summary</h4>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                          <div className="flex items-center justify-between sm:block">
                            <span className="text-gray-600">Room:</span>
                            <span className="font-medium text-gray-800">{rooms.find(r => r._id === formData.selectedRoomId)?.roomCategory || 'Standard Room'}</span>
                          </div>
                          {formData.checkInDate && formData.checkOutDate && (
                            <>
                              <div className="flex items-center justify-between sm:block">
                                <span className="text-gray-600">Check-in:</span>
                                <span className="font-medium text-gray-800">{formData.checkInDate.toLocaleDateString()}</span>
                              </div>
                              <div className="flex items-center justify-between sm:block">
                                <span className="text-gray-600">Check-out:</span>
                                <span className="font-medium text-gray-800">{formData.checkOutDate.toLocaleDateString()}</span>
                              </div>
                              <div className="flex items-center justify-between sm:block">
                                <span className="text-gray-600">Duration:</span>
                                <span className="font-medium text-gray-800">
                                  {Math.ceil((formData.checkOutDate.getTime() - formData.checkInDate.getTime()) / (1000 * 60 * 60 * 24))} nights
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                        
                        <div className="mt-5 pt-4 border-t border-gray-200 flex items-center justify-between">
                          <span className="text-gray-700 font-medium">Total Amount:</span>
                          <span className="text-xl font-bold text-blue-700">
                            ₹{
                              formData.checkInDate && formData.checkOutDate && rooms.find(r => r._id === formData.selectedRoomId)?.ratePerRoom
                                ? (rooms.find(r => r._id === formData.selectedRoomId)?.ratePerRoom || 0) * 
                                  Math.ceil((formData.checkOutDate.getTime() - formData.checkInDate.getTime()) / (1000 * 60 * 60 * 24))
                                : 0
                            }
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); handleNextStep(); }}>
                  <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                    <div className="sm:col-span-3">
                      <label htmlFor="guestName" className="block text-sm font-medium text-gray-700">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <input
                          type="text"
                          name="guestName"
                          id="guestName"
                          value={formData.guestName}
                          onChange={handleInputChange}
                          placeholder="John Doe"
                          className={`pl-10 block w-full border ${validationErrors.guestName ? 'border-red-300 focus:ring-red-500 focus:border-red-500 bg-red-50' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'} rounded-lg shadow-sm py-3 px-4 placeholder-gray-400 text-black focus:outline-none sm:text-sm transition duration-150 ease-in-out`}
                          required
                        />
                        {validationErrors.guestName && (
                          <p className="mt-1 text-xs text-red-600 flex items-center">
                            <svg className="h-3 w-3 mr-1 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            {validationErrors.guestName}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="sm:col-span-3">
                      <label htmlFor="guestPhone" className="block text-sm font-medium text-gray-700">
                        Phone Number <span className="text-red-500">*</span>
                      </label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                        </div>
                        <input
                          type="tel"
                          name="guestPhone"
                          id="guestPhone"
                          value={formData.guestPhone}
                          onChange={handleInputChange}
                          placeholder="+91 9876543210"
                          className={`pl-10 block w-full border ${validationErrors.guestPhone ? 'border-red-300 focus:ring-red-500 focus:border-red-500 bg-red-50' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'} rounded-lg shadow-sm py-3 px-4 placeholder-gray-400 text-black focus:outline-none sm:text-sm transition duration-150 ease-in-out`}
                          required
                        />
                        {validationErrors.guestPhone && (
                          <p className="mt-1 text-xs text-red-600 flex items-center">
                            <svg className="h-3 w-3 mr-1 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            {validationErrors.guestPhone}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="sm:col-span-6">
                      <label htmlFor="guestEmail" className="block text-sm font-medium text-gray-700">
                        Email Address <span className="text-red-500">*</span>
                      </label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <input
                          type="email"
                          name="guestEmail"
                          id="guestEmail"
                          value={formData.guestEmail}
                          onChange={handleInputChange}
                          placeholder="john.doe@example.com"
                          className={`pl-10 block w-full border ${validationErrors.guestEmail ? 'border-red-300 focus:ring-red-500 focus:border-red-500 bg-red-50' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'} rounded-lg shadow-sm py-3 px-4 placeholder-gray-400 text-black focus:outline-none sm:text-sm transition duration-150 ease-in-out`}
                          required
                        />
                        {validationErrors.guestEmail && (
                          <p className="mt-1 text-xs text-red-600 flex items-center">
                            <svg className="h-3 w-3 mr-1 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            {validationErrors.guestEmail}
                          </p>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-gray-500">We&apos;ll send your booking confirmation to this email</p>
                    </div>

                    <div className="sm:col-span-6">
                      <label htmlFor="guestAddress" className="block text-sm font-medium text-gray-700">
                        Address <span className="text-red-500">*</span>
                      </label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute top-3 left-0 pl-3 flex items-start pointer-events-none">
                          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </div>
                        <textarea
                          name="guestAddress"
                          id="guestAddress"
                          value={formData.guestAddress}
                          onChange={handleInputChange}
                          rows={3}
                          placeholder="Enter your full address"
                                                   className={`pl-10 block w-full border ${validationErrors.guestAddress ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'} rounded-lg shadow-sm py-3 px-4 placeholder-gray-400 text-black focus:outline-none sm:text-sm transition duration-150 ease-in-out`}
                          required
                        />
                        {validationErrors.guestAddress && (
                          <p className="mt-1 text-xs text-red-600">{validationErrors.guestAddress}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 flex items-center justify-between flex-wrap gap-4">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-300"
                    >
                      <svg className="mr-2 -ml-1 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      Back
                    </button>
                    <button
                      type="submit"
                      className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-300"
                    >
                      Proceed to Payment
                      <svg className="ml-2 -mr-1 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Step 3: Payment */}
          {step === 3 && (
            <div 
              className="bg-white shadow-md rounded-xl overflow-hidden mb-6 transition-all duration-300 hover:shadow-lg"
              style={getStepTransitionStyle(step, 3)}
            >
              <div className="px-4 py-5 sm:px-6 border-b border-gray-200 bg-gray-50">
                <h2 className="text-xl font-semibold text-gray-900">Payment Information</h2>
                <p className="mt-1 text-sm text-gray-500">Complete your booking with payment</p>
              </div>
              <div className="px-4 py-6 sm:p-6">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg mb-6 border border-blue-100 shadow-sm">
                  <h3 className="text-md font-medium text-gray-900 mb-3 flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Payment Instructions
                  </h3>
                  <ol className="list-decimal list-inside text-sm text-gray-700 space-y-3 pl-1">
                    <li className="flex items-start">
                      <span className="mr-2">1.</span>
                      <span>Make payment via UPI to the ID shown below.</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">2.</span>
                      <span>Take a screenshot of the payment confirmation.</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">3.</span>
                      <span>Upload the screenshot below to verify your payment.</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">4.</span>
                      <span>Your booking will be confirmed after verification.</span>
                    </li>
                  </ol>
                </div>

                <div className="mb-8">
                  <h3 className="text-md font-medium text-gray-900 mb-3">Payment Details</h3>
                  <div className="border rounded-lg p-5 bg-white shadow-sm">
                    <div className="flex flex-col md:flex-row md:justify-between md:items-center">
                      <div className="mb-4 md:mb-0">
                        <div className="flex items-center mb-3">
                          <svg className="w-5 h-5 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <p className="text-sm text-gray-600">
                            <span className="font-medium text-gray-700">Account Name:</span>
                            <span className="ml-1 font-mono text-gray-900">{property.bankAccountName}</span>
                          </p>
                        </div>
                        <div className="flex items-center">
                          <svg className="w-5 h-5 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3h2a3 3 0 013 3v2a3 3 0 01-3 3H6a3 3 0 01-3-3v-2a3 3 0 003-3h2" />
                          </svg>
                          <p className="text-sm text-gray-600">
                            <span className="font-medium text-gray-700">UPI ID:</span>
                            <span className="ml-1 font-mono text-gray-900">{property.upiId}</span>
                          </p>
                        </div>
                      </div>
                      
                      <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 flex flex-col items-center justify-center">
                        <div className="font-medium text-sm text-blue-800 mb-1">Scan to Pay</div>
                        <div className="w-32 h-32 bg-white p-2 rounded-lg flex items-center justify-center border border-gray-200">
                          <div className="text-center text-xs text-gray-500">
                            <svg className="w-16 h-16 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                            </svg>
                            UPI QR Code
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Selected room information */}
                    {formData.selectedRoomId && (
                      <div className="mt-6 pt-5 border-t border-gray-200">
                        <h4 className="text-sm font-medium text-gray-800 mb-3">Booking Summary</h4>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                          <div className="flex items-center justify-between sm:block">
                            <span className="text-gray-600">Room:</span>
                            <span className="font-medium text-gray-800">
                              {rooms.find(r => r._id === formData.selectedRoomId)?.roomCategory || 'Standard Room'}
                            </span>
                          </div>
                          {formData.checkInDate && formData.checkOutDate && (
                            <>
                              <div className="flex items-center justify-between sm:block">
                                <span className="text-gray-600">Check-in:</span>
                                <span className="font-medium text-gray-800">{formData.checkInDate.toLocaleDateString()}</span>
                              </div>
                              <div className="flex items-center justify-between sm:block">
                                <span className="text-gray-600">Check-out:</span>
                                <span className="font-medium text-gray-800">{formData.checkOutDate.toLocaleDateString()}</span>
                              </div>
                              <div className="flex items-center justify-between sm:block">
                                <span className="text-gray-600">Duration:</span>
                                <span className="font-medium text-gray-800">
                                  {Math.ceil((formData.checkOutDate.getTime() - formData.checkInDate.getTime()) / (1000 * 60 * 60 * 24))} nights
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                        
                        <div className="mt-5 pt-4 border-t border-gray-200 flex items-center justify-between">
                          <span className="text-gray-700 font-medium">Total Amount:</span>
                          <span className="text-xl font-bold text-blue-700">
                            ₹{
                              formData.checkInDate && formData.checkOutDate && rooms.find(r => r._id === formData.selectedRoomId)?.ratePerRoom
                                ? (rooms.find(r => r._id === formData.selectedRoomId)?.ratePerRoom || 0) * 
                                  Math.ceil((formData.checkOutDate.getTime() - formData.checkInDate.getTime()) / (1000 * 60 * 60 * 24))
                                : 0
                            }
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* UPI Payment Button */}
                <div className="mb-8 flex justify-center">
                  <a
                    href={`upi://pay?pa=${property.upiId}&pn=${encodeURIComponent(property.bankAccountName)}&am=${
                      formData.checkInDate && formData.checkOutDate && rooms.find(r => r._id === formData.selectedRoomId)?.ratePerRoom
                        ? (rooms.find(r => r._id === formData.selectedRoomId)?.ratePerRoom || 0) * 
                          Math.ceil((formData.checkOutDate.getTime() - formData.checkInDate.getTime()) / (1000 * 60 * 60 * 24))
                        : 0
                    }&cu=INR`}
                    className="inline-flex items-center px-8 py-4 border border-transparent text-lg font-medium rounded-lg shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-300"
                  >
                    <svg className="mr-3 -ml-1 h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 003 3h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Pay with UPI
                  </a>
                </div>

                {/* Payment Screenshot Upload */}
                <div className="mb-8">
                  <h3 className="text-md font-medium text-gray-900 mb-4">Upload Payment Screenshot</h3>
                  
                  {/* Drag and Drop Upload Area */}
                  <div
                    className={`relative border-2 border-dashed rounded-lg p-6 transition-colors duration-200 ${
                      isDragging
                        ? 'border-blue-400 bg-blue-50'
                        : fileUploadStatus === 'error'
                        ? 'border-red-300 bg-red-50'
                        : fileUploadStatus === 'success'
                        ? 'border-green-300 bg-green-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <div className="text-center">
                      {paymentUploading ? (
                        <div className="flex flex-col items-center">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
                          <p className="text-sm text-gray-600">Uploading payment screenshot...</p>
                        </div>
                      ) : (
                        <>
                          <svg
                            className={`mx-auto h-12 w-12 ${
                              fileUploadStatus === 'error'
                                ? 'text-red-400'
                                : fileUploadStatus === 'success'
                                ? 'text-green-400'
                                : 'text-gray-400'
                            }`}
                            stroke="currentColor"
                            fill="none"
                            viewBox="0 0 48 48"
                          >
                            <path
                              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                              strokeWidth={2}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                          <div className="mt-4">
                            <label htmlFor="file-upload" className="cursor-pointer">
                              <span className="mt-2 block text-sm font-medium text-gray-900">
                                {fileUploadStatus === 'success'
                                  ? 'Payment screenshot uploaded successfully!'
                                  : 'Upload payment screenshot'}
                              </span>
                              <span className="mt-1 block text-xs text-gray-500">
                                Drag and drop or click to select (PNG, JPG, JPEG, WebP up to 5MB)
                              </span>
                            </label>
                            <input
                              id="file-upload"
                              name="file-upload"
                              type="file"
                              className="sr-only"
                              accept="image/*"
                              onChange={handlePaymentUpload}
                              disabled={paymentUploading || fileUploadStatus === 'success'}
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Upload Status Messages */}
                  {fileUploadMessage && (
                    <div className={`mt-3 p-3 rounded-lg ${
                      fileUploadStatus === 'error'
                        ? 'bg-red-50 border border-red-200'
                        : fileUploadStatus === 'success'
                        ? 'bg-green-50 border border-green-200'
                        : 'bg-blue-50 border border-blue-200'
                    }`}>
                      <div className="flex">
                        <div className="flex-shrink-0">
                          {fileUploadStatus === 'error' ? (
                            <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                          ) : fileUploadStatus === 'success' ? (
                            <svg className="h-5 w-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          ) : (
                            <svg className="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          )}
                        </div>
                        <div className="ml-3">
                          <p className={`text-sm font-medium ${
                            fileUploadStatus === 'error'
                              ? 'text-red-800'
                              : fileUploadStatus === 'success'
                              ? 'text-green-800'
                              : 'text-blue-800'
                          }`}>
                            {fileUploadMessage}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-8 flex items-center justify-between flex-wrap gap-4">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-300"
                  >
                    <svg className="mr-2 -ml-1 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back
                  </button>
                  
                  {fileUploadStatus === 'success' && (
                    <p className="text-sm text-green-600 font-medium flex items-center">
                      <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Redirecting to confirmation...
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Confirmation */}
          {step === 4 && (
            <div 
              className="bg-white shadow-md rounded-xl overflow-hidden mb-6 transition-all duration-300 hover:shadow-lg"
              style={getStepTransitionStyle(step, 4)}
            >
              <div className="px-4 py-5 sm:px-6 border-b border-gray-200 bg-green-50">
                <h2 className="text-xl font-semibold text-green-600 flex items-center">
                  <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Booking Confirmed!
                </h2>
                <p className="mt-1 text-sm text-gray-600">Your booking has been successfully confirmed</p>
              </div>
              <div className="px-4 py-6 sm:p-6">
                <div className="text-center mb-8">
                  <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                    <svg className="h-8 w-8 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-medium text-gray-900 mb-2">Thank you for your booking!</h3>
                  <p className="text-gray-600">
                    Your booking has been confirmed. We&apos;ve sent the details to your email address.
                  </p>
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg inline-block mx-auto">
                    <p className="text-sm text-gray-600">
                      Your booking reference: <span className="font-mono font-medium text-gray-900">{bookingId}</span>
                    </p>
                  </div>
                </div>
                
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-5 mb-6">
                  <h4 className="text-md font-medium text-blue-800 mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Booking Details
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <h5 className="text-sm font-medium text-gray-700 mb-3 border-b pb-2">Property Information</h5>
                      <div className="space-y-2">
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                          <p className="text-sm">
                            <span className="text-gray-500">Property:</span> 
                            <span className="ml-1 font-medium text-gray-900">{property.name}</span>
                          </p>
                        </div>
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <p className="text-sm">
                            <span className="text-gray-500">Location:</span> 
                            <span className="ml-1 text-gray-900">{property.location}</span>
                          </p>
                        </div>
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          <p className="text-sm">
                            <span className="text-gray-500">Contact:</span> 
                            <span className="ml-1 text-gray-900">{property.phoneNumber}</span>
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <h5 className="text-sm font-medium text-gray-700 mb-3 border-b pb-2">Stay Information</h5>
                      <div className="space-y-2">
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                          <p className="text-sm">
                            <span className="text-gray-500">Room:</span> 
                            <span className="ml-1 font-medium text-gray-900">
                              {rooms.find(r => r._id === formData.selectedRoomId)?.roomCategory || 'Standard Room'}
                            </span>
                          </p>
                        </div>
                        {formData.checkInDate && formData.checkOutDate && (
                          <>
                            <div className="flex items-center">
                              <svg className="w-4 h-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2h2a2 2 0 012 2v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-2a2 2 0 012-2h2" />
                              </svg>
                              <p className="text-sm">
                                <span className="text-gray-500">Check-in:</span> 
                                <span className="ml-1">{formData.checkInDate.toLocaleDateString()}</span>
                              </p>
                            </div>
                            <div className="flex items-center">
                              <svg className="w-4 h-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2h2a2 2 0 012 2v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-2a2 2 0 012-2h2" />
                              </svg>
                              <p className="text-sm">
                                <span className="text-gray-500">Check-out:</span> 
                                <span className="ml-1">{formData.checkOutDate.toLocaleDateString()}</span>
                              </p>
                            </div>
                            <div className="flex items-center">
                              <svg className="w-4 h-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <p className="text-sm">
                                <span className="text-gray-500">Duration:</span> 
                                <span className="ml-1 text-gray-900">
                                  {Math.ceil((formData.checkOutDate.getTime() - formData.checkInDate.getTime()) / (1000 * 60 * 60 * 24))} nights
                                </span>
                              </p>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-5 pt-4 border-t border-blue-100">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                      <div>
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Guest Name:</span> 
                          <span className="ml-1">{formData.guestName}</span>
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          <span className="font-medium">Contact:</span> 
                          <span className="ml-1">{formData.guestPhone}</span>
                        </p>
                      </div>
                      <div className="bg-white px-4 py-3 rounded-lg shadow-sm border border-green-100">
                        <p className="text-sm text-gray-700 font-medium">Total Amount Paid</p>
                        <p className="text-xl font-bold text-green-600">
                          ₹{
                            formData.checkInDate && formData.checkOutDate && rooms.find(r => r._id === formData.selectedRoomId)?.ratePerRoom
                              ? (rooms.find(r => r._id === formData.selectedRoomId)?.ratePerRoom || 0) * 
                                Math.ceil((formData.checkOutDate.getTime() - formData.checkInDate.getTime()) / (1000 * 60 * 60 * 24))
                              : 0
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-300 w-full sm:w-auto justify-center"
                  >
                    <svg className="mr-2 -ml-1 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    Print Confirmation
                  </button>
                  <button
                    type="button"
                    onClick={() => window.location.href = '/'}
                    className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-300 w-full sm:w-auto justify-center"
                  >
                    <svg className="mr-2 -ml-1 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
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