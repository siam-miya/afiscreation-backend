import About from '../models/aboutmodel.js';

// Get About Page Data
export const getAbout = async (req, res) => {
  try {
    const about = await About.findOne();
    res.status(200).json({ success: true, data: about });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update / Create About Page Data (Admin)
export const updateAbout = async (req, res) => {
  try {
    let updateData = { ...req.body };

    if (typeof updateData.storyParagraphs === 'string') {
      updateData.storyParagraphs = JSON.parse(updateData.storyParagraphs);
    }
    if (typeof updateData.offersList === 'string') {
      updateData.offersList = JSON.parse(updateData.offersList);
    }
    if (typeof updateData.whyChooseList === 'string') {
      updateData.whyChooseList = JSON.parse(updateData.whyChooseList);
    }

    if (req.file) {
      updateData.aboutImage = req.file.path || `/uploads/${req.file.filename}`;
    }

    const about = await About.findOneAndUpdate({}, updateData, {
      new: true,
      upsert: true,
      runValidators: true
    });

    res.status(200).json({ 
      success: true, 
      data: about, 
      message: "About details updated successfully" 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};