import * as  mongoose from 'mongoose';

const Schema = mongoose.Schema;

const orderSchema = new Schema({
  fsId: {type: String, required: true},
  userId: {type: String, required: true},
});

export default mongoose.model('Order', orderSchema);
