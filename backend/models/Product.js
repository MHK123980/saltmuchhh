const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: String,
  description: String,
  allowAddons: { type: Boolean, default: true },
  images: { type: [String], default: [] },
  variants: [{
    quantity: Number,
    price: Number
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Product', productSchema);
