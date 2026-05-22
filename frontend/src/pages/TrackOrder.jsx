import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import './TrackOrder.css';

const API_URL = 'http://localhost:5000/api';

export default function TrackOrder() {
  const navigate = useNavigate();
  const [trackingId, setTrackingId] = useState('');
  const [trackingResult, setTrackingResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleTrackOrder = async () => {
    if (!trackingId) return toast.error('Please enter an order ID');
    setLoading(true);
    setTrackingResult(null);
    try {
      const res = await axios.get(`${API_URL}/orders/track/${trackingId}`);
      if (res.data.success) {
        setTrackingResult(res.data.order);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to track order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="track-order-page">
      <div className="track-page-topbar">
        <button className="back-home-btn" onClick={() => navigate('/')}>← Back to Home</button>
        <h1>Track Your Order</h1>
      </div>

      <div className="track-panel glass-panel">
        <p>Enter your order ID to see the latest status, items, and total price.</p>

        <div className="track-input-row">
          <input
            value={trackingId}
            onChange={(e) => setTrackingId(e.target.value)}
            placeholder="Enter Order ID"
            className="track-order-input"
          />
          <button className="btn" onClick={handleTrackOrder} disabled={loading}>
            {loading ? 'Checking...' : 'Track Order'}
          </button>
        </div>

        {trackingResult && (
          <div className="track-result glass-panel">
            <div className="result-header">
              <div>
                <h2>Order #{trackingResult.orderNumber || trackingResult._id}</h2>
                <p>{new Date(trackingResult.createdAt).toLocaleString()}</p>
              </div>
              <span className={`status-pill ${trackingResult.status.toLowerCase()}`}>{trackingResult.status}</span>
            </div>

            <div className="result-block">
              <p><strong>Customer:</strong> {trackingResult.customerDetails?.fullName || 'Unknown'}</p>
              <p><strong>Phone:</strong> {trackingResult.customerDetails?.phoneNo || 'Unknown'}</p>
              <p><strong>Total:</strong> Rs. {trackingResult.totalPrice}</p>
            </div>

            <div className="result-block">
              <h3>Items Ordered</h3>
              <ul>
                {trackingResult.items?.map((item, idx) => (
                  <li key={idx}>
                    {item.quantity}x {item.productName} - Rs. {item.price}
                    {item.selectedAddons?.length > 0 && (
                      <div className="addon-list">Add-ons: {item.selectedAddons.map(a => a.name).join(', ')}</div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
