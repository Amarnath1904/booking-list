import mongoose, { Schema, Document } from 'mongoose';

export interface IRoomCategory extends Document {
  propertyId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const RoomCategorySchema: Schema = new Schema(
  {
    propertyId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Property', 
      required: true, 
      index: true 
    },
    name: { 
      type: String, 
      required: true 
    },
    description: { 
      type: String 
    }
  },
  { timestamps: true }
);

// Add a compound index to ensure unique categories per property
RoomCategorySchema.index({ propertyId: 1, name: 1 }, { unique: true });

// Fix for Next.js hot reloading issue
let RoomCategoryModel: mongoose.Model<IRoomCategory>;

try {
  // Try to get the existing model to prevent OverwriteModelError
  RoomCategoryModel = mongoose.model<IRoomCategory>('RoomCategory');
} catch {
  // If the model doesn't exist yet, create a new one
  RoomCategoryModel = mongoose.model<IRoomCategory>('RoomCategory', RoomCategorySchema);
}

export default RoomCategoryModel;
