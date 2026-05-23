import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import './Home.css';

const API_URL = '/api';

export default function Home() {
  const [products, setProducts] = useState([]);
  const [config, setConfig] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState(JSON.parse(localStorage.getItem('saltmuchhh_cart')) || []);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [orderConfirmed, setOrderConfirmed] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '', phoneNo: '', houseNo: '', streetName: '', areaName: '', city: 'Karachi'
  });
  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      const [prodRes, confRes] = await Promise.all([
        axios.get(`${API_URL}/products`),
        axios.get(`${API_URL}/config`)
      ]);
      setProducts(prodRes.data);
      setConfig(confRes.data);
    } catch(err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    localStorage.setItem('saltmuchhh_cart', JSON.stringify(cart));
  }, [cart]);

  const removeFromCart = (index) => {
    const newCart = [...cart];
    newCart.splice(index, 1);
    setCart(newCart);
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price, 0);

  const submitOrder = async (e) => {
    e.preventDefault();
    if (cart.length === 0) return;

    try {
      const orderData = {
        customerDetails: formData,
        items: cart,
        totalPrice: cartTotal
      };
      const res = await axios.post(`${API_URL}/orders`, orderData);
      if (res.data.success) {
        setOrderConfirmed({ orderNumber: res.data.orderNumber });
        setCart([]);
        setIsCartOpen(false);
      }
    } catch (err) {
      toast.error('Failed to place order. Please try again.');
    }
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
  };

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="home-container">
      <div className="oven-background"></div>

      {/* Hamburger Button - Mobile Only */}
      <button className="hamburger-btn" onClick={() => setIsSidebarOpen(true)}>
        <span></span>
        <span></span>
        <span></span>
      </button>

      {/* Cart Button - Always visible, top-right */}
      {!orderConfirmed && (
        <button className="floating-cart-btn" onClick={() => setIsCartOpen(true)}>
          🛒 Cart <span className="cart-badge">{cart.length}</span>
        </button>
      )}

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div 
              className="sidebar-overlay" 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setIsSidebarOpen(false)} 
            />
            <motion.div 
              className="sidebar-drawer" 
              initial={{ x: '-100%' }} 
              animate={{ x: 0 }} 
              exit={{ x: '-100%' }} 
              transition={{ type: 'tween', duration: 0.3 }}
            >
              <div className="sidebar-header">
                <h2 className="sidebar-brand">SALTMUCHHH</h2>
                <button className="sidebar-close-btn" onClick={() => setIsSidebarOpen(false)}>×</button>
              </div>
              <nav className="sidebar-nav">
                <button onClick={() => { navigate('/'); setIsSidebarOpen(false); }}>
                  <span className="sidebar-icon">🏠</span> Home
                </button>
              </nav>
              <div className="sidebar-search">
                <label>Search Menu</label>
                <input 
                  type="text" 
                  placeholder="Search for cookies..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Topbar - hidden on mobile via CSS */}
      <div className="home-topbar">
        <input 
          type="text" 
          className="search-bar" 
          placeholder="Search for cookies..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <motion.header 
        initial={{ y: -50, opacity: 0 }} 
        animate={{ y: 0, opacity: 1 }} 
        className="header"
      >
        <img src="/logo.jpg" alt="Saltmuchhh Logo" className="logo float-anim" />
        <h1>SALTMUCHHH</h1>
        <p style={{marginBottom: '15px'}}>Freshly Baked Cookies, Straight from the Oven.</p>
        {config?.storeTiming && (
          <div className="store-timing-banner">
            🕒 Store Timings: {formatTime(config.storeTiming.startTime)} to {formatTime(config.storeTiming.endTime)}
          </div>
        )}
      </motion.header>

      <main className="main-content">
        <h2 className="section-title">Our Menu</h2>

        <div className="products-grid">
          {filteredProducts.map((product) => {
            const mainImage = product.images && product.images.length > 0 ? `http://localhost:5000${product.images[0]}` : '/placeholder.jpg';
            
            // Get starting price
            let startingPrice = 0;
            if (product.variants && product.variants.length > 0) {
              startingPrice = Math.min(...product.variants.map(v => v.price));
            }

            return (
              <motion.div 
                key={product._id} 
                className="product-card"
                whileHover={{ y: -5 }}
              >
                <div className="product-image-wrapper">
                  <img src={mainImage} alt={product.name} className="product-image" />
                </div>
                <div className="product-card-text">
                  <h3>{product.name}</h3>
                  <p className="description">{product.description.substring(0, 80)}...</p>

                  <div className="price-display">
                    From Rs. {startingPrice}
                  </div>

                  <div className="actions">
                    <button className="btn" onClick={() => navigate(`/product/${product._id}`)}>
                      View Options & Order
                    </button>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </main>

        <footer className="footer print-no" style={{textAlign: 'center'}}>
        <p><strong>© 2026 SaltMuchhh All rights reserved By MHK</strong></p>
      </footer>


      {/* Cart Drawer */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div className="cart-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsCartOpen(false)} />
            <motion.div className="cart-drawer" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ bounce: 0 }}>
              <div className="cart-header">
                <h2>Your Cart</h2>
                <button className="close-btn" onClick={() => setIsCartOpen(false)}>×</button>
              </div>

              <div className="cart-items">
                {cart.length === 0 ? <p className="empty-cart">Your cart is empty.</p> : (
                  cart.map((item, idx) => (
                    <div key={idx} className="cart-item">
                      <div className="item-info">
                        <h4>{item.productName}</h4>
                        <p>{item.variantText}</p>
                        {item.selectedAddons && item.selectedAddons.length > 0 && (
                          <p className="addon-text">+ {item.selectedAddons.map(a => a.name).join(', ')}</p>
                        )}
                      </div>
                      <div className="item-price">
                        <span>Rs. {item.price}</span>
                        <button className="remove-btn" onClick={() => removeFromCart(idx)}>🗑️</button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {cart.length > 0 && (
                <div className="checkout-section">
                  <div className="cart-total">
                    <h3>Total:</h3><h3>Rs. {cartTotal}</h3>
                  </div>
                  <p style={{ color: '#e74c3c', fontSize: '0.9rem', marginBottom: '15px', textAlign: 'center' }}>
                    <strong>Note:</strong> Delivery charges will be payed by you.
                  </p>
                  <h4>Delivery Details</h4>
                  <form onSubmit={submitOrder} className="checkout-form">
                    <input required type="text" name="fullName" placeholder="Full Name" value={formData.fullName} onChange={(e) => setFormData({...formData, fullName: e.target.value})} />
                    <input required type="text" name="phoneNo" placeholder="Phone Number" value={formData.phoneNo} onChange={(e) => setFormData({...formData, phoneNo: e.target.value})} />
                    <input required type="text" name="houseNo" placeholder="House No." value={formData.houseNo} onChange={(e) => setFormData({...formData, houseNo: e.target.value})} />
                    <input required type="text" name="streetName" placeholder="Street Name / No." value={formData.streetName} onChange={(e) => setFormData({...formData, streetName: e.target.value})} />
                    <input required type="text" name="areaName" placeholder="Area Name" value={formData.areaName} onChange={(e) => setFormData({...formData, areaName: e.target.value})} />
                    <select name="city" value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})}>
                      {config?.cities?.map((city, idx) => <option key={idx} value={city}>{city}</option>)}
                    </select>
                    <button type="submit" className="btn submit-btn">Confirm Order</button>
                  </form>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {orderConfirmed && (
          <motion.div className="cart-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
            <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="confirmation-section glass-panel" style={{ background: 'var(--primary-bg)', padding: '40px', borderRadius: '15px', position: 'relative' }}>
              <div className="success-icon">✓</div>
              <h2>Order Confirmed!</h2>
              <p style={{marginBottom: '10px', fontSize: '1.2rem'}}>Your Order ID: <strong style={{color: 'var(--text-main)'}}>{orderConfirmed.orderNumber}</strong></p>
              <p>Thank you for your order. Please save your Order ID to track it.</p>
              <p className="delivery-time">Estimated Delivery: <strong>{config?.timeDuration}</strong></p>
              <button className="btn mt-20" onClick={() => setOrderConfirmed(false)}>Close</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
