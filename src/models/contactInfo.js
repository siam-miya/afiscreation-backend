import mongoose from 'mongoose';

const contactInfoSchema = new mongoose.Schema({
  phone: { type: String, default: '01804673487' },
  availability: { type: String, default: 'We are available 24/7, 7 days a week.' },
  email1: { type: String, default: 'customer@afiscreation.com' },
  email2: { type: String, default: 'support@afiscreation.com' },
  writeUsSubtext: { type: String, default: 'Fill out our form and we will contact you within 24 hours.' }
}, { timestamps: true });

export default mongoose.model('ContactInfo', contactInfoSchema);