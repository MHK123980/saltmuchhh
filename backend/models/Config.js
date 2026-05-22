const mongoose = require('mongoose');

const configSchema = new mongoose.Schema({
  addons: [{
    name: String,
    price: Number
  }],
  cities: [String],
  timeDuration: String,
  storeTiming: {
    startTime: { type: String, default: '15:00' },
    endTime: { type: String, default: '01:00' }
  }
});

module.exports = mongoose.model('Config', configSchema);
