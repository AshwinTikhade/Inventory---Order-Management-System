import React, { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const [stats, setStats] = useState({
    total_products: 0,
    total_customers: 0,
    total_orders: 0,
    low_stock_products: []
  });
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);

  const [loading, setLoading] = useState(true);
  const [globalError, setGlobalError] = useState(null);
  const [globalSuccess, setGlobalSuccess] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({ name: '', sku: '', price: '', quantity: '' });
  const [productFormErrors, setProductFormErrors] = useState({});

  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [customerForm, setCustomerForm] = useState({ name: '', email: '', phone: '' });
  const [customerFormErrors, setCustomerFormErrors] = useState({});
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [orderCustomerId, setOrderCustomerId] = useState('');
  const [orderItems, setOrderItems] = useState([{ product_id: '', quantity: 1 }]);
  const [orderFormErrors, setOrderFormErrors] = useState({});

  const [orderDetailsModalOpen, setOrderDetailsModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteType, setDeleteType] = useState('');
  const [idToDelete, setIdToDelete] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setGlobalError(null);
    try {
      const [statsRes, prodRes, custRes, ordRes] = await Promise.all([
        fetch(`${API_URL}/dashboard/stats`).then(r => r.ok ? r.json() : null),
        fetch(`${API_URL}/products`).then(r => r.ok ? r.json() : []),
        fetch(`${API_URL}/customers`).then(r => r.ok ? r.json() : []),
        fetch(`${API_URL}/orders`).then(r => r.ok ? r.json() : [])
      ]);

      if (statsRes) setStats(statsRes);
      setProducts(prodRes);
      setCustomers(custRes);
      setOrders(ordRes);
    } catch (err) {
      setGlobalError('Could not fetch data. Ensure the backend server is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const showSuccess = (msg) => {
    setGlobalSuccess(msg);
    setTimeout(() => setGlobalSuccess(null), 4000);
  };

  const showError = (msg) => {
    setGlobalError(msg);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openAddProduct = () => {
    setEditingProduct(null);
    setProductForm({ name: '', sku: '', price: '', quantity: '' });
    setProductFormErrors({});
    setProductModalOpen(true);
  };

  const openEditProduct = (prod) => {
    setEditingProduct(prod);
    setProductForm({
      name: prod.name,
      sku: prod.sku,
      price: prod.price.toString(),
      quantity: prod.quantity.toString()
    });
    setProductFormErrors({});
    setProductModalOpen(true);
  };

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!productForm.name.trim()) errors.name = 'Product name is required';
    if (!productForm.sku.trim()) errors.sku = 'SKU is required';
    else if (productForm.sku.length < 2) errors.sku = 'SKU must be at least 2 characters';

    const priceFloat = parseFloat(productForm.price);
    if (isNaN(priceFloat) || priceFloat < 0) errors.price = 'Price must be a positive number';

    const qtyInt = parseInt(productForm.quantity);
    if (isNaN(qtyInt) || qtyInt < 0) errors.quantity = 'Quantity must be a positive integer';

    if (Object.keys(errors).length > 0) {
      setProductFormErrors(errors);
      return;
    }

    try {
      const url = editingProduct ? `${API_URL}/products/${editingProduct.id}` : `${API_URL}/products`;
      const method = editingProduct ? 'PUT' : 'POST';
      const body = {
        name: productForm.name,
        sku: productForm.sku,
        price: priceFloat,
        quantity: qtyInt
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to save product');
      }

      showSuccess(`Product '${productForm.name}' successfully ${editingProduct ? 'updated' : 'created'}!`);
      setProductModalOpen(false);
      fetchData();
    } catch (err) {
      showError(err.message);
    }
  };

  const openAddCustomer = () => {
    setCustomerForm({ name: '', email: '', phone: '' });
    setCustomerFormErrors({});
    setCustomerModalOpen(true);
  };

  const handleCustomerSubmit = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!customerForm.name.trim()) errors.name = 'Full name is required';

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!customerForm.email.trim()) errors.email = 'Email address is required';
    else if (!emailRegex.test(customerForm.email)) errors.email = 'Enter a valid email address';

    if (!customerForm.phone.trim()) errors.phone = 'Phone number is required';
    else if (customerForm.phone.length < 5) errors.phone = 'Phone must be at least 5 digits';

    if (Object.keys(errors).length > 0) {
      setCustomerFormErrors(errors);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customerForm)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to register customer');
      }

      showSuccess(`Customer '${customerForm.name}' registered successfully!`);
      setCustomerModalOpen(false);
      fetchData();
    } catch (err) {
      showError(err.message);
    }
  };

  const openCreateOrder = () => {
    if (customers.length === 0) {
      showError('Please add at least one customer before creating an order.');
      return;
    }
    if (products.length === 0) {
      showError('Please add at least one product with stock before creating an order.');
      return;
    }
    setOrderCustomerId('');
    setOrderItems([{ product_id: '', quantity: 1 }]);
    setOrderFormErrors({});
    setOrderModalOpen(true);
  };

  const handleAddOrderItemRow = () => {
    setOrderItems([...orderItems, { product_id: '', quantity: 1 }]);
  };

  const handleRemoveOrderItemRow = (index) => {
    const newItems = [...orderItems];
    newItems.splice(index, 1);
    setOrderItems(newItems);
  };

  const handleOrderItemChange = (index, field, value) => {
    const newItems = [...orderItems];
    if (field === 'quantity') {
      newItems[index].quantity = parseInt(value) || 0;
    } else {
      newItems[index].product_id = value;
    }
    setOrderItems(newItems);
  };

  const calculateOrderTotal = () => {
    let total = 0;
    orderItems.forEach(item => {
      const prod = products.find(p => p.id === parseInt(item.product_id));
      if (prod) {
        total += prod.price * item.quantity;
      }
    });
    return total;
  };

  const handleOrderSubmit = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!orderCustomerId) errors.customer_id = 'Please select a customer';

    const filteredItems = orderItems.filter(item => item.product_id !== '');
    if (filteredItems.length === 0) {
      errors.items = 'Please select at least one product';
    } else {
      const itemErrors = [];
      const seenProducts = new Set();

      filteredItems.forEach((item, index) => {
        const prod = products.find(p => p.id === parseInt(item.product_id));
        if (!prod) {
          itemErrors[index] = 'Invalid product selected';
        } else {
          if (seenProducts.has(item.product_id)) {
            itemErrors[index] = 'Product is duplicated. Consolidate quantities.';
          } else {
            seenProducts.add(item.product_id);
          }

          if (item.quantity <= 0) {
            itemErrors[index] = 'Quantity must be at least 1';
          } else if (item.quantity > prod.quantity) {
            itemErrors[index] = `Insufficient stock! Only ${prod.quantity} items available.`;
          }
        }
      });

      if (itemErrors.some(x => x)) {
        errors.itemErrors = itemErrors;
      }
    }

    if (Object.keys(errors).length > 0) {
      setOrderFormErrors(errors);
      return;
    }

    const payload = {
      customer_id: parseInt(orderCustomerId),
      items: filteredItems.map(item => ({
        product_id: parseInt(item.product_id),
        quantity: item.quantity
      }))
    };

    try {
      const res = await fetch(`${API_URL}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to place order.');
      }

      showSuccess(`Order successfully created! Order ID: ${data.id}`);
      setOrderModalOpen(false);
      fetchData();
    } catch (err) {
      showError(err.message);
    }
  };

  const openOrderDetails = (order) => {
    setSelectedOrder(order);
    setOrderDetailsModalOpen(true);
  };

  const triggerDelete = (type, id) => {
    setDeleteType(type);
    setIdToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const executeDelete = async () => {
    setDeleteConfirmOpen(false);
    let path = '';
    if (deleteType === 'product') path = `products/${idToDelete}`;
    else if (deleteType === 'customer') path = `customers/${idToDelete}`;
    else if (deleteType === 'order') path = `orders/${idToDelete}`;

    try {
      const res = await fetch(`${API_URL}/${path}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || `Failed to cancel or delete ${deleteType}.`);
      }

      showSuccess(`Successfully deleted the selected ${deleteType}.`);
      fetchData();
    } catch (err) {
      showError(err.message);
    }
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredOrders = orders.filter(o => {
    const custName = o.customer?.name || '';
    const orderIdStr = o.id.toString();
    return custName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      orderIdStr.includes(searchQuery);
  });

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="logo-container">
          <span className="logo-icon">📦</span>
          <span className="logo-text">STOCKFLOW</span>
        </div>
        <nav>
          <ul className="nav-menu">
            <li
              className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => { setActiveTab('dashboard'); setSearchQuery(''); }}
            >
              <span>📊</span> Dashboard
            </li>
            <li
              className={`nav-item ${activeTab === 'products' ? 'active' : ''}`}
              onClick={() => { setActiveTab('products'); setSearchQuery(''); }}
            >
              <span>📦</span> Products
            </li>
            <li
              className={`nav-item ${activeTab === 'customers' ? 'active' : ''}`}
              onClick={() => { setActiveTab('customers'); setSearchQuery(''); }}
            >
              <span>👥</span> Customers
            </li>
            <li
              className={`nav-item ${activeTab === 'orders' ? 'active' : ''}`}
              onClick={() => { setActiveTab('orders'); setSearchQuery(''); }}
            >
              <span>🛒</span> Orders
            </li>
          </ul>
        </nav>
      </aside>

      <main className="main-content">

        {globalError && (
          <div className="alert alert-danger">
            <span>⚠️ {globalError}</span>
            <button className="modal-close" style={{ color: 'var(--danger)' }} onClick={() => setGlobalError(null)}>&times;</button>
          </div>
        )}

        {globalSuccess && (
          <div className="alert alert-success">
            <span>✨ {globalSuccess}</span>
            <button className="modal-close" style={{ color: 'var(--success)' }} onClick={() => setGlobalSuccess(null)}>&times;</button>
          </div>
        )}

        {loading && (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
            Loading live updates from inventory database...
          </div>
        )}

        {!loading && (
          <>
            {/* ==================== DASHBOARD VIEW ==================== */}
            {activeTab === 'dashboard' && (
              <section>
                <div className="header-section">
                  <div>
                    <h1 className="page-title">Management Dashboard</h1>
                    <p className="page-subtitle">Real-time counts and business analytics tracking.</p>
                  </div>
                  <button className="btn btn-primary" onClick={fetchData}>🔄 Sync Data</button>
                </div>

                <div className="metrics-grid">
                  <div className="metric-card">
                    <span className="metric-label">Total Products</span>
                    <span className="metric-value">{stats.total_products}</span>
                    <span className="metric-trend" style={{ color: 'var(--primary)' }}>Products tracked</span>
                  </div>
                  <div className="metric-card">
                    <span className="metric-label">Total Customers</span>
                    <span className="metric-value">{stats.total_customers}</span>
                    <span className="metric-trend" style={{ color: 'var(--accent)' }}>Active profiles</span>
                  </div>
                  <div className="metric-card">
                    <span className="metric-label">Completed Orders</span>
                    <span className="metric-value">{stats.total_orders}</span>
                    <span className="metric-trend" style={{ color: 'var(--success)' }}>Fulfillments</span>
                  </div>
                  <div className="metric-card" style={{ borderLeft: stats.low_stock_products.length > 0 ? '3px solid var(--danger)' : '1px solid var(--border)' }}>
                    <span className="metric-label">Low Stock Alerts</span>
                    <span className="metric-value" style={{ color: stats.low_stock_products.length > 0 ? 'var(--danger)' : 'inherit' }}>
                      {stats.low_stock_products.length}
                    </span>
                    <span className="metric-trend" style={{ color: stats.low_stock_products.length > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
                      {stats.low_stock_products.length > 0 ? 'Stock level critical (< 10)' : 'Stock healthy'}
                    </span>
                  </div>
                </div>

                <div className="glass-panel">
                  <h2 className="panel-title" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ color: 'var(--danger)' }}>⚠️</span> Critical Low Stock Items
                  </h2>

                  {stats.low_stock_products.length === 0 ? (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                      All systems green. No products are currently below the critical threshold of 10 items.
                    </p>
                  ) : (
                    <div className="table-container">
                      <table className="custom-table">
                        <thead>
                          <tr>
                            <th>SKU</th>
                            <th>Product Name</th>
                            <th>Price</th>
                            <th>Stock Count</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stats.low_stock_products.map(prod => (
                            <tr key={prod.id}>
                              <td style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{prod.sku}</td>
                              <td>{prod.name}</td>
                              <td>${prod.price.toFixed(2)}</td>
                              <td>
                                <span className={`badge ${prod.quantity === 0 ? 'badge-danger' : 'badge-warning'}`}>
                                  {prod.quantity === 0 ? 'OUT OF STOCK' : `${prod.quantity} left`}
                                </span>
                              </td>
                              <td>
                                <button className="btn btn-secondary btn-sm" onClick={() => openEditProduct(prod)}>✏️ Restock</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* ==================== PRODUCTS SCREEN ==================== */}
            {activeTab === 'products' && (
              <section>
                <div className="header-section">
                  <div>
                    <h1 className="page-title">Product Catalog</h1>
                    <p className="page-subtitle">Manage items, stock counts, pricing, and SKUs.</p>
                  </div>
                  <button className="btn btn-primary" onClick={openAddProduct}>➕ New Product</button>
                </div>

                <div className="glass-panel">
                  <div className="controls-row">
                    <div className="search-input-wrapper">
                      <span className="search-icon">🔍</span>
                      <input
                        type="text"
                        placeholder="Search SKU or Name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="search-input"
                      />
                    </div>
                  </div>

                  {filteredProducts.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-state-icon">📦</div>
                      <p className="empty-state-title">No products found</p>
                      <p style={{ fontSize: '0.85rem' }}>Create a new catalog item or adjust your search filter.</p>
                    </div>
                  ) : (
                    <div className="table-container">
                      <table className="custom-table">
                        <thead>
                          <tr>
                            <th>ID</th>
                            <th>SKU</th>
                            <th>Product Name</th>
                            <th>Price</th>
                            <th>Stock Count</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredProducts.map(prod => (
                            <tr key={prod.id}>
                              <td>{prod.id}</td>
                              <td style={{ fontFamily: 'monospace', fontWeight: 'bold', color: 'var(--primary)' }}>{prod.sku}</td>
                              <td>{prod.name}</td>
                              <td>${prod.price.toFixed(2)}</td>
                              <td>
                                <span className={`badge ${prod.quantity >= 10 ? 'badge-success' : prod.quantity > 0 ? 'badge-warning' : 'badge-danger'}`}>
                                  {prod.quantity === 0 ? 'OUT OF STOCK' : `${prod.quantity} in stock`}
                                </span>
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                                  <button className="btn btn-secondary btn-sm" onClick={() => openEditProduct(prod)}>✏️ Edit</button>
                                  <button className="btn btn-danger btn-sm" onClick={() => triggerDelete('product', prod.id)}>❌ Delete</button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* ==================== CUSTOMERS SCREEN ==================== */}
            {activeTab === 'customers' && (
              <section>
                <div className="header-section">
                  <div>
                    <h1 className="page-title">Customer Directories</h1>
                    <p className="page-subtitle">Review business profiles, register buyers, and contact info.</p>
                  </div>
                  <button className="btn btn-primary" onClick={openAddCustomer}>➕ New Customer</button>
                </div>

                <div className="glass-panel">
                  <div className="controls-row">
                    <div className="search-input-wrapper">
                      <span className="search-icon">🔍</span>
                      <input
                        type="text"
                        placeholder="Search Name or Email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="search-input"
                      />
                    </div>
                  </div>

                  {filteredCustomers.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-state-icon">👥</div>
                      <p className="empty-state-title">No customers registered</p>
                      <p style={{ fontSize: '0.85rem' }}>Add customer profiles to start recording order balances.</p>
                    </div>
                  ) : (
                    <div className="table-container">
                      <table className="custom-table">
                        <thead>
                          <tr>
                            <th>ID</th>
                            <th>Customer Name</th>
                            <th>Email Address</th>
                            <th>Phone Contact</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredCustomers.map(cust => (
                            <tr key={cust.id}>
                              <td>{cust.id}</td>
                              <td style={{ fontWeight: '600' }}>{cust.name}</td>
                              <td>{cust.email}</td>
                              <td style={{ fontFamily: 'monospace' }}>{cust.phone}</td>
                              <td style={{ textAlign: 'right' }}>
                                <button className="btn btn-danger btn-sm" onClick={() => triggerDelete('customer', cust.id)}>❌ Delete</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* ==================== ORDERS SCREEN ==================== */}
            {activeTab === 'orders' && (
              <section>
                <div className="header-section">
                  <div>
                    <h1 className="page-title">Fulfillment Orders</h1>
                    <p className="page-subtitle">Track receipts, inspect sub-items, and handle cancellations.</p>
                  </div>
                  <button className="btn btn-primary" onClick={openCreateOrder}>🛒 Create Order</button>
                </div>

                <div className="glass-panel">
                  <div className="controls-row">
                    <div className="search-input-wrapper">
                      <span className="search-icon">🔍</span>
                      <input
                        type="text"
                        placeholder="Search Customer or Order ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="search-input"
                      />
                    </div>
                  </div>

                  {filteredOrders.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-state-icon">🛒</div>
                      <p className="empty-state-title">No orders recorded</p>
                      <p style={{ fontSize: '0.85rem' }}>Construct a shopping order to begin stock deduction logs.</p>
                    </div>
                  ) : (
                    <div className="table-container">
                      <table className="custom-table">
                        <thead>
                          <tr>
                            <th>Order ID</th>
                            <th>Customer</th>
                            <th>Items Count</th>
                            <th>Total Order Cost</th>
                            <th>Date Created</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredOrders.map(order => {
                            const itemCount = order.items ? order.items.reduce((acc, curr) => acc + curr.quantity, 0) : 0;
                            return (
                              <tr key={order.id}>
                                <td style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>#{order.id}</td>
                                <td>
                                  <div>{order.customer ? order.customer.name : 'Unknown Customer'}</div>
                                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{order.customer?.email}</span>
                                </td>
                                <td>{itemCount} units</td>
                                <td style={{ fontWeight: 'bold', color: 'var(--primary)' }}>${order.total_amount.toFixed(2)}</td>
                                <td>{new Date(order.created_at).toLocaleString()}</td>
                                <td style={{ textAlign: 'right' }}>
                                  <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                                    <button className="btn btn-secondary btn-sm" onClick={() => openOrderDetails(order)}>👁️ View</button>
                                    <button className="btn btn-danger btn-sm" onClick={() => triggerDelete('order', order.id)}>❌ Cancel</button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </section>
            )}
          </>
        )}

      </main>

      {/* ==================== PRODUCT CREATION MODAL ==================== */}
      {productModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">{editingProduct ? '✏️ Edit Catalog Product' : '➕ Create New Product'}</h3>
              <button className="modal-close" onClick={() => setProductModalOpen(false)}>&times;</button>
            </div>
            <form onSubmit={handleProductSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Product Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Mechanical Keyboard"
                    value={productForm.name}
                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                    className="form-input"
                  />
                  {productFormErrors.name && <div className="form-error">{productFormErrors.name}</div>}
                </div>

                <div className="form-group">
                  <label className="form-label">SKU / Code</label>
                  <input
                    type="text"
                    placeholder="e.g. KB-MECH-87"
                    value={productForm.sku}
                    onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                    className="form-input"
                    disabled={!!editingProduct}
                  />
                  {productFormErrors.sku && <div className="form-error">{productFormErrors.sku}</div>}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Price ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={productForm.price}
                      onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                      className="form-input"
                    />
                    {productFormErrors.price && <div className="form-error">{productFormErrors.price}</div>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Quantity in Stock</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={productForm.quantity}
                      onChange={(e) => setProductForm({ ...productForm, quantity: e.target.value })}
                      className="form-input"
                    />
                    {productFormErrors.quantity && <div className="form-error">{productFormErrors.quantity}</div>}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setProductModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingProduct ? 'Save Changes' : 'Create Product'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== CUSTOMER CREATION MODAL ==================== */}
      {customerModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">👥 Register New Customer</h3>
              <button className="modal-close" onClick={() => setCustomerModalOpen(false)}>&times;</button>
            </div>
            <form onSubmit={handleCustomerSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    placeholder="e.g. John Doe"
                    value={customerForm.name}
                    onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                    className="form-input"
                  />
                  {customerFormErrors.name && <div className="form-error">{customerFormErrors.name}</div>}
                </div>

                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input
                    type="text"
                    placeholder="e.g. john.doe@example.com"
                    value={customerForm.email}
                    onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                    className="form-input"
                  />
                  {customerFormErrors.email && <div className="form-error">{customerFormErrors.email}</div>}
                </div>

                <div className="form-group">
                  <label className="form-label">Phone Contact</label>
                  <input
                    type="text"
                    placeholder="e.g. +1 (555) 123-4567"
                    value={customerForm.phone}
                    onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                    className="form-input"
                  />
                  {customerFormErrors.phone && <div className="form-error">{customerFormErrors.phone}</div>}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setCustomerModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Add Customer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== ORDER CREATION MODAL ==================== */}
      {orderModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content modal-lg">
            <div className="modal-header">
              <h3 className="modal-title">🛒 Construct Fulfill Order</h3>
              <button className="modal-close" onClick={() => setOrderModalOpen(false)}>&times;</button>
            </div>
            <form onSubmit={handleOrderSubmit}>
              <div className="modal-body">

                {/* Customer Selector */}
                <div className="form-group">
                  <label className="form-label">Customer Profile</label>
                  <select
                    value={orderCustomerId}
                    onChange={(e) => setOrderCustomerId(e.target.value)}
                    className="form-input"
                  >
                    <option value="">-- Choose Buyer Profile --</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
                    ))}
                  </select>
                  {orderFormErrors.customer_id && <div className="form-error">{orderFormErrors.customer_id}</div>}
                </div>

                {/* Items Builder */}
                <div style={{ marginTop: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <span className="form-label" style={{ margin: 0 }}>Item Lines</span>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddOrderItemRow}>➕ Add Line</button>
                  </div>

                  {orderFormErrors.items && <div className="form-error" style={{ marginBottom: '0.5rem' }}>{orderFormErrors.items}</div>}

                  <table className="custom-table order-builder-table">
                    <thead>
                      <tr>
                        <th style={{ width: '55%' }}>Product</th>
                        <th style={{ width: '20%' }}>Unit Price</th>
                        <th style={{ width: '15%' }}>Quantity</th>
                        <th style={{ width: '10%', textAlign: 'right' }}>Remove</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orderItems.map((item, idx) => {
                        const selectedProd = products.find(p => p.id === parseInt(item.product_id));
                        return (
                          <tr key={idx}>
                            <td>
                              <select
                                value={item.product_id}
                                onChange={(e) => handleOrderItemChange(idx, 'product_id', e.target.value)}
                                className="form-input"
                                style={{ padding: '0.4rem' }}
                              >
                                <option value="">-- Select Product --</option>
                                {products.map(p => (
                                  <option key={p.id} value={p.id} disabled={p.quantity === 0}>
                                    {p.name} [{p.sku}] ({p.quantity === 0 ? 'Out of stock' : `${p.quantity} available`})
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td>
                              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                {selectedProd ? `$${selectedProd.price.toFixed(2)}` : '-'}
                              </span>
                            </td>
                            <td>
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => handleOrderItemChange(idx, 'quantity', e.target.value)}
                                className="form-input"
                                style={{ padding: '0.4rem' }}
                              />
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <button
                                type="button"
                                className="btn btn-danger btn-sm"
                                style={{ padding: '0.3rem 0.5rem' }}
                                disabled={orderItems.length === 1}
                                onClick={() => handleRemoveOrderItemRow(idx)}
                              >
                                &times;
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {/* Field validations */}
                  {orderFormErrors.itemErrors && (
                    <div style={{ marginTop: '0.5rem' }}>
                      {orderFormErrors.itemErrors.map((err, idx) => err ? (
                        <div key={idx} className="form-error">Line {idx + 1}: {err}</div>
                      ) : null)}
                    </div>
                  )}
                </div>

                <div className="order-builder-footer">
                  <span className="form-label" style={{ margin: 0 }}>Auto-Calculated Balance</span>
                  <span className="total-amount-display">Total: ${calculateOrderTotal().toFixed(2)}</span>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setOrderModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Process Order</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== ORDER DETAILS MODAL ==================== */}
      {orderDetailsModalOpen && selectedOrder && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">👁️ Order Details #{selectedOrder.id}</h3>
              <button className="modal-close" onClick={() => setOrderDetailsModalOpen(false)}>&times;</button>
            </div>
            <div className="modal-body">
              {/* Buyer information */}
              <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1.25rem' }}>
                <p style={{ fontWeight: 'bold', fontSize: '0.95rem', marginBottom: '0.5rem', color: 'var(--primary)' }}>👤 Customer profile</p>
                <p style={{ fontSize: '0.9rem' }}>{selectedOrder.customer ? selectedOrder.customer.name : 'Unknown Customer'}</p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>✉️ {selectedOrder.customer?.email}</p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>📞 {selectedOrder.customer?.phone}</p>
              </div>

              {/* Items Details */}
              <p style={{ fontWeight: 'bold', fontSize: '0.95rem', marginBottom: '0.5rem' }}>🛒 Order lines</p>
              <div className="table-container">
                <table className="custom-table" style={{ fontSize: '0.85rem' }}>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>SKU</th>
                      <th>Qty</th>
                      <th>Price Paid</th>
                      <th>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrder.items && selectedOrder.items.map(item => (
                      <tr key={item.id}>
                        <td style={{ fontWeight: '600' }}>{item.product ? item.product.name : `Product ID: ${item.product_id}`}</td>
                        <td style={{ fontFamily: 'monospace' }}>{item.product ? item.product.sku : '-'}</td>
                        <td>{item.quantity} units</td>
                        <td>${item.unit_price.toFixed(2)}</td>
                        <td style={{ fontWeight: 'bold' }}>${(item.quantity * item.unit_price).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Ordered Date:</span>
                <span style={{ fontSize: '0.9rem' }}>{new Date(selectedOrder.created_at).toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                <span style={{ fontWeight: 'bold', fontSize: '1rem' }}>Grand Total Cost:</span>
                <span style={{ fontWeight: 'bold', fontSize: '1.1rem', color: 'var(--primary)' }}>${selectedOrder.total_amount.toFixed(2)}</span>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setOrderDetailsModalOpen(false)}>Close View</button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== DELETE CONFIRM MODAL ==================== */}
      {deleteConfirmOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3 className="modal-title">⚠️ Safety Confirmation</h3>
              <button className="modal-close" onClick={() => setDeleteConfirmOpen(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.95rem', lineHeight: '1.4' }}>
                Are you absolutely sure you want to delete or cancel this <strong>{deleteType}</strong>?
              </p>
              {deleteType === 'order' && (
                <p style={{ fontSize: '0.8rem', color: 'var(--warning)', marginTop: '0.5rem' }}>
                  💡 Cancelling/deleting an order will automatically restore stock balances back to your active inventory catalog.
                </p>
              )}
              {deleteType === 'product' && (
                <p style={{ fontSize: '0.8rem', color: 'var(--danger)', marginTop: '0.5rem' }}>
                  ⚠️ Deleting a product will cascade and permanently delete any historic transaction logs containing it.
                </p>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDeleteConfirmOpen(false)}>No, Keep It</button>
              <button className="btn btn-danger" onClick={executeDelete}>Yes, Delete</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;
