import mongoose from "mongoose";


const settingsSchema = new mongoose.Schema(
    {
        enableFloatingHub: {
            type: Boolean,
            default: true,
        },

        enableWhatsapp: {
            type: Boolean,
            default: true,
        },

        whatsappNumber: {
            type: String,
            default: "",
            trim: true,
        },

        enableMessenger: {
            type: Boolean,
            default: true,
        },

        messengerUsername: {
            type: String,
            default: "",
            trim: true,
        },

        enablePhoneCall: {
            type: Boolean,
            default: true,
        },

        phoneNumber: {
            type: String,
            default: "",
            trim: true,
        },

        enableEmail: {
            type: Boolean,
            default: true,
        },

        supportEmail: {
            type: String,
            default: "",
            trim: true,
        },


        // General

        siteName: {
            type: String,
            default: "",
            trim: true,
        },

        siteTagline: {
            type: String,
            default: "",
            trim: true,
        },

        logo: {
            type: String,
            default: "",
        },

        favicon: {
            type: String,
            default: "",
        },


        // Top Bar

        topbarEnabled: {
            type: Boolean,
            default: true,
        },

        topbarPhone: {
            type: String,
            default: "",
            trim: true,
        },

        topbarText: {
            type: String,
            default: "",
            trim: true,
        },


        // Footer

        footerAddress: {
            type: String,
            default: "",
            trim: true,
        },

        footerPhone: {
            type: String,
            default: "",
            trim: true,
        },

        footerPhone2: {
            type: String,
            default: "",
            trim: true,
        },

        footerEmail: {
            type: String,
            default: "",
            trim: true,
        },

        footerCopyright: {
            type: String,
            default: "",
            trim: true,
        },


        // Social Links

        facebook: {
            type: String,
            default: "",
            trim: true,
        },

        instagram: {
            type: String,
            default: "",
            trim: true,
        },

        youtube: {
            type: String,
            default: "",
            trim: true,
        },


        // SEO

        metaTitle: {
            type: String,
            default: "",
            trim: true,
        },

        metaDescription: {
            type: String,
            default: "",
            trim: true,
        },

        googleAnalyticsId: {
            type: String,
            default: "",
            trim: true,
        },

        facebookPixelId: {
            type: String,
            default: "",
            trim: true,
        },

    },

    {
        timestamps: true,
    }

);


const Settings =
    mongoose.models.Settings ||
    mongoose.model(
        "Settings",
        settingsSchema
    );


export default Settings;