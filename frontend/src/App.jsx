import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import axios from 'axios';
import Home from './pages/Home';
import Admin from './pages/Admin';
import ProductDetails from './pages/ProductDetails';
import TrackOrder from './pages/TrackOrder';

function App() {
  useEffect(() => {
    // Warm cache ASAP so first Home render can be faster.
    const warmCache = async () => {
      try {
        const [prodRes, confRes] = await Promise.all([
          axios.get('/api/products'),
          axios.get('/api/config')
        ]);
        if (Array.isArray(prodRes.data)) {
          localStorage.setItem('saltmuchhh_products', JSON.stringify(prodRes.data));
        }
        if (confRes.data && !confRes.data.includes?.('<!DOCTYPE html>')) {
          localStorage.setItem('saltmuchhh_config', JSON.stringify(confRes.data));
        }
      } catch {
        // Non-blocking; Home will handle errors/loading.
      }
    };

    warmCache();
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/product/:id" element={<ProductDetails />} />
        <Route path="/track-order" element={<TrackOrder />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </Router>
  );
}

export default App;
