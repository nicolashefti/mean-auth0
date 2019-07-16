import * as  mongoose from 'mongoose';

const Schema = mongoose.Schema;

const rsvpSchema = new Schema({
  userId: { type: String, required: true },
  name: { type: String, required: true },
  eventId: { type: String, required: true },
  attending: { type: Boolean, required: true },
  guests: Number,
  comments: String
});

export default mongoose.model('Rsvp', rsvpSchema);
