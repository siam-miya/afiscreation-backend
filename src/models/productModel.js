import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({

  title: {
    type: String,
    required: true,
    trim: true,
    index: true
  },

  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },

  description: {
    type: String,
    required: true
  },

  shortDescription: {
    type: String,
    trim: true
  },

  // Professional Financial & Inventory Fields

  price: {
    type: Number,
    required: true,
    index: true
  },

  costPrice: {
    type: Number,
    default: 0
  },

  discountPrice: {
    type: Number,
    default: 0
  },

  sku: {
    type: String,
    trim: true
  },

  stock: {
    type: Number,
    required: true,
    default: 0
  },

  category: {
    type: String,
    required: true,
    index: true
  },

  // Brand

  brand: {
    type: String,
    trim: true,
    default: ''
  },

  // SEO Meta Fields

  metaTitle: {
    type: String,
    trim: true
  },

  metaDescription: {
    type: String,
    trim: true
  },

  // Images

  thumbnail: {
    type: String,
    required: true
  },

  // Thumbnail Color

  thumbnailColor: {

    name: {
      type: String,
      trim: true,
      lowercase: true
    },

    code: {
      type: String,
      trim: true,
      uppercase: true
    }

  },

  images: [
    {
      type: String
    }
  ],

  sizeChartImage: {
    type: String
  },

  // Colors & Color Images

  colors: [{

    name: {
      type: String,
      trim: true,
      lowercase: true
    },

    code: {
      type: String,
      trim: true,
      uppercase: true
    },

    images: [
      {
        type: String
      }
    ]

  }],

  sizes: [
    {
      type: String,
      trim: true
    }
  ],

  // Custom Product Measurement

  hasCustomSize: {
    type: Boolean,
    default: false
  },

  customizationUnit: {
    type: String,
    enum: ['inch', 'cm'],
    default: 'inch'
  },

  // Section Flags

  isFlashSale: {
    type: Boolean,
    default: false
  },

  flashSaleExpiresAt: {
    type: Date
  },

  isBestSelling: {
    type: Boolean,
    default: false
  },

  isHotProductBanner: {
    type: Boolean,
    default: false
  },

  isHotProductSection2: {
    type: Boolean,
    default: false
  },

  isExploreProduct: {
    type: Boolean,
    default: true
  }

}, {
  timestamps: true
});


// Color filtering index

productSchema.index({
  "colors.name": 1,
  "colors.code": 1
});

productSchema.index({
  "colors.name": 1,
  category: 1,
  price: 1
});


export default mongoose.models.Product ||
  mongoose.model('Product', productSchema);