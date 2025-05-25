import mongoose, { Schema, Document } from 'mongoose';
import { UserRole } from '@/constants/userRoles';

export interface IUser extends Document {
  firebaseUid: string;
  email: string;
  displayName?: string;
  role: UserRole;
  propertyName?: string;
  location?: string;
  phoneNumber?: string;
  alternateNumber?: string;
  upiId?: string;
  bankAccountName?: string;
  numberOfRooms?: string;
  pricingAmount?: string;
  pricingType?: 'perRoom' | 'perPerson';
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema(
  {    firebaseUid: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    displayName: { type: String },
    role: { 
      type: String, 
      enum: Object.values(UserRole), 
      required: true,
      default: UserRole.AGENT 
    },
    // Host properties
    propertyName: { type: String },
    location: { type: String },
    phoneNumber: { type: String },
    alternateNumber: { type: String },
    upiId: { type: String },
    bankAccountName: { type: String },
    numberOfRooms: { type: String },
    pricingAmount: { type: String },
    pricingType: { 
      type: String,
      enum: ['perRoom', 'perPerson'],
      default: 'perRoom'
    },
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
