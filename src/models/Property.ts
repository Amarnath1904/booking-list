import mongoose, { Schema, Document } from 'mongoose';

export interface IProperty extends Document {
  hostId: string; // Firebase UID of the host
  name: string;
  location: string;
  numberOfRooms: string;
  pricingType: 'perRoom' | 'perPerson';
  pricePerUnit: number;
  description?: string;
  amenities?: string[];
  images?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const PropertySchema: Schema = new Schema(
  {
    hostId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    location: { type: String, required: true },
    numberOfRooms: { type: String, required: true },
    pricingType: { 
      type: String,
      enum: ['perRoom', 'perPerson'],
      default: 'perRoom',
      required: true
    },
    pricePerUnit: { type: Number, required: true, default: 1000 },
    description: { type: String },
    amenities: [{ type: String }],
    images: [{ type: String }],
  },
  { timestamps: true }
);

// Check if model already exists to prevent OverwriteModelError in development with hot reload
const Property = mongoose.models.Property || mongoose.model<IProperty>('Property', PropertySchema);
export default Property;
