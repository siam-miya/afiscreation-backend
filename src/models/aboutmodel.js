import mongoose from 'mongoose';

const aboutSchema = new mongoose.Schema({
  storyTitle: { type: String, default: "Our Story" },
  storyParagraphs: [{ type: String }],
  aboutImage: { type: String, required: true },
  
  purposeTitle: { type: String, default: "Our Purpose" },
  purposeDescription: { type: String },

  whatWeOfferTitle: { type: String, default: "What We Offer" },
  offersList: [{ type: String }],

  whyChooseTitle: { type: String, default: "Why Afis Creation?" },
  whyChooseList: [{ type: String }],

  promiseTitle: { type: String, default: "Our Promise" },
  promiseDescription: { type: String }
}, { timestamps: true });

const About = mongoose.models.About || mongoose.model('About', aboutSchema);
export default About;