const mongoose = require('mongoose');

const materialSchema = new mongoose.Schema({
  name: { type: String, required: true },
  quantity: { type: Number, default: 0 },
  unit: { type: String, default: 'kg' },
  lastUpdated: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Material', materialSchema);
