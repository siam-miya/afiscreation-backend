import ShippingZone from "../models/ShippingZoneModel.js";

// Create Shipping Zone
const createShippingZone = async (req, res) => {
  try {
    const {
      name,
      slug,
      note,
      rate,
      freeAbove,
      minDays,
      maxDays,
      position,
      isActive,
      isDefault,
    } = req.body;

    if (!name || !slug) {
      return res.status(400).json({
        success: false,
        message: "Name and slug are required",
      });
    }

    if (Number(minDays) > Number(maxDays)) {
      return res.status(400).json({
        success: false,
        message: "Minimum days cannot be greater than maximum days",
      });
    }

    const existingName = await ShippingZone.findOne({
      name: name.trim(),
    });

    if (existingName) {
      return res.status(409).json({
        success: false,
        message: "Shipping zone name already exists",
      });
    }

    const existingSlug = await ShippingZone.findOne({
      slug: slug.trim().toLowerCase(),
    });

    if (existingSlug) {
      return res.status(409).json({
        success: false,
        message: "Shipping zone slug already exists",
      });
    }

    // If new zone is default, remove default from others
    if (isDefault === true) {
      await ShippingZone.updateMany(
        {},
        {
          $set: {
            isDefault: false,
          },
        }
      );
    }

    const shippingZone = await ShippingZone.create({
      name: name.trim(),
      slug: slug.trim().toLowerCase(),
      note: note?.trim() || "",
      rate: Number(rate) || 0,
      freeAbove: Number(freeAbove) || 0,
      minDays: Number(minDays) || 0,
      maxDays: Number(maxDays) || 0,
      position: Number(position) || 0,
      isActive: isActive !== false,
      isDefault: isDefault === true,
    });

    res.status(201).json({
      success: true,
      message: "Shipping zone created successfully",
      data: shippingZone,
    });
  } catch (error) {
    console.error("Create Shipping Zone Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create shipping zone",
      error: error.message,
    });
  }
};


// Get All Shipping Zones
const getShippingZones = async (req, res) => {
  try {
    const {
      search = "",
      page = 1,
      limit = 10,
    } = req.query;

    const pageNumber = Math.max(Number(page), 1);
    const limitNumber = Math.max(Number(limit), 1);
    const skip = (pageNumber - 1) * limitNumber;

    const filter = {};

    if (search.trim()) {
      filter.$or = [
        {
          name: {
            $regex: search.trim(),
            $options: "i",
          },
        },
        {
          slug: {
            $regex: search.trim(),
            $options: "i",
          },
        },
        {
          note: {
            $regex: search.trim(),
            $options: "i",
          },
        },
      ];
    }

    const total = await ShippingZone.countDocuments(filter);

    const zones = await ShippingZone.find(filter)
      .sort({
        position: 1,
        createdAt: -1,
      })
      .skip(skip)
      .limit(limitNumber);

    res.status(200).json({
      success: true,
      data: zones,
      pagination: {
        total,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(total / limitNumber),
      },
    });
  } catch (error) {
    console.error("Get Shipping Zones Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to get shipping zones",
      error: error.message,
    });
  }
};


// Get Single Shipping Zone
const getShippingZoneById = async (req, res) => {
  try {
    const zone = await ShippingZone.findById(req.params.id);

    if (!zone) {
      return res.status(404).json({
        success: false,
        message: "Shipping zone not found",
      });
    }

    res.status(200).json({
      success: true,
      data: zone,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get shipping zone",
      error: error.message,
    });
  }
};


// Update Shipping Zone
const updateShippingZone = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      name,
      slug,
      note,
      rate,
      freeAbove,
      minDays,
      maxDays,
      position,
      isActive,
      isDefault,
    } = req.body;

    if (!name || !slug) {
      return res.status(400).json({
        success: false,
        message: "Name and slug are required",
      });
    }

    if (Number(minDays) > Number(maxDays)) {
      return res.status(400).json({
        success: false,
        message: "Minimum days cannot be greater than maximum days",
      });
    }

    const currentZone = await ShippingZone.findById(id);

    if (!currentZone) {
      return res.status(404).json({
        success: false,
        message: "Shipping zone not found",
      });
    }

    const duplicateName = await ShippingZone.findOne({
      name: name.trim(),
      _id: { $ne: id },
    });

    if (duplicateName) {
      return res.status(409).json({
        success: false,
        message: "Shipping zone name already exists",
      });
    }

    const duplicateSlug = await ShippingZone.findOne({
      slug: slug.trim().toLowerCase(),
      _id: { $ne: id },
    });

    if (duplicateSlug) {
      return res.status(409).json({
        success: false,
        message: "Shipping zone slug already exists",
      });
    }

    // If this zone becomes default
    if (isDefault === true) {
      await ShippingZone.updateMany(
        {
          _id: { $ne: id },
        },
        {
          $set: {
            isDefault: false,
          },
        }
      );
    }

    const updatedZone = await ShippingZone.findByIdAndUpdate(
      id,
      {
        name: name.trim(),
        slug: slug.trim().toLowerCase(),
        note: note?.trim() || "",
        rate: Number(rate) || 0,
        freeAbove: Number(freeAbove) || 0,
        minDays: Number(minDays) || 0,
        maxDays: Number(maxDays) || 0,
        position: Number(position) || 0,
        isActive: isActive !== false,
        isDefault: isDefault === true,
      },
      {
        new: true,
        runValidators: true,
      }
    );

    res.status(200).json({
      success: true,
      message: "Shipping zone updated successfully",
      data: updatedZone,
    });
  } catch (error) {
    console.error("Update Shipping Zone Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update shipping zone",
      error: error.message,
    });
  }
};


// Delete Shipping Zone
const deleteShippingZone = async (req, res) => {
  try {
    const { id } = req.params;

    const zone = await ShippingZone.findById(id);

    if (!zone) {
      return res.status(404).json({
        success: false,
        message: "Shipping zone not found",
      });
    }

    await ShippingZone.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Shipping zone deleted successfully",
    });
  } catch (error) {
    console.error("Delete Shipping Zone Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete shipping zone",
      error: error.message,
    });
  }
};


// Toggle Active Status
const toggleShippingZoneStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const zone = await ShippingZone.findById(id);

    if (!zone) {
      return res.status(404).json({
        success: false,
        message: "Shipping zone not found",
      });
    }

    zone.isActive = !zone.isActive;

    await zone.save();

    res.status(200).json({
      success: true,
      message: `Shipping zone ${
        zone.isActive ? "activated" : "deactivated"
      } successfully`,
      data: zone,
    });
  } catch (error) {
    console.error("Toggle Shipping Zone Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update shipping zone status",
      error: error.message,
    });
  }
};


// Set Default Shipping Zone
const setDefaultShippingZone = async (req, res) => {
  try {
    const { id } = req.params;

    const zone = await ShippingZone.findById(id);

    if (!zone) {
      return res.status(404).json({
        success: false,
        message: "Shipping zone not found",
      });
    }

    await ShippingZone.updateMany(
      {},
      {
        $set: {
          isDefault: false,
        },
      }
    );

    zone.isDefault = true;

    await zone.save();

    res.status(200).json({
      success: true,
      message: "Default shipping zone updated successfully",
      data: zone,
    });
  } catch (error) {
    console.error("Set Default Shipping Zone Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to set default shipping zone",
      error: error.message,
    });
  }
};


export {
  createShippingZone,
  getShippingZones,
  getShippingZoneById,
  updateShippingZone,
  deleteShippingZone,
  toggleShippingZoneStatus,
  setDefaultShippingZone,
};