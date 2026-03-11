import mongoose, { Document, Schema } from 'mongoose';

export interface ILibrary extends Document {
  name: string;
  location: string;
}

const librarySchema = new Schema<ILibrary>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Library = mongoose.model<ILibrary>('Library', librarySchema);
