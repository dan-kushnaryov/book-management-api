import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IBook extends Document {
  title: string;
  author: string;
  authorCountry: string;
  publishedDate: Date;
  pages: number;
  library: Types.ObjectId;
  score: number;
}

const bookSchema = new Schema<IBook>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    author: {
      type: String,
      required: true,
      trim: true,
    },
    authorCountry: {
      type: String,
      required: true,
      trim: true,
    },
    publishedDate: {
      type: Date,
      required: true,
    },
    pages: {
      type: Number,
      required: true,
      min: 1,
    },
    library: {
      type: Schema.Types.ObjectId,
      ref: 'Library',
      required: true,
    },
    score: {
      type: Number,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

bookSchema.index({ library: 1 });
bookSchema.index({ author: 1 });
bookSchema.index({ authorCountry: 1 });
bookSchema.index({ library: 1, authorCountry: 1, score: -1 });

export const Book = mongoose.model<IBook>('Book', bookSchema);
