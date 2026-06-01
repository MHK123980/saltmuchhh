const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const Config = require('../models/Config');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Material = require('../models/Material');
const Counter = require('../models/Counter');

const JWT_SECRET = process.env.JWT_SECRET || 'saltmuchhh_jwt_secure_secret_fallback_key';
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Admin Login
router.post('/admin/login', (req, res) => {
  const { id, password } = req.body;
  if (id === 'admin@saltmuchhh' && password === 'saltmuchhhadmin123') {
    const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '1d' });
    res.json({ success: true, token });
  } else {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
});

const verifyAdmin = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(403).json({ message: 'No token provided' });
  try {
    jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    res.status(403).json({ message: 'Invalid token' });
  }
};

// --- PRODUCT ROUTES ---
router.get('/products', async (req, res) => {
  let products = await Product.find();
  
  if (products.length === 0) {
    const defaultProducts = [
      {
        name: 'Classic Chocolate Chip',
        description: 'Our signature handcrafted cookie filled with melting chocolate chunks.',
        images: [],
        variants: [{ quantity: 1, price: 150 }, { quantity: 3, price: 400 }]
      }
    ];
    await Product.insertMany(defaultProducts);
    products = await Product.find();
  }
  res.json(products);
});

router.post('/products', verifyAdmin, upload.array('images', 10), async (req, res) => {
  try {
    const productData = JSON.parse(req.body.productData);
    const imagePaths = req.files.map(file => {
      let mime = file.mimetype;
      if (!mime || mime === 'application/octet-stream') mime = 'image/jpeg';
      return `data:${mime};base64,${file.buffer.toString('base64')}`;
    });
    
    // Combine existing images (if sent, e.g. during an update fake via POST, but usually just new)
    const combinedImages = [...(productData.images || []), ...imagePaths];
    const product = new Product({
      ...productData,
      images: combinedImages
    });
    await product.save();
    res.json(product);
  } catch(err) {
    console.error(err);
    res.status(500).json({message: "Server Error"});
  }
});

router.put('/products/:id', verifyAdmin, upload.array('images', 10), async (req, res) => {
  try {
    const productData = JSON.parse(req.body.productData);
    const newImagePaths = req.files.map(file => {
      let mime = file.mimetype;
      if (!mime || mime === 'application/octet-stream') mime = 'image/jpeg';
      return `data:${mime};base64,${file.buffer.toString('base64')}`;
    });
    
    // We assume productData.images contains the existing images the user kept
    const combinedImages = [...(productData.images || []), ...newImagePaths];
    
    const product = await Product.findByIdAndUpdate(req.params.id, {
      ...productData,
      images: combinedImages
    }, { new: true });
    
    res.json(product);
  } catch(err) {
    console.error(err);
    res.status(500).json({message: "Server Error"});
  }
});

router.delete('/products/:id', verifyAdmin, async (req, res) => {
  await Product.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

// --- CONFIG ROUTES ---
router.get('/config', async (req, res) => {
  let config = await Config.findOne();
  if (!config) {
    config = new Config({
      addons: [{ name: 'Chocolate Dip', price: 50 }],
      cities: ['Karachi'],
      timeDuration: '2-3 Working Days',
      storeTiming: { startTime: '15:00', endTime: '01:00' }
    });
    await config.save();
  }
  res.json(config);
});

router.put('/config', verifyAdmin, async (req, res) => {
  const { addons, cities, timeDuration, storeTiming } = req.body;
  let config = await Config.findOne();
  if (config) {
    config.addons = addons;
    config.cities = cities;
    config.timeDuration = timeDuration;
    if (storeTiming) {
      config.storeTiming = storeTiming;
    }
    await config.save();
    res.json(config);
  } else {
    res.status(404).json({ message: 'Config not found' });
  }
});

// --- ORDER ROUTES ---
router.post('/orders', async (req, res) => {
  try {
    const counter = await Counter.findByIdAndUpdate(
      { _id: 'orderId' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    
    const newOrder = new Order({
      ...req.body,
      orderNumber: counter.seq
    });
    
    await newOrder.save();
    const config = await Config.findOne();
    res.json({ success: true, message: 'Order Confirmed', timeDuration: config.timeDuration, orderNumber: counter.seq });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to place order' });
  }
});

router.get('/orders', verifyAdmin, async (req, res) => {
  try {
    const orders = await Order.find({ isDeleted: { $ne: true } }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching orders' });
  }
});

router.put('/orders/:id', verifyAdmin, async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: 'Error updating order' });
  }
});

router.delete('/orders/:id', verifyAdmin, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if(order.status !== 'Completed' && order.status !== 'Cancelled') {
      return res.status(400).json({ message: 'Can only delete completed or cancelled orders' });
    }
    order.isDeleted = true;
    await order.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting order' });
  }
});

// --- MATERIAL ROUTES ---
router.get('/materials', verifyAdmin, async (req, res) => {
  try {
    const materials = await Material.find().sort({ name: 1 });
    res.json(materials);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching materials' });
  }
});

router.post('/materials', verifyAdmin, async (req, res) => {
  try {
    const material = new Material(req.body);
    await material.save();
    res.json(material);
  } catch (err) {
    res.status(500).json({ message: 'Error adding material' });
  }
});

router.put('/materials/:id', verifyAdmin, async (req, res) => {
  try {
    const material = await Material.findByIdAndUpdate(req.params.id, { ...req.body, lastUpdated: Date.now() }, { new: true });
    res.json(material);
  } catch (err) {
    res.status(500).json({ message: 'Error updating material' });
  }
});

router.delete('/materials/:id', verifyAdmin, async (req, res) => {
  try {
    await Material.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting material' });
  }
});

// --- ANALYTICS ROUTE ---
router.get('/admin/analytics', verifyAdmin, async (req, res) => {
  try {
    const now = new Date();
    
    // Start of Today
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Start of This Week (current week starting Monday)
    const startOfWeek = new Date(now);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    const startOfCurrentWeek = new Date(startOfWeek.setDate(diff));
    startOfCurrentWeek.setHours(0,0,0,0);
    
    // Start of This Month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const orders = await Order.find();
    
    let revenueToday = 0;
    let revenueWeek = 0;
    let revenueMonth = 0;
    
    let ordersToday = 0;
    let ordersWeek = 0;
    let ordersMonth = 0;
    
    let cancelledToday = 0;
    let cancelledWeek = 0;
    let cancelledMonth = 0;
    
    const productStats = {};
    
    orders.forEach(order => {
      const isCancelled = order.status === 'Cancelled';
      const orderDate = new Date(order.createdAt);
      
      if (!isCancelled) {
        if (orderDate >= startOfToday) {
          revenueToday += order.totalPrice || 0;
          ordersToday++;
        }
        if (orderDate >= startOfCurrentWeek) {
          revenueWeek += order.totalPrice || 0;
          ordersWeek++;
        }
        if (orderDate >= startOfMonth) {
          revenueMonth += order.totalPrice || 0;
          ordersMonth++;
        }
      } else {
        if (orderDate >= startOfToday) cancelledToday++;
        if (orderDate >= startOfCurrentWeek) cancelledWeek++;
        if (orderDate >= startOfMonth) cancelledMonth++;
      }
      
      if (!isCancelled && order.items) {
        order.items.forEach(item => {
          const name = item.productName || 'Unknown Product';
          if (!productStats[name]) {
            productStats[name] = { quantity: 0, revenue: 0 };
          }
          productStats[name].quantity += item.quantity || 0;
          productStats[name].revenue += item.price || 0;
        });
      }
    });
    
    const topProducts = Object.keys(productStats).map(name => ({
      name,
      quantity: productStats[name].quantity,
      revenue: productStats[name].revenue
    })).sort((a, b) => b.quantity - a.quantity).slice(0, 5);
    
    // Daily revenue for the last 7 days
    const dailyRevenue = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      d.setHours(0,0,0,0);
      
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      const dayDate = d.getDate();
      
      let dayRev = 0;
      let dayOrd = 0;
      
      const startOfDay = new Date(d);
      const endOfDay = new Date(d);
      endOfDay.setHours(23,59,59,999);
      
      orders.forEach(order => {
        if (order.status !== 'Cancelled') {
          const orderDate = new Date(order.createdAt);
          if (orderDate >= startOfDay && orderDate <= endOfDay) {
            dayRev += order.totalPrice || 0;
            dayOrd++;
          }
        }
      });
      
      dailyRevenue.push({
        label: `${dayName} ${dayDate}`,
        revenue: dayRev,
        orders: dayOrd
      });
    }
    
    res.json({
      revenue: {
        today: revenueToday,
        week: revenueWeek,
        month: revenueMonth
      },
      ordersCount: {
        today: ordersToday,
        week: ordersWeek,
        month: ordersMonth
      },
      cancelledCount: {
        today: cancelledToday,
        week: cancelledWeek,
        month: cancelledMonth
      },
      topProducts,
      dailyRevenue
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching analytics' });
  }
});
// --- MONTHLY REPORT ROUTE ---
router.get('/admin/report', verifyAdmin, async (req, res) => {
  try {
    const period = req.query.period === 'this-month' ? 'this-month' : 'last-month';
    const now = new Date();

    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const reportRange = period === 'this-month'
      ? { start: startOfCurrentMonth, end: endOfCurrentMonth }
      : { start: startOfLastMonth, end: endOfLastMonth };

    const reportMonthName = reportRange.start.toLocaleString('default', { month: 'long', year: 'numeric' });

    const orders = await Order.find({
      createdAt: {
        $gte: reportRange.start,
        $lte: reportRange.end
      }
    }).sort({ createdAt: 1 });
    
    let totalRevenue = 0;
    let completedCount = 0;
    let cancelledCount = 0;
    const productStats = {};
    
    const orderLogs = orders.map(order => {
      const isCancelled = order.status === 'Cancelled';
      if (isCancelled) {
        cancelledCount++;
      } else {
        completedCount++;
        totalRevenue += order.totalPrice || 0;
        
        if (order.items) {
          order.items.forEach(item => {
            const name = item.productName || 'Unknown Product';
            if (!productStats[name]) {
              productStats[name] = { quantity: 0, revenue: 0 };
            }
            productStats[name].quantity += item.quantity || 0;
            productStats[name].revenue += item.price || 0;
          });
        }
      }
      
      const itemsList = order.items ? order.items.map(i => `${i.quantity}x ${i.productName}`).join(', ') : '';
      const customerName = order.customerDetails ? (order.customerDetails.fullName || order.customerDetails.name || 'Unknown') : 'Unknown';
      const customerPhone = order.customerDetails ? (order.customerDetails.phoneNo || order.customerDetails.phone || 'Unknown') : 'Unknown';
      
      return {
        orderId: order.orderNumber || order._id,
        date: new Date(order.createdAt).toLocaleString(),
        customer: customerName,
        phone: customerPhone,
        items: itemsList,
        total: order.totalPrice,
        status: order.status
      };
    });
    
    const topProducts = Object.keys(productStats).map(name => ({
      name,
      quantity: productStats[name].quantity,
      revenue: productStats[name].revenue
    })).sort((a, b) => b.quantity - a.quantity);
    
    res.json({
      success: true,
      monthName: reportMonthName,
      summary: {
        totalRevenue,
        completedCount,
        cancelledCount
      },
      topProducts,
      orderLogs
    });
  } catch (err) {
    console.error('Report Error:', err);
    res.status(500).json({ success: false, message: 'Failed to generate report data' });
  }
});

// --- PUBLIC ORDER TRACKING ROUTE ---
router.get('/orders/track/:orderNumber', async (req, res) => {
  try {
    const { orderNumber } = req.params;
    let order;
    
    // Try to find by custom sequential orderNumber if it's a number, else by _id
    if (!isNaN(orderNumber)) {
      order = await Order.findOne({ orderNumber: Number(orderNumber), isDeleted: { $ne: true } });
    }
    
    if (!order && mongoose.Types.ObjectId.isValid(orderNumber)) {
      order = await Order.findById(orderNumber);
      if (order && order.isDeleted) order = null;
    }
    
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    
    res.json({
      success: true,
      order: {
        orderNumber: order.orderNumber || order._id,
        date: order.createdAt,
        status: order.status,
        totalPrice: order.totalPrice,
        items: order.items
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error tracking order' });
  }
});

module.exports = router;
