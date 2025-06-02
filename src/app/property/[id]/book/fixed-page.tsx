'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { DateRange, RangeKeyDict } from 'react-date-range';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';

// Import types
import type { Property, Room, BookingFormData } from '../../../types/room';

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
        const windowWidth = window.innerWidth;
        
        // Adjust based on screen size
        if (windowWidth < 480) {
          // Very small screens - show single month in vertical layout
          setDatePickerMonths(1);
          setDatePickerDirection('vertical');
        } else if (windowWidth < 768) {
          // Medium small screens - show single month but still horizontal
          setDatePickerMonths(1);
          setDatePickerDirection('horizontal');
        } else {
          // Larger screens - show two months in horizontal layout
          setDatePickerMonths(2);
          setDatePickerDirection('horizontal');
        }
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
    startDate: new Date(), // Start with today's date
    endDate: new Date(new Date().setDate(new Date().getDate() + 1)), // Default to next day checkout
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
    // Create a new Date object to avoid reference issues
    const newDate = new Date(date);
    
    // Always update the current month without restrictions for navigation
    // This ensures users can navigate forward to future months
    setCurrentMonth(newDate);
    
    // Fetch new availability data for this month
    // (This will be handled by the useEffect that depends on currentMonth)
  };

  const handleDateSelect = (ranges: RangeKeyDict) => {
    const { selection } = ranges;
    if (selection.startDate && selection.endDate) {
      // Ensure we're not selecting dates in the past
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Use today as the minimum startDate if the selected date is in the past
      const startDate = selection.startDate < today ? today : selection.startDate;
      
      // Update the date range
      setDateRange({
        startDate: startDate,
        endDate: selection.endDate,
        key: 'selection'
      });
      
      // Update current month when user selects a date
      // This is important for fetching availability data
      setCurrentMonth(new Date(startDate));
      
      // Update form data with selected dates
      setFormData(prev => ({
        ...prev,
        checkInDate: startDate || null,
        checkOutDate: selection.endDate || null
      }));
    }
  };

  // Placeholder for other handler functions
  const handleRoomSelection = (roomId: string) => {
    // Handle room selection logic here
  };
  
  const handleInputChange = (e: any) => {
    // Handle input change logic here
  };
  
  const handleNextStep = () => {
    // Handle next step logic here
  };
  
  const handleDragOver = (e: any) => {
    // Handle drag over logic here
  };
  
  const handleDragLeave = (e: any) => {
    // Handle drag leave logic here
  };
  
  const handleDrop = (e: any) => {
    // Handle drop logic here
  };
  
  const handlePaymentUpload = (e: any) => {
    // Handle payment upload logic here
  };
  
  const getStepTransitionStyle = (currentStep: number, step: number) => {
    // Return transition style based on steps
    return {};
  };
  
  const renderProgressStepper = () => {
    // Return progress stepper JSX
    return <div>Progress Steps</div>;
  };

  // For demonstration, return a simple component showing the calendar with responsive settings
  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Calendar Test</h1>
      <div className="border rounded-xl p-4 shadow-sm bg-white">
        <div className="flex justify-center">
          <div className="w-full overflow-auto md:overflow-visible">
            <DateRange
              editableDateInputs={true}
              onChange={handleDateSelect}
              moveRangeOnFirstSelection={false}
              ranges={[dateRange]}
              minDate={new Date()} // This ensures dates before today are disabled
              disabledDates={unavailableDates}
              months={datePickerMonths}
              direction={datePickerDirection}
              className="w-full"
              rangeColors={['#2563eb']}
              showMonthAndYearPickers={true}
              showDateDisplay={true}
              preventSnapRefocus={true}
              showPreview={true}
              monthDisplayFormat="MMMM yyyy"
              weekdayDisplayFormat="E"
              dayDisplayFormat="d"
              onShownDateChange={handleMonthChange}
              shownDate={currentMonth}
              navigatorRenderer={(currentFocusedDate, changeShownDate) => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                
                // Calculate if previous month button should be disabled
                // We need to check if the previous month would contain any valid dates
                const prevMonth = new Date(currentMonth);
                prevMonth.setMonth(prevMonth.getMonth() - 1);
                const lastDayOfPrevMonth = new Date(prevMonth.getFullYear(), prevMonth.getMonth() + 1, 0);
                const isPrevMonthDisabled = lastDayOfPrevMonth < today;
                
                // Allow unlimited forward navigation - no restrictions
                // Next button is always enabled
                const isNextMonthDisabled = false;
                
                return (
                  <div className="flex items-center justify-between px-4 py-2">
                    <button
                      onClick={(e) => {
                        e.preventDefault(); // Prevent any default behavior
                        e.stopPropagation(); // Stop event propagation
                        
                        // Only allow navigation to previous month if it contains valid dates
                        if (!isPrevMonthDisabled) {
                          const prevMonth = new Date(currentMonth);
                          prevMonth.setMonth(prevMonth.getMonth() - 1);
                          handleMonthChange(prevMonth);
                          changeShownDate(prevMonth);
                        }
                      }}
                      className={`p-1 rounded-full ${!isPrevMonthDisabled ? 'hover:bg-gray-100 text-gray-600' : 'text-gray-300 cursor-not-allowed'}`}
                      aria-label="Previous month"
                      disabled={isPrevMonthDisabled}
                      type="button"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <span className="text-sm font-medium">
                      {currentFocusedDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </span>
                    <button
                      onClick={(e) => {
                        e.preventDefault(); // Prevent any default behavior
                        e.stopPropagation(); // Stop event propagation
                        
                        // Allow navigation to any future month
                        const nextMonth = new Date(currentMonth);
                        nextMonth.setMonth(nextMonth.getMonth() + 1);
                        
                        // First update our state
                        handleMonthChange(nextMonth);
                        
                        // Then update the calendar component's view
                        changeShownDate(nextMonth);
                      }}
                      className="p-1 rounded-full hover:bg-gray-100 text-gray-600"
                      aria-label="Next month"
                      type="button"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                );
              }}
            />
          </div>
        </div>
      </div>
      
      <div className="mt-4">
        <p className="text-gray-600">Selected range: {dateRange.startDate.toLocaleDateString()} - {dateRange.endDate.toLocaleDateString()}</p>
      </div>
    </div>
  );
}
