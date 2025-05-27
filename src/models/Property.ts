import mongoose, { Schema, Document } from 'mongoose';

export interface IProperty extends Document {
  hostId: string; // Firebase UID of the host
  name: string;
  location: string;
  numberOfRooms: string;
  images?: string[];
  phoneNumber: string;
  alternateNumber?: string;
  upiId: string;
  bankAccountName: string;
  createdAt: Date;
  updatedAt: Date;
}

const PropertySchema: Schema = new Schema(
  {
    hostId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    location: { type: String, required: true },
    numberOfRooms: { type: String, required: true },
    images: [{ type: String }],
    phoneNumber: { type: String, required: true },
    alternateNumber: { type: String },
    upiId: { type: String, required: true },
    bankAccountName: { type: String, required: true }
  },
  { timestamps: true }
);

// Check if model already exists to prevent OverwriteModelError in development with hot reload
const Property = mongoose.models.Property || mongoose.model<IProperty>('Property', PropertySchema);
export default Property;
