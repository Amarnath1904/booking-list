import mongoose, { Schema, Document } from 'mongoose';
import { PricingType, RoomCapacity } from '@/types/room';

export interface IRoom extends Document {
  propertyId: mongoose.Types.ObjectId;
  pricingType: PricingType;
  roomCategory?: string;
  ratePerRoom?: number;
  capacity: RoomCapacity;
  amenities: string[];
  images: string[];
  extraPersonCharge?: number;
  agentCommission?: number;
  advanceAmount?: number;
  createdAt: Date;
  updatedAt: Date;
}

const RoomSchema: Schema = new Schema(
  {
    propertyId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Property', 
      required: true, 
      index: true 
    },
    pricingType: { 
      type: String, 
      enum: Object.values(PricingType), 
      required: true 
    },
    roomCategory: { 
      type: String 
    },
    ratePerRoom: { 
      type: Number 
    },
    capacity: { 
      type: String, 
      enum: Object.values(RoomCapacity), 
      required: true 
    },
    amenities: [{ 
      type: String 
    }],
    images: [{ 
      type: String 
    }],
    extraPersonCharge: { 
      type: Number 
    },
    agentCommission: { 
      type: Number 
    },
    advanceAmount: { 
      type: Number 
    }
  },  { timestamps: true }
);

// Fix for Next.js hot reloading issue
let RoomModel: mongoose.Model<IRoom>;

try {
  // Try to get the existing model to prevent OverwriteModelError
  RoomModel = mongoose.model<IRoom>('Room');
} catch {
  // If the model doesn't exist yet, create a new one
  RoomModel = mongoose.model<IRoom>('Room', RoomSchema);
}

export default RoomModel;
