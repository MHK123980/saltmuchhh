const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderNumber: { type: Number, unique: true },
  customerDetails: {
    fullName: String,
    phoneNo: String,
    houseNo: String,
    streetName: String,
    areaName: String,
    city: String
  },
  items: [{
    productId: mongoose.Schema.Types.ObjectId,
    productName: String,
    quantity: Number,
    orderQuantity: { type: Number, default: 1 },
    unitPrice: Number,
    price: Number,
    selectedAddons: [{
      name: String,
      price: Number,
      quantity: { type: Number, default: 1 }
    }]
  }],
  totalPrice: Number,
  status: {
    type: String,
    default: 'Pending'
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Order', orderSchema);
