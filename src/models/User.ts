import mongoose, { Schema, Document } from 'mongoose';
import { UserRole } from '@/constants/userRoles';

export interface IUser extends Document {
  firebaseUid: string;
  email: string;
  displayName?: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema(
  {    
    firebaseUid: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    displayName: { type: String },    role: { 
      type: String, 
      enum: Object.values(UserRole), 
      required: true,
      default: UserRole.AGENT 
    }
  },  { timestamps: true }
);

// Fix for Next.js hot reloading issue
let UserModel: mongoose.Model<IUser>;

try {
  // Try to get the existing model to prevent OverwriteModelError
  UserModel = mongoose.model<IUser>('User');
} catch {
  // If the model doesn't exist yet, create a new one
  UserModel = mongoose.model<IUser>('User', UserSchema);
}

export default UserModel;
