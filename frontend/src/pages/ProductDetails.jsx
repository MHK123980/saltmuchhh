import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import './ProductDetails.css';

const API_URL = '/api';

export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [config, setConfig] = useState(null);
  const [mainImage, setMainImage] = useState('');
  
  const [variantIndex, setVariantIndex] = useState(0);
  const [selectedAddons, setSelectedAddons] = useState([]);
  
  // Cart is managed entirely on this page for now, or just instant checkout
  // Since user requested "cart option" previously, we should keep the cart drawer, 
  // but to keep things simple for this component, we can store cart in localStorage or pass state.
  // We will build a simple cart logic here.
  const [cart, setCart] = useState(JSON.parse(localStorage.getItem('saltmuchhh_cart')) || []);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [orderConfirmed, setOrderConfirmed] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '', phoneNo: '', houseNo: '', streetName: '', areaName: '', city: 'Karachi'
  });

  useEffect(() => {
    fetchProductAndConfig();
  }, [id]);

  useEffect(() => {
    localStorage.setItem('saltmuchhh_cart', JSON.stringify(cart));
  }, [cart]);

  const fetchProductAndConfig = async () => {
    try {
      const [configRes, productRes] = await Promise.all([
        axios.get(`${API_URL}/config`),
        axios.get(`${API_URL}/products`) // Getting all for now and finding by id
      ]);
      setConfig(configRes.data);
      const foundProduct = productRes.data.find(p => p._id === id);
      setProduct(foundProduct);
      
      if (foundProduct && foundProduct.images && foundProduct.images.length > 0) {
        setMainImage(`/${foundProduct.images[0]}`);
      } else {
        setMainImage('/placeholder.jpg');
      }
    } catch (err) {
      toast.error('Failed to load product');
    }
  };

  const handleAddonChange = (addonName, isChecked) => {
    if (isChecked) {
      const addon = config.addons.find(a => a.name === addonName);
      setSelectedAddons([...selectedAddons, addon]);
    } else {
      setSelectedAddons(selectedAddons.filter(a => a.name !== addonName));
    }
  };

  const getProductTotal = () => {
    if (!product || !product.variants[variantIndex]) return 0;
    const basePrice = product.variants[variantIndex].price;
    const addonsPrice = selectedAddons.reduce((sum, addon) => sum + addon.price, 0);
    return basePrice + addonsPrice;
  };

  const handleAddToCart = () => {
    const variant = product.variants[variantIndex];
    if (!variant) return;

    const cartItem = {
      productId: product._id,
      productName: product.name,
      quantity: variant.quantity,
      selectedAddons: selectedAddons,
      price: getProductTotal(),
      variantText: `${variant.quantity} Cookies`
    };

    setCart([...cart, cartItem]);
    toast.success(`${product.name} Added to Cart!`);
  };

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
        setOrderConfirmed(true);
        setCart([]);
        setIsCartOpen(false);
      }
    } catch (err) {
      toast.error('Failed to place order. Please try again.');
    }
  };

  const checkStoreOpen = () => {
    if (!config || !config.storeTiming) return true;
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const parseTime = (timeStr) => {
      if (!timeStr) return 0;
      const [h, m] = timeStr.split(':').map(Number);
      return h * 60 + m;
    };

    const startMinutes = parseTime(config.storeTiming.startTime);
    const endMinutes = parseTime(config.storeTiming.endTime);

    if (startMinutes <= endMinutes) {
      return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    } else {
      return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
    }
  };

  const storeOpen = checkStoreOpen();

  if (!product || !config) return <div className="loading">Loading...</div>;

  return (
    <div className="product-page-container">
      <div className="oven-background"></div>

      {/* Cart Button */}
      {!orderConfirmed && (
        <button className="floating-cart-btn" onClick={() => setIsCartOpen(true)}>
          🛒 Cart <span className="cart-badge">{cart.length}</span>
        </button>
      )}

      {/* Back to Menu - Fixed like cart button */}
      {!orderConfirmed && (
        <button className="floating-back-btn" onClick={() => navigate('/')}>← Back to Menu</button>
      )}

      {/* Header */}
      <header className="page-header">
        <h1 className="header-title">SALTMUCHHH</h1>
      </header>

      {/* Main Layout */}
      {!orderConfirmed ? (
        <main className="product-main fade-in">
          <div className="product-gallery">
            <img src={mainImage} alt={product.name} className="main-image" />
            {product.images && product.images.length > 1 && (
              <div className="thumbnail-list">
                {product.images.map((img, idx) => (
                  <img 
                    key={idx} 
                    src={`/${img}`} 
                    alt="Thumbnail" 
                    className={`thumbnail ${mainImage === `/${img}` ? 'active' : ''}`}
                    onClick={() => setMainImage(`/${img}`)}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="product-info">
            <h2>{product.name}</h2>
            <p className="product-desc">{product.description}</p>
            
            <div className="selector-group">
              <label>Select Deal:</label>
              <select value={variantIndex} onChange={(e) => setVariantIndex(Number(e.target.value))}>
                {product.variants.map((v, idx) => (
                  <option key={idx} value={idx}>{v.quantity} Cookies - Rs. {v.price}</option>
                ))}
              </select>
            </div>

            {product.allowAddons !== false && (
              <div className="addons-group">
                <label>Optional Add-ons:</label>
                {config.addons && config.addons.length > 0 ? (
                  config.addons.map((addon, idx) => {
                    const isChecked = selectedAddons.some(a => a.name === addon.name);
                    return (
                      <label key={idx} className="checkbox-label">
                        <input 
                          type="checkbox" 
                          checked={isChecked} 
                          onChange={(e) => handleAddonChange(addon.name, e.target.checked)} 
                        />
                        + {addon.name} (+ Rs. {addon.price})
                      </label>
                    );
                  })
                ) : (
                  <p style={{fontSize: '0.9rem', color: '#666'}}>No add-ons available.</p>
                )}
              </div>
            )}

            <div className="total-display">
              Total: Rs. {getProductTotal()}
            </div>

            <button 
              className="btn add-to-cart-btn" 
              onClick={handleAddToCart}
              disabled={!storeOpen}
              style={!storeOpen ? { backgroundColor: '#666', cursor: 'not-allowed' } : {}}
            >
              {storeOpen ? 'Add to Cart' : 'Opening Soon'}
            </button>
          </div>
        </main>
      ) : (
        <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="confirmation-section glass-panel">
          <div className="success-icon">✓</div>
          <h2>Order Confirmed!</h2>
          <p>Thank you for your order.</p>
          <p className="delivery-time">Estimated Delivery: <strong>{config.timeDuration}</strong></p>
          <button className="btn mt-20" onClick={() => navigate('/')}>Return to Menu</button>
        </motion.div>
      )}

      {/* Cart Drawer */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div className="cart-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsCartOpen(false)} />
            <motion.div className="cart-drawer glass-panel" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ bounce: 0 }}>
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
                      {config.cities.map((city, idx) => <option key={idx} value={city}>{city}</option>)}
                    </select>
                    <button type="submit" className="btn submit-btn">Confirm Order</button>
                  </form>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}
