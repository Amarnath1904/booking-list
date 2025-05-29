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

// Check if model already exists to prevent OverwriteModelError in development with hot reload
const RoomCategory = mongoose.models.RoomCategory || mongoose.model<IRoomCategory>('RoomCategory', RoomCategorySchema);
export default RoomCategory;
