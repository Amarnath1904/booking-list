import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IProperty extends Document {
  hostId: string; // Firebase UID of the host
  name: string;
  location: string;
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
    images: [{ type: String }],
    phoneNumber: { type: String, required: true },
    alternateNumber: { type: String },
    upiId: { type: String, required: true },
    bankAccountName: { type: String, required: true }
  },
  { timestamps: true }
);

// Fix for Next.js hot reloading issue
let PropertyModel: Model<IProperty>;

try {
  // Try to get the existing model to prevent OverwriteModelError
  PropertyModel = mongoose.model<IProperty>('Property');
} catch {
  // If the model doesn't exist yet, create a new one
  PropertyModel = mongoose.model<IProperty>('Property', PropertySchema);
}

export default PropertyModel;
