import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import './Admin.css';

const API_URL = '/api';

export default function Admin() {
  const [token, setToken] = useState(sessionStorage.getItem('adminToken'));
  const [loginForm, setLoginForm] = useState({ id: '', password: '' });
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [orders, setOrders] = useState([]);
  const [config, setConfig] = useState(null);
  const [products, setProducts] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [analytics, setAnalytics] = useState({
    revenue: { today: 0, week: 0, month: 0 },
    ordersCount: { today: 0, week: 0, month: 0 },
    cancelledCount: { today: 0, week: 0, month: 0 },
    topProducts: [],
    dailyRevenue: Array(7).fill({ label: '', revenue: 0, orders: 0 })
  });
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // For Adding/Editing Products
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    allowAddons: true,
    variants: [{ quantity: 1, price: 150 }]
  });
  const [productImages, setProductImages] = useState([]);

  // For Adding/Editing Materials
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [materialForm, setMaterialForm] = useState({ name: '', quantity: 0, unit: 'kg' });

  // For Order View Modal
  const [viewingOrder, setViewingOrder] = useState(null);
  const [reportPeriod, setReportPeriod] = useState('last-month');
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

  // For Add Order View
  const [isAddOrderOpen, setIsAddOrderOpen] = useState(false);
  const [manualOrderCart, setManualOrderCart] = useState([]);
  const [manualCustomer, setManualCustomer] = useState({ fullName: '', phoneNo: '', houseNo: '', streetName: '', areaName: '', city: '' });
  
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedVariantIdx, setSelectedVariantIdx] = useState(0);
  const [itemQuantity, setItemQuantity] = useState(1);
  const [selectedAddons, setSelectedAddons] = useState([]);

  const openProductModal = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setProductForm({
        name: product.name,
        description: product.description,
        allowAddons: product.allowAddons !== false,
        variants: [...product.variants]
      });
      setProductImages([]);
    } else {
      setEditingProduct(null);
      setProductForm({ name: '', description: '', allowAddons: true, variants: [{ quantity: 1, price: 150 }] });
      setProductImages([]);
      if (document.getElementById('file-input')) document.getElementById('file-input').value = '';
    }
    setIsProductModalOpen(true);
  };

  const closeProductModal = () => {
    setIsProductModalOpen(false);
    setEditingProduct(null);
    setProductForm({ name: '', description: '', allowAddons: true, variants: [{ quantity: 1, price: 150 }] });
    setProductImages([]);
    if (document.getElementById('file-input')) document.getElementById('file-input').value = '';
  };

  useEffect(() => {
    if (token) {
      fetchOrders();
      fetchConfig();
      fetchProducts();
      fetchMaterials();
      fetchAnalytics();

      // Polling for live orders and analytics every 5 seconds
      const interval = setInterval(() => {
        fetchOrders(true);
        fetchAnalytics(true);
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [token]);

  const handleAuthError = (err) => {
    if (err.response && (err.response.status === 401 || err.response.status === 403)) {
      sessionStorage.removeItem('adminToken');
      setToken(null);
      toast.error('Session expired. Please login again.');
      return true;
    }
    return false;
  };

  const fetchAnalytics = async (isPolling = false) => {
    try {
      if (!isPolling) setAnalyticsLoading(true);
      const res = await axios.get(`${API_URL}/admin/analytics`, { headers: { Authorization: `Bearer ${token}` } });
      setAnalytics(res.data);
    } catch (err) {
      if (!handleAuthError(err)) {
        if (!isPolling) toast.error('Failed to fetch analytics');
      }
    } finally {
      if (!isPolling) setAnalyticsLoading(false);
    }
  };

  const fetchOrders = async (isPolling = false) => {
    try {
      const res = await axios.get(`${API_URL}/orders`, { headers: { Authorization: `Bearer ${token}` } });
      setOrders(res.data);
    } catch (err) {
      if (!handleAuthError(err)) {
        if(!isPolling) toast.error('Failed to fetch orders');
      }
    }
  };

  const fetchConfig = async () => {
    try {
      const res = await axios.get(`${API_URL}/config`);
      setConfig(res.data);
    } catch (err) {
      toast.error('Failed to fetch config');
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await axios.get(`${API_URL}/products`);
      setProducts(res.data);
    } catch (err) {
      toast.error('Failed to fetch products');
    }
  };

  const generateMonthlyReport = async () => {
    let toastId;
    try {
      toastId = toast.loading('Generating Monthly Report...');
      const res = await axios.get(`${API_URL}/admin/report`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { period: reportPeriod }
      });
      const data = res.data;
      
      const doc = new jsPDF();
      
      // Header
      doc.setFontSize(22);
      doc.setTextColor(211, 84, 0); // brand color
      doc.text("SaltMuchhh", 14, 20);
      
      doc.setFontSize(14);
      doc.setTextColor(50, 50, 50);
      doc.text(`Monthly Report - ${data.monthName}`, 14, 30);
      
      // Summary
      doc.setFontSize(12);
      doc.text("Performance Summary", 14, 45);
      autoTable(doc, {
        startY: 50,
        head: [['Metric', 'Value']],
        body: [
          ['Total Revenue', `Rs. ${data.summary.totalRevenue}`],
          ['Completed Orders', data.summary.completedCount.toString()],
          ['Cancelled Orders', data.summary.cancelledCount.toString()]
        ],
        theme: 'striped',
        headStyles: { fillColor: [211, 84, 0] }
      });
      
      // Top Products
      doc.text("Top Selling Items", 14, doc.lastAutoTable.finalY + 15);
      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 20,
        head: [['Product Name', 'Quantity Sold', 'Revenue Generated']],
        body: data.topProducts.map(p => [p.name, p.quantity, `Rs. ${p.revenue}`]),
        theme: 'striped',
        headStyles: { fillColor: [211, 84, 0] }
      });
      
      // Order Logs
      doc.addPage();
      doc.setFontSize(14);
      doc.text(`Customer Order Log - ${data.monthName}`, 14, 20);
      autoTable(doc, {
        startY: 25,
        head: [['Order ID', 'Date', 'Customer', 'Phone', 'Items', 'Total', 'Status']],
        body: data.orderLogs.map(o => [o.orderId, o.date, o.customer, o.phone, o.items, `Rs. ${o.total}`, o.status]),
        theme: 'striped',
        headStyles: { fillColor: [50, 50, 50] },
        styles: { fontSize: 8, cellPadding: 2 },
        columnStyles: { 4: { cellWidth: 50 } }
      });
      
      doc.save(`SaltMuchhh_Report_${data.monthName.replace(' ', '_')}.pdf`);
      toast.dismiss(toastId);
      toast.success('Report generated successfully!');
    } catch (err) {
      if (toastId) toast.dismiss(toastId);
      if (!handleAuthError(err)) {
        const message = err.response?.data?.message || err.message || 'Failed to generate report';
        toast.error(message);
      }
    }
  };

  const fetchMaterials = async () => {
    try {
      const res = await axios.get(`${API_URL}/materials`, { headers: { Authorization: `Bearer ${token}` } });
      setMaterials(res.data);
    } catch (err) {
      handleAuthError(err) || toast.error('Failed to fetch materials');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_URL}/admin/login`, loginForm);
      if (res.data.success) {
        sessionStorage.setItem('adminToken', res.data.token);
        setToken(res.data.token);
        toast.success('Logged in successfully!');
      }
    } catch (err) {
      toast.error('Invalid Credentials');
    }
  };

  // --- Orders ---
  const updateOrderStatus = async (id, status) => {
    try {
      await axios.put(`${API_URL}/orders/${id}`, { status }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Order status updated');
      fetchOrders();
      if (viewingOrder && viewingOrder._id === id) {
        setViewingOrder({ ...viewingOrder, status });
      }
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const deleteOrder = async (id) => {
    if(!window.confirm("Are you sure you want to delete this order entirely?")) return;
    try {
      await axios.delete(`${API_URL}/orders/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Order deleted');
      setViewingOrder(null);
      fetchOrders();
    } catch (err) {
      toast.error('Failed to delete order. Must be Completed or Cancelled.');
    }
  };

  const handlePrint = () => window.print();

  // --- Manual Add Order ---
  const handleAddToManualCart = () => {
    if (!selectedProductId) {
      toast.error('Please select a product');
      return;
    }
    const product = products.find(p => p._id === selectedProductId);
    if (!product) return;
    
    const variant = product.variants[selectedVariantIdx];
    
    const cartItem = {
      productId: product._id,
      productName: product.name,
      quantity: variant.quantity,
      orderQuantity: Number(itemQuantity),
      unitPrice: variant.price,
      price: variant.price * Number(itemQuantity) + selectedAddons.reduce((acc, a) => acc + (a.price * a.quantity * Number(itemQuantity)), 0),
      selectedAddons: selectedAddons.map(a => ({...a, quantity: a.quantity * Number(itemQuantity), isAbsolute: true}))
    };
    
    setManualOrderCart([...manualOrderCart, cartItem]);
    
    // Reset selection
    setSelectedProductId('');
    setSelectedVariantIdx(0);
    setItemQuantity(1);
    setSelectedAddons([]);
    toast.success('Item added to order');
  };

  const handleManualAddonToggle = (addonName, addonPrice, isChecked) => {
    if (isChecked) {
      setSelectedAddons([...selectedAddons, { name: addonName, price: addonPrice, quantity: 1 }]);
    } else {
      setSelectedAddons(selectedAddons.filter(a => a.name !== addonName));
    }
  };

  const handleManualAddonQtyChange = (addonName, qty) => {
    setSelectedAddons(selectedAddons.map(a => a.name === addonName ? { ...a, quantity: Number(qty) } : a));
  };

  const removeManualCartItem = (index) => {
    const newCart = [...manualOrderCart];
    newCart.splice(index, 1);
    setManualOrderCart(newCart);
  };

  const handleManualOrderSubmit = async () => {
    if (manualOrderCart.length === 0) {
      toast.error('Order is empty');
      return;
    }
    
    const totalPrice = manualOrderCart.reduce((sum, item) => sum + item.price, 0);
    
    // Clean up empty fields from customer
    const cleanCustomer = {};
    Object.keys(manualCustomer).forEach(key => {
      if (manualCustomer[key].trim() !== '') {
        cleanCustomer[key] = manualCustomer[key].trim();
      }
    });

    const orderData = {
      customerDetails: Object.keys(cleanCustomer).length > 0 ? cleanCustomer : { fullName: '' }, // fullName: '' to prevent undefined errors in map
      items: manualOrderCart,
      totalPrice: totalPrice,
      status: 'Completed'
    };
    
    try {
      const toastId = toast.loading('Placing Order...');
      await axios.post(`${API_URL}/orders`, orderData);
      toast.dismiss(toastId);
      toast.success('Order added successfully!');
      
      setManualOrderCart([]);
      setManualCustomer({ fullName: '', phoneNo: '', houseNo: '', streetName: '', areaName: '', city: '' });
      setIsAddOrderOpen(false);
      fetchOrders();
    } catch (err) {
      toast.error('Failed to add order');
    }
  };

  // --- Materials ---
  const handleMaterialSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingMaterial) {
        await axios.put(`${API_URL}/materials/${editingMaterial._id}`, materialForm, { headers: { Authorization: `Bearer ${token}` } });
        toast.success('Material updated!');
      } else {
        await axios.post(`${API_URL}/materials`, materialForm, { headers: { Authorization: `Bearer ${token}` } });
        toast.success('Material added!');
      }
      setEditingMaterial(null);
      setMaterialForm({ name: '', quantity: 0, unit: 'kg' });
      fetchMaterials();
    } catch (err) {
      toast.error('Failed to save material');
    }
  };

  const deleteMaterial = async (id) => {
    if (!window.confirm('Delete this material?')) return;
    try {
      await axios.delete(`${API_URL}/materials/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Material deleted');
      fetchMaterials();
    } catch (err) {
      toast.error('Failed to delete material');
    }
  };

  // --- Products ---
  const handleVariantChange = (index, field, value) => {
    const newVariants = [...productForm.variants];
    newVariants[index][field] = Number(value);
    setProductForm({ ...productForm, variants: newVariants });
  };
  const addVariant = () => setProductForm({ ...productForm, variants: [...productForm.variants, { quantity: 1, price: 0 }] });
  const removeVariant = (index) => {
    const newVariants = [...productForm.variants];
    newVariants.splice(index, 1);
    setProductForm({ ...productForm, variants: newVariants });
  };

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('productData', JSON.stringify({
      name: productForm.name,
      description: productForm.description,
      allowAddons: productForm.allowAddons !== false,
      variants: productForm.variants,
      images: editingProduct ? editingProduct.images : []
    }));

    for (let i = 0; i < productImages.length; i++) {
      formData.append('images', productImages[i]);
    }

    try {
      if (editingProduct) {
        await axios.put(`${API_URL}/products/${editingProduct._id}`, formData, { 
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } 
        });
        toast.success('Product updated!');
      } else {
        await axios.post(`${API_URL}/products`, formData, { 
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } 
        });
        toast.success('Product added!');
      }
      setEditingProduct(null);
      setProductForm({ name: '', description: '', allowAddons: true, variants: [{ quantity: 1, price: 150 }] });
      setProductImages([]);
      if(document.getElementById('file-input')) document.getElementById('file-input').value='';
      closeProductModal();
      fetchProducts();
    } catch (err) {
      toast.error('Failed to save product');
    }
  };

  const deleteProduct = async (id) => {
    if (!window.confirm('Delete this product?')) return;
    try {
      await axios.delete(`${API_URL}/products/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Product deleted');
      fetchProducts();
    } catch (err) {
      toast.error('Failed to delete product');
    }
  };

  // --- Settings ---
  const handleAddonChange = (index, field, value) => {
    const newAddons = [...config.addons];
    newAddons[index][field] = field === 'price' ? Number(value) : value;
    setConfig({ ...config, addons: newAddons });
  };
  const addAddon = () => setConfig({ ...config, addons: [...config.addons, { name: '', price: 0 }] });
  const removeAddon = (index) => {
    const newAddons = [...config.addons];
    newAddons.splice(index, 1);
    setConfig({ ...config, addons: newAddons });
  };

  const handleConfigSave = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API_URL}/config`, config, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Settings updated successfully!');
    } catch (err) {
      toast.error('Failed to update settings');
    }
  };

  const changeTab = (tab) => {
    setActiveTab(tab);
    setViewingOrder(null);
    setIsSidebarOpen(false); // Close sidebar on mobile after clicking
  };

  if (!token) {
    return (
      <div className="admin-container login-view">
        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="glass-panel login-panel">
          <h2>Admin Login</h2>
          <form onSubmit={handleLogin}>
            <input type="text" placeholder="Admin ID" value={loginForm.id} onChange={e => setLoginForm({...loginForm, id: e.target.value})} />
            <input type="password" placeholder="Password" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} />
            <button className="btn" type="submit">Login</button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <>
      <div className="admin-container no-print">
      {/* Mobile Hamburger Header */}
      <div className="mobile-header">
        <button className="hamburger-btn" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
          ☰
        </button>
        <h2 className="mobile-brand">SALTMUCHHH</h2>
      </div>

      <div className={`admin-sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <h2 className="desktop-only">Admin Panel</h2>
        <nav>
          <button className={activeTab === 'dashboard' ? 'active' : ''} onClick={() => changeTab('dashboard')}>Dashboard</button>
          <button className={activeTab === 'orders' ? 'active' : ''} onClick={() => changeTab('orders')}>Orders</button>
          <button className={activeTab === 'products' ? 'active' : ''} onClick={() => changeTab('products')}>Products</button>
          <button className={activeTab === 'materials' ? 'active' : ''} onClick={() => changeTab('materials')}>Materials</button>
          <button className={activeTab === 'settings' ? 'active' : ''} onClick={() => changeTab('settings')}>Settings</button>
        </nav>
        <button className="btn logout-btn" onClick={() => { sessionStorage.removeItem('adminToken'); setToken(null); }}>Logout</button>
      </div>

      {isSidebarOpen && <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)}></div>}

      <div className="admin-content">
        {/* --- ANALYTICS DASHBOARD TAB --- */}
        {activeTab === 'dashboard' && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <div className="dashboard-header-row">
              <div>
                <h2>Analytics Dashboard</h2>
                <p style={{color: '#634327', opacity: 0.8, fontSize: '0.95rem'}}>Real-time sales insights and performance metrics</p>
              </div>
              <div style={{display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap'}}>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <select
                    value={reportPeriod}
                    onChange={(e) => setReportPeriod(e.target.value)}
                    className="report-period-select"
                    style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #ccc', background: 'white', color: '#333', minWidth: '120px' }}
                  >
                    <option value="last-month">Last Month</option>
                    <option value="this-month">This Month</option>
                  </select>
                  <button className="btn-small" onClick={generateMonthlyReport} style={{display: 'flex', alignItems: 'center', gap: '5px', height: 'fit-content', backgroundColor: '#e67e22', color: 'white'}}>
                    📄 Generate Data Sheet
                  </button>
                </div>
                <button className="btn-small" onClick={() => fetchAnalytics()} disabled={analyticsLoading} style={{display: 'flex', alignItems: 'center', gap: '5px', height: 'fit-content'}}>
                  {analyticsLoading ? 'Refreshing...' : '🔄 Refresh'}
                </button>
              </div>
            </div>

            {analytics ? (
              <>
                {/* Metrics Row */}
                <div className="dashboard-metrics-grid">
                  <div className="metric-card glass-panel revenue-card">
                    <div className="metric-card-header">
                      <span className="metric-icon">💰</span>
                      <h3>Total Revenue</h3>
                    </div>
                    <div className="metric-periods">
                      <div className="metric-period-row">
                        <span className="period-label">Today</span>
                        <strong className="period-value">Rs. {analytics.revenue.today}</strong>
                      </div>
                      <div className="metric-period-row">
                        <span className="period-label">This Week</span>
                        <strong className="period-value">Rs. {analytics.revenue.week}</strong>
                      </div>
                      <div className="metric-period-row">
                        <span className="period-label">This Month</span>
                        <strong className="period-value">Rs. {analytics.revenue.month}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="metric-card glass-panel orders-card">
                    <div className="metric-card-header">
                      <span className="metric-icon">📦</span>
                      <h3>Total Orders</h3>
                    </div>
                    <div className="metric-periods">
                      <div className="metric-period-row">
                        <span className="period-label">Today</span>
                        <strong className="period-value">{analytics.ordersCount.today} orders</strong>
                      </div>
                      <div className="metric-period-row">
                        <span className="period-label">This Week</span>
                        <strong className="period-value">{analytics.ordersCount.week} orders</strong>
                      </div>
                      <div className="metric-period-row">
                        <span className="period-label">This Month</span>
                        <strong className="period-value">{analytics.ordersCount.month} orders</strong>
                      </div>
                    </div>
                  </div>

                  <div className="metric-card glass-panel cancelled-card">
                    <div className="metric-card-header">
                      <span className="metric-icon">❌</span>
                      <h3>Cancelled Orders</h3>
                    </div>
                    <div className="metric-periods">
                      <div className="metric-period-row">
                        <span className="period-label">Today</span>
                        <strong className="period-value">{analytics.cancelledCount.today} orders</strong>
                      </div>
                      <div className="metric-period-row">
                        <span className="period-label">This Week</span>
                        <strong className="period-value">{analytics.cancelledCount.week} orders</strong>
                      </div>
                      <div className="metric-period-row">
                        <span className="period-label">This Month</span>
                        <strong className="period-value">{analytics.cancelledCount.month} orders</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Secondary Row: Chart and Top Products */}
                <div className="dashboard-charts-grid">
                  {/* Daily Revenue Chart */}
                  <div className="chart-card glass-panel">
                    <h3>7-Day Revenue Trend</h3>
                    <p style={{fontSize: '0.85rem', color: '#634327', opacity: 0.8, marginBottom: '20px'}}>Excluding cancelled orders</p>
                    
                    <div className="bar-chart-container">
                      {analytics.dailyRevenue.map((day, idx) => {
                        // Find max revenue to scale the heights proportionally
                        const maxRevenue = Math.max(...analytics.dailyRevenue.map(d => d.revenue), 100);
                        const pctHeight = Math.max((day.revenue / maxRevenue) * 100, 4); // min 4% so we show something if it is 0
                        
                        return (
                          <div key={idx} className="chart-bar-column">
                            <div className="chart-bar-value">Rs. {day.revenue}</div>
                            <div className="chart-bar-wrapper">
                              <motion.div 
                                className="chart-bar-fill" 
                                initial={{ height: 0 }}
                                animate={{ height: `${pctHeight}%` }}
                                transition={{ duration: 0.6, delay: idx * 0.05 }}
                              />
                            </div>
                            <div className="chart-bar-label">{day.label}</div>
                            <div className="chart-bar-sublabel">{day.orders} ord</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Top Selling Products */}
                  <div className="top-products-card glass-panel">
                    <h3>Top Selling Cookies</h3>
                    <p style={{fontSize: '0.85rem', color: '#634327', opacity: 0.8, marginBottom: '20px'}}>Ranked by quantity sold</p>
                    
                    <div className="top-products-list">
                      {analytics.topProducts.length === 0 ? (
                        <p style={{textAlign: 'center', color: '#634327', opacity: 0.6, marginTop: '40px'}}>No cookie sales data yet.</p>
                      ) : (
                        analytics.topProducts.map((prod, idx) => {
                          const maxQty = Math.max(...analytics.topProducts.map(p => p.quantity), 1);
                          const progressPct = (prod.quantity / maxQty) * 100;
                          
                          return (
                            <div key={idx} className="top-product-item">
                              <div className="top-product-meta">
                                <div className="product-rank-name">
                                  <span className={`rank-badge rank-${idx + 1}`}>{idx + 1}</span>
                                  <span className="product-name-label">{prod.name}</span>
                                </div>
                                <div className="product-stats-label">
                                  <strong>{prod.quantity} sold</strong>
                                  <span className="product-rev-label">Rs. {prod.revenue}</span>
                                </div>
                              </div>
                              <div className="progress-bar-bg">
                                <motion.div 
                                  className="progress-bar-fill"
                                  initial={{ width: 0 }}
                                  animate={{ width: `${progressPct}%` }}
                                  transition={{ duration: 0.6, delay: idx * 0.05 }}
                                />
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </>
            ) : null}
          </motion.div>
        )}

        {/* --- ORDERS TAB --- */}
        {activeTab === 'orders' && !viewingOrder && !isAddOrderOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="dashboard-header-row">
              <h2>Orders Management <span className="live-badge">Live</span></h2>
              <button className="btn-small" onClick={() => setIsAddOrderOpen(true)} style={{backgroundColor: '#e67e22', color: 'white'}}>+ Add Order</button>
            </div>
            <div className="orders-list">
              {orders.length === 0 ? <p>No orders yet.</p> : orders.map(order => (
                <div key={order._id} className="order-card glass-panel">
                  <div className="order-header">
                    <span className="order-date">{new Date(order.createdAt).toLocaleString()}</span>
                    <strong style={{marginLeft: '15px'}}>Order #{order.orderNumber || order._id}</strong>
                    <div className="order-actions-group" style={{marginLeft: 'auto'}}>
                      <select 
                        value={order.status} 
                        onChange={(e) => updateOrderStatus(order._id, e.target.value)}
                        className={`status-badge ${order.status.toLowerCase()}`}
                      >
                        <option value="Pending">Pending</option>
                        <option value="Processing">Processing</option>
                        <option value="Completed">Completed</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                      <button className="btn-small" onClick={() => setViewingOrder(order)}>View</button>
                      {(order.status === 'Completed' || order.status === 'Cancelled') && (
                        <button className="btn-small danger" onClick={() => deleteOrder(order._id)}>Delete</button>
                      )}
                    </div>
                  </div>
                  <div className="order-body">
                    <p><strong>Customer:</strong> {order.customerDetails.fullName} ({order.customerDetails.phoneNo})</p>
                    <p><strong>Total:</strong> Rs. {order.totalPrice}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* --- ADD ORDER VIEW --- */}
        {activeTab === 'orders' && isAddOrderOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <button className="back-btn mb-20" onClick={() => setIsAddOrderOpen(false)}>← Back to Orders</button>
            <div className="glass-panel">
              <h2>Add New Order</h2>
              
              <div className="management-grid" style={{gridTemplateColumns: '1fr 1fr'}}>
                {/* Left side: Add Items */}
                <div className="form-group">
                  <h3>Select Product</h3>
                  <select className="form-control" value={selectedProductId} onChange={(e) => {
                    setSelectedProductId(e.target.value);
                    setSelectedVariantIdx(0);
                    setSelectedAddons([]);
                  }} style={{padding: '10px', borderRadius: '8px', border: '1px solid #ddd', width: '100%', marginBottom: '15px'}}>
                    <option value="">-- Choose a Product --</option>
                    {products.map(p => (
                      <option key={p._id} value={p._id}>{p.name}</option>
                    ))}
                  </select>
                  
                  {selectedProductId && (
                    <>
                      <h4 style={{marginTop: '15px', marginBottom: '5px'}}>Variant (Offer)</h4>
                      <select className="form-control" value={selectedVariantIdx} onChange={(e) => setSelectedVariantIdx(Number(e.target.value))} style={{padding: '10px', borderRadius: '8px', border: '1px solid #ddd', width: '100%', marginBottom: '15px'}}>
                        {products.find(p => p._id === selectedProductId)?.variants.map((v, idx) => (
                          <option key={idx} value={idx}>{v.quantity} Items for Rs. {v.price}</option>
                        ))}
                      </select>
                      
                      <h4 style={{marginTop: '15px', marginBottom: '5px'}}>Quantity of Offer</h4>
                      <input type="number" min="1" className="form-control" value={itemQuantity} onChange={(e) => setItemQuantity(e.target.value)} style={{padding: '10px', borderRadius: '8px', border: '1px solid #ddd', width: '100%', marginBottom: '15px'}} />
                      
                      {products.find(p => p._id === selectedProductId)?.allowAddons !== false && config?.addons?.length > 0 && (
                        <>
                          <h4 style={{marginTop: '15px', marginBottom: '10px'}}>Add-ons</h4>
                          {config.addons.map((addon, idx) => {
                            const selected = selectedAddons.find(a => a.name === addon.name);
                            return (
                              <div key={idx} style={{display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px'}}>
                                <input type="checkbox" checked={!!selected} onChange={(e) => handleManualAddonToggle(addon.name, addon.price, e.target.checked)} style={{width: 'auto', margin: 0}} />
                                <span>{addon.name} (+Rs. {addon.price})</span>
                                {selected && (
                                  <input type="number" min="1" style={{width: '60px', padding: '5px', borderRadius: '4px', border: '1px solid #ccc'}} value={selected.quantity} onChange={(e) => handleManualAddonQtyChange(addon.name, e.target.value)} />
                                )}
                              </div>
                            )
                          })}
                        </>
                      )}
                      
                      <button className="btn" onClick={handleAddToManualCart} style={{marginTop: '20px'}}>Add to Order</button>
                    </>
                  )}
                </div>

                {/* Right side: Cart & Customer Info */}
                <div className="form-group" style={{borderLeft: '1px solid rgba(0,0,0,0.1)', paddingLeft: '20px'}}>
                  <h3>Current Order Items</h3>
                  {manualOrderCart.length === 0 ? <p style={{color: '#888'}}>No items added yet.</p> : (
                    <table style={{width: '100%', textAlign: 'left', marginBottom: '20px', borderCollapse: 'collapse'}}>
                      <thead>
                        <tr style={{borderBottom: '1px solid #eee'}}>
                          <th style={{paddingBottom: '5px'}}>Item</th>
                          <th style={{paddingBottom: '5px'}}>Qty</th>
                          <th style={{paddingBottom: '5px'}}>Price</th>
                          <th style={{paddingBottom: '5px'}}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {manualOrderCart.map((item, idx) => (
                          <tr key={idx} style={{borderBottom: '1px solid #eee'}}>
                            <td style={{padding: '5px 0'}}>
                              <strong>{item.productName}</strong><br/>
                              <small>{item.quantity} Cookies</small>
                              {item.selectedAddons && item.selectedAddons.length > 0 && (
                                <div style={{fontSize: '0.8em', color: '#666'}}>
                                  + {item.selectedAddons.map(a => `${a.name}(x${a.quantity})`).join(', ')}
                                </div>
                              )}
                            </td>
                            <td>{item.orderQuantity}</td>
                            <td>Rs. {item.price}</td>
                            <td><button className="btn-small danger" onClick={() => removeManualCartItem(idx)} style={{padding: '2px 8px'}}>X</button></td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan="2" style={{textAlign: 'right', paddingTop: '10px'}}><strong>Total:</strong></td>
                          <td colSpan="2" style={{paddingTop: '10px'}}><strong>Rs. {manualOrderCart.reduce((sum, item) => sum + item.price, 0)}</strong></td>
                        </tr>
                      </tfoot>
                    </table>
                  )}

                  <h3 style={{marginTop: '20px'}}>Customer Details (Optional)</h3>
                  <p style={{fontSize: '0.85em', color: '#666', marginBottom: '10px'}}>Leave blank if not needed on the slip.</p>
                  <input type="text" placeholder="Full Name" className="form-control" value={manualCustomer.fullName} onChange={e => setManualCustomer({...manualCustomer, fullName: e.target.value})} style={{padding: '10px', borderRadius: '8px', border: '1px solid #ddd', width: '100%', marginBottom: '10px'}} />
                  <input type="text" placeholder="Phone Number" className="form-control" value={manualCustomer.phoneNo} onChange={e => setManualCustomer({...manualCustomer, phoneNo: e.target.value})} style={{padding: '10px', borderRadius: '8px', border: '1px solid #ddd', width: '100%', marginBottom: '10px'}} />
                  
                  <h4 style={{marginTop: '15px', marginBottom: '5px'}}>Address (Optional)</h4>
                  <div style={{display: 'flex', gap: '10px', marginBottom: '10px'}}>
                    <input type="text" placeholder="House No" className="form-control" value={manualCustomer.houseNo} onChange={e => setManualCustomer({...manualCustomer, houseNo: e.target.value})} style={{padding: '10px', borderRadius: '8px', border: '1px solid #ddd', width: '100%'}} />
                    <input type="text" placeholder="Street" className="form-control" value={manualCustomer.streetName} onChange={e => setManualCustomer({...manualCustomer, streetName: e.target.value})} style={{padding: '10px', borderRadius: '8px', border: '1px solid #ddd', width: '100%'}} />
                  </div>
                  <div style={{display: 'flex', gap: '10px'}}>
                    <input type="text" placeholder="Area" className="form-control" value={manualCustomer.areaName} onChange={e => setManualCustomer({...manualCustomer, areaName: e.target.value})} style={{padding: '10px', borderRadius: '8px', border: '1px solid #ddd', width: '100%'}} />
                    <input type="text" placeholder="City" className="form-control" value={manualCustomer.city} onChange={e => setManualCustomer({...manualCustomer, city: e.target.value})} style={{padding: '10px', borderRadius: '8px', border: '1px solid #ddd', width: '100%'}} />
                  </div>

                  <button className="btn" onClick={handleManualOrderSubmit} style={{width: '100%', marginTop: '20px', backgroundColor: '#e67e22', color: 'white', padding: '12px'}}>Place Order</button>
                </div>
              </div>
            </div>
          </motion.div>
        )}


        {/* View Specific Order Details */}
        {activeTab === 'orders' && viewingOrder && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <button className="back-btn mb-20" onClick={() => setViewingOrder(null)}>← Back to Orders</button>
            <div className="glass-panel order-detail-panel">
              <div className="detail-header">
                <h2>Order Details</h2>
                <div className="detail-actions">
                  <button className="btn-small" onClick={handlePrint}>Print Slip</button>
                  {(viewingOrder.status === 'Completed' || viewingOrder.status === 'Cancelled') && (
                    <button className="btn-small danger" onClick={() => deleteOrder(viewingOrder._id)}>Delete</button>
                  )}
                </div>
              </div>
              
              <hr style={{margin: '15px 0'}}/>
              
              <p><strong>Order ID:</strong> #{viewingOrder.orderNumber || viewingOrder._id}</p>
              <p><strong>Date:</strong> {new Date(viewingOrder.createdAt).toLocaleString()}</p>
              <p><strong>Status:</strong> 
                <select 
                  value={viewingOrder.status} 
                  onChange={(e) => updateOrderStatus(viewingOrder._id, e.target.value)}
                  className={`status-badge ${viewingOrder.status.toLowerCase()}`}
                  style={{marginLeft: '10px'}}
                >
                  <option value="Pending">Pending</option>
                  <option value="Processing">Processing</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </p>

              <h3 style={{marginTop: '20px'}}>Customer Info</h3>
              {viewingOrder.customerDetails && viewingOrder.customerDetails.fullName ? (
                <>
                  <p><strong>Name:</strong> {viewingOrder.customerDetails.fullName}</p>
                  <p><strong>Phone:</strong> {viewingOrder.customerDetails.phoneNo}</p>
                  <p><strong>Address:</strong> {viewingOrder.customerDetails.houseNo}, {viewingOrder.customerDetails.streetName}, {viewingOrder.customerDetails.areaName}, {viewingOrder.customerDetails.city}</p>
                </>
              ) : (
                <p style={{color: '#666', fontStyle: 'italic'}}>No customer details provided (Walk-in/Manual Order)</p>
              )}
              
              <h3 style={{marginTop: '20px'}}>Items Ordered</h3>
              <div className="table-responsive">
                <table style={{width: '100%', textAlign: 'left', borderCollapse: 'collapse', marginTop: '10px'}}>
                  <thead>
                    <tr style={{borderBottom: '2px solid #ddd'}}>
                      <th style={{paddingBottom: '10px'}}>Item</th>
                      <th style={{paddingBottom: '10px'}}>Qty</th>
                      <th style={{paddingBottom: '10px'}}>Item Price</th>
                      <th style={{paddingBottom: '10px'}}>Add-ons</th>
                      <th style={{paddingBottom: '10px'}}>Add-ons Price</th>
                      <th style={{paddingBottom: '10px', textAlign: 'right'}}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewingOrder.items.map((item, idx) => {
                      const addonsPrice = item.selectedAddons
                        ? item.selectedAddons.reduce((s, a) => s + a.price * (a.isAbsolute ? a.quantity : (a.quantity || 1) * (item.orderQuantity || 1)), 0)
                        : 0;
                      const itemPrice = item.price - addonsPrice;
                      return (
                      <tr key={idx} style={{borderBottom: '1px solid #eee'}}>
                        <td style={{padding: '10px 0'}}>
                          <strong>{item.productName}</strong><br/>
                          <small>{item.quantity} Cookies</small>
                        </td>
                        <td style={{padding: '10px 0'}}>{item.orderQuantity || 1}</td>
                        <td style={{padding: '10px 0'}}>Rs. {itemPrice}</td>
                        <td style={{padding: '10px 0'}}>
                          {item.selectedAddons && item.selectedAddons.length > 0
                            ? item.selectedAddons.map(a => {
                                const q = a.isAbsolute ? a.quantity : (a.quantity || 1) * (item.orderQuantity || 1);
                                return `${a.name}${q > 1 ? ` ×${q}` : ''}`;
                              }).join(', ')
                            : '-'}
                        </td>
                        <td style={{padding: '10px 0'}}>
                          {item.selectedAddons && item.selectedAddons.length > 0 ? `Rs. ${addonsPrice}` : '-'}
                        </td>
                        <td style={{padding: '10px 0', textAlign: 'right'}}><strong>Rs. {item.price}</strong></td>
                      </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan="5" style={{textAlign: 'right', padding: '15px 10px 0 0'}}>
                        <h2 style={{margin: 0}}>Grand Total:</h2>
                      </td>
                      <td style={{padding: '15px 0 0 0', textAlign: 'right'}}>
                        <h2 style={{margin: 0, color: 'var(--text-main)'}}>Rs. {viewingOrder.totalPrice}</h2>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* --- PRODUCTS TAB --- */}
        {activeTab === 'products' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h2>Products Management</h2>
            <div className="management-grid">
              
              <div className="list-panel">
                <div className="product-actions-row">
                  <button className="btn-small" onClick={() => openProductModal()}>+ Add Product</button>
                </div>
                {products.map(p => (
                  <div key={p._id} className="admin-card">
                    <img src={p.images[0] ? p.images[0] : '/placeholder.jpg'} alt={p.name} className="admin-card-img" />
                    <div style={{flex: 1}}>
                      <h4 style={{margin:0}}>{p.name}</h4>
                      <small>{p.variants.length} Variants</small>
                    </div>
                    <div className="actions-col">
                      <button className="btn-small" onClick={() => openProductModal(p)}>Edit</button>
                      <button className="btn-small danger" onClick={() => deleteProduct(p._id)}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <AnimatePresence>
              {isProductModalOpen && (
                <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <motion.div className="modal-dialog" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}>
                    <div className="modal-header">
                      <h3>{editingProduct ? 'Edit Product' : 'Add New Product'}</h3>
                      <button className="modal-close-btn" onClick={closeProductModal}>×</button>
                    </div>
                    <form onSubmit={handleProductSubmit} className="product-modal-form">
                      <input required type="text" placeholder="Product Name" value={productForm.name} onChange={e => setProductForm({...productForm, name: e.target.value})} />
                      <textarea required placeholder="Description" rows="3" value={productForm.description} onChange={e => setProductForm({...productForm, description: e.target.value})} />

                      <h4>Images (Select from device)</h4>
                      <input id="file-input" type="file" multiple accept="image/*" onChange={(e) => setProductImages(e.target.files)} />
                      <small style={{display:'block', marginBottom:'15px', color:'#666'}}>The first image will be the main image.</small>

                      <label style={{display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', fontWeight: 'bold'}}>
                        <input type="checkbox" checked={productForm.allowAddons !== false} onChange={e => setProductForm({...productForm, allowAddons: e.target.checked})} style={{width: 'auto', margin: 0}} />
                        Allow Add-ons for this product
                      </label>

                      <h4>Variants (Offers)</h4>
                      {productForm.variants.map((v, idx) => (
                        <div key={idx} className="flex-row">
                          <input type="number" min="1" placeholder="Qty" value={v.quantity} onChange={e => handleVariantChange(idx, 'quantity', e.target.value)} style={{width: '60px'}}/>
                          <span className="mobile-hide">for Rs.</span>
                          <input type="number" min="1" placeholder="Price" value={v.price} onChange={e => handleVariantChange(idx, 'price', e.target.value)} style={{flex:1}}/>
                          {productForm.variants.length > 1 && (
                            <button type="button" className="btn-small danger" onClick={() => removeVariant(idx)}>X</button>
                          )}
                        </div>
                      ))}
                      <button type="button" className="btn add-btn" onClick={addVariant}>+ Add Variant</button>

                      <div className="editor-actions">
                        <button type="submit" className="btn">{editingProduct ? 'Update Product' : 'Add Product'}</button>
                        <button type="button" className="btn" style={{backgroundColor: '#666'}} onClick={closeProductModal}>Cancel</button>
                      </div>
                    </form>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* --- MATERIALS TAB --- */}
        {activeTab === 'materials' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h2>Material Management</h2>
            <div className="glass-panel" style={{textAlign: 'center', padding: '50px'}}>
              <h3 style={{fontSize: '2rem', color: 'var(--text-main)'}}>Coming Soon</h3>
              <p style={{fontSize: '1.2rem', marginTop: '10px'}}>Ask Developer To Add It.</p>
            </div>
          </motion.div>
        )}

        {/* --- SETTINGS TAB --- */}
        {activeTab === 'settings' && config && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h2>Settings</h2>
            <form onSubmit={handleConfigSave} className="settings-form glass-panel">
              
              <h3>Dynamic Add-ons</h3>
              {config.addons.map((addon, idx) => (
                <div key={idx} className="flex-row mb-10">
                  <input type="text" placeholder="Name" value={addon.name} onChange={e => handleAddonChange(idx, 'name', e.target.value)} style={{flex:2, marginBottom:0}}/>
                  <input type="number" min="0" placeholder="Price" value={addon.price} onChange={e => handleAddonChange(idx, 'price', e.target.value)} style={{flex:1, marginBottom:0}}/>
                  <button type="button" className="btn-small danger" onClick={() => removeAddon(idx)} style={{padding: '0 15px'}}>X</button>
                </div>
              ))}
              <button type="button" className="btn add-btn" onClick={addAddon}>+ Add Addon</button>

              <h3 style={{marginTop: '30px'}}>Store Timing</h3>
              <div className="form-group flex-row">
                <div style={{flex: 1}}>
                  <label>Start Time</label>
                  <input type="time" value={config.storeTiming?.startTime || '15:00'} onChange={(e) => setConfig({...config, storeTiming: {...(config.storeTiming || {}), startTime: e.target.value}})} />
                </div>
                <div style={{flex: 1}}>
                  <label>End Time</label>
                  <input type="time" value={config.storeTiming?.endTime || '01:00'} onChange={(e) => setConfig({...config, storeTiming: {...(config.storeTiming || {}), endTime: e.target.value}})} />
                </div>
              </div>

              <h3 style={{marginTop: '30px'}}>Delivery Config</h3>
              <div className="form-group">
                <label>Estimated Time Duration</label>
                <input type="text" value={config.timeDuration} onChange={(e) => setConfig({...config, timeDuration: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Cities (Comma separated)</label>
                <input type="text" value={config.cities.join(', ')} onChange={(e) => setConfig({...config, cities: e.target.value.split(',').map(c => c.trim())})} />
              </div>

              <button className="btn" type="submit">Save Changes</button>
            </form>
          </motion.div>
        )}
        {/* --- FOOTER --- */}
        <footer style={{textAlign: 'center', marginTop: '50px', paddingBottom: '20px', color: '#555'}}>
          <p style={{fontSize: '1.1rem', fontWeight: 800}}>© 2026 SaltMuchhh All rights reserved By MHK</p>
        </footer>
      </div>

      </div>

      {/* --- HIDDEN PRINT SLIP (Thermal Printer 80mm format) --- */}
      {viewingOrder && (
        <div className="print-only">
          <div className="thermal-receipt">
            <h1 className="receipt-title">SALTMUCHHH</h1>
            <p className="receipt-date">{new Date(viewingOrder.createdAt).toLocaleString()}</p>
            <p style={{textAlign: 'center'}}><strong>Order ID:</strong><br/>#{viewingOrder.orderNumber || viewingOrder._id}</p>
            <div className="receipt-divider"></div>
            {viewingOrder.customerDetails && viewingOrder.customerDetails.fullName && (
              <>
                <p><strong>Customer:</strong> {viewingOrder.customerDetails.fullName}</p>
                <p><strong>Phone:</strong> {viewingOrder.customerDetails.phoneNo}</p>
                {viewingOrder.customerDetails.houseNo && (
                  <p><strong>Address:</strong> {viewingOrder.customerDetails.houseNo}, {viewingOrder.customerDetails.streetName}, {viewingOrder.customerDetails.areaName}, {viewingOrder.customerDetails.city}</p>
                )}
                <div className="receipt-divider"></div>
              </>
            )}
            <table className="receipt-items" style={{width: '100%'}}>
              <thead>
                <tr style={{borderBottom: '1px dashed black'}}>
                  <th style={{textAlign:'left'}}>Item</th>
                  <th style={{textAlign:'right'}}>Price</th>
                </tr>
              </thead>
              <tbody>
                {viewingOrder.items.map((item, idx) => {
                  const addonsPrice = item.selectedAddons
                    ? item.selectedAddons.reduce((s, a) => s + a.price * (a.isAbsolute ? a.quantity : (a.quantity || 1) * (item.orderQuantity || 1)), 0)
                    : 0;
                  const itemPrice = item.price - addonsPrice;
                  return (
                  <React.Fragment key={idx}>
                    <tr>
                      <td>
                        {item.productName} ({item.quantity}x){(item.orderQuantity || 1) > 1 ? ` ×${item.orderQuantity}` : ''}
                      </td>
                      <td style={{textAlign:'right'}}>Rs. {itemPrice}</td>
                    </tr>
                    {item.selectedAddons && item.selectedAddons.map((addon, aIdx) => {
                      const q = addon.isAbsolute ? addon.quantity : (addon.quantity || 1) * (item.orderQuantity || 1);
                      return (
                        <tr key={aIdx}>
                          <td style={{padding: '3px 0', paddingLeft: '10px'}}>
                            <small>Addon: {addon.name}{q > 1 ? ` ×${q}` : ''}</small>
                          </td>
                          <td style={{padding: '3px 0', textAlign: 'right'}}>
                            <small>Rs. {addon.price * q}</small>
                          </td>
                        </tr>
                      );
                    })}
                    <tr>
                      <td style={{textAlign: 'left'}}><strong>Item Total</strong></td>
                      <td style={{textAlign:'right'}}><strong>Rs. {item.price}</strong></td>
                    </tr>
                    <tr>
                      <td colSpan="2" style={{borderBottom: '1px dashed #ccc', paddingBottom: '5px'}}></td>
                    </tr>
                  </React.Fragment>
                  );
                })}
              </tbody>
            </table>
            <div className="receipt-divider"></div>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '16px', fontWeight: 'bold'}}>
              <span>Grand Total</span>
              <span>Rs. {viewingOrder.totalPrice}</span>
            </div>
            <div className="receipt-divider"></div>
            <p className="receipt-footer">Thanks For Purchasing!</p>
            <div style={{textAlign: 'center', fontSize: '8px', marginTop: '10px', color: 'black'}}>
              © 2026 SaltMuchhh All rights reserved By MHK
            </div>
          </div>
        </div>
      )}
    </>
  );
}
