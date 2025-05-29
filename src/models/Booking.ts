import mongoose, { Schema, Document, Model } from 'mongoose';

export enum BookingStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  REJECTED = 'rejected'
}

export interface IBooking extends Document {
  propertyId: mongoose.Types.ObjectId;
  roomId: mongoose.Types.ObjectId;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  guestAddress: string;
  checkInDate: Date;
  checkOutDate: Date;
  paymentScreenshotUrl: string;
  bookingStatus: BookingStatus;
  bookingCode: string; // Unique code for booking reference
  createdAt: Date;
  updatedAt: Date;
}

const BookingSchema: Schema = new Schema(
  {
    propertyId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Property', 
      required: true, 
      index: true 
    },
    roomId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Room', 
      required: true, 
      index: true 
    },
    guestName: { 
      type: String, 
      required: true 
    },
    guestEmail: { 
      type: String, 
      required: true 
    },
    guestPhone: { 
      type: String, 
      required: true 
    },
    guestAddress: { 
      type: String, 
      required: true 
    },
    checkInDate: { 
      type: Date, 
      required: true 
    },
    checkOutDate: { 
      type: Date, 
      required: true 
    },
    paymentScreenshotUrl: { 
      type: String, 
      required: true 
    },
    bookingStatus: { 
      type: String, 
      enum: Object.values(BookingStatus), 
      default: BookingStatus.PENDING, 
      required: true 
    },
    bookingCode: {
      type: String,
      required: true,
      unique: true
    }
  },
  { timestamps: true }
);

// Fix for Next.js hot reloading issue
let BookingModel: Model<IBooking>;

try {
  // Try to get the existing model to prevent OverwriteModelError
  BookingModel = mongoose.model<IBooking>('Booking');
} catch {
  // If the model doesn't exist yet, create a new one
  BookingModel = mongoose.model<IBooking>('Booking', BookingSchema);
}

export default BookingModel;
