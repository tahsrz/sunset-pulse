import { Schema, model, models } from 'mongoose';

const UserSchema = new Schema(
  {
    email: {
      type: String,
      unique: [true, 'Email already exists'],
      required: [true, 'Email is required'],
    },
    username: {
      type: String,
      required: [true, 'Username is required'],
    },
    image: {
      type: String,
    },
    bookmarks: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Property',
      },
    ],
    savedSearches: [
      {
        query: { type: Map, of: String },
        alertFrequency: { type: String, enum: ['daily', 'weekly', 'instant'], default: 'daily' },
        createdAt: { type: Date, default: Date.now }
      }
    ],
    crmStatus: {
      type: String,
      enum: ['Lead', 'Active', 'Closed', 'Archived'],
      default: 'Lead'
    },
    crmNotes: [
      {
        note: String,
        date: { type: Date, default: Date.now }
      }
    ]
  },
  {
    timestamps: true,
  }
);

const User = models.User || model('User', UserSchema);

export default User;
