import express from 'express';
import ContactInfo from '../models/contactInfo.js';
import ContactMessage from '../models/contactMessage.js';

const router = express.Router();

// ১. কনট্যাক্ট ইনফরমেশন পাওয়া (/api/contact অথবা /api/contact/info)
const getContactInfo = async (req, res) => {
  try {
    let info = await ContactInfo.findOne();
    if (!info) {
      info = await ContactInfo.create({});
    }
    res.status(200).json({ success: true, data: info });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

router.get('/', getContactInfo);
router.get('/info', getContactInfo);

// ২. কনট্যাক্ট ইনফরমেশন আপডেট করা (/api/contact অথবা /api/contact/info)
const updateContactInfo = async (req, res) => {
  try {
    let info = await ContactInfo.findOne();
    if (!info) {
      info = new ContactInfo(req.body);
    } else {
      Object.assign(info, req.body);
    }
    await info.save();
    res.status(200).json({ success: true, message: 'Contact info updated successfully!', data: info });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

router.put('/', updateContactInfo);
router.put('/info', updateContactInfo);

// ৩. নতুন মেসেজ সাবমিট করা (ইউজার) -> /api/contact/message
router.post('/message', async (req, res) => {
  try {
    const { name, email, phone, message } = req.body;
    if (!name || !email || !phone || !message) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }
    const newMessage = await ContactMessage.create({ name, email, phone, message });
    res.status(201).json({ success: true, message: 'Message sent successfully!', data: newMessage });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ৪. সব মেসেজ দেখা (অ্যাডমিন) -> /api/contact/messages
router.get('/messages', async (req, res) => {
  try {
    const messages = await ContactMessage.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: messages });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ৫. মেসেজ ডিলিট করা (অ্যাডমিন) -> /api/contact/messages/:id
router.delete('/messages/:id', async (req, res) => {
  try {
    await ContactMessage.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Message deleted successfully!' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;