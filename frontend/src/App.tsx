import { useEffect, useState } from 'react';
import { Link, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import api from './api';

const customerTypes = ['RETAIL', 'WHOLESALE', 'DISTRIBUTOR'] as const;
const statusOptions = ['LEAD', 'ACTIVE', 'INACTIVE'] as const;

type CustomerType = (typeof customerTypes)[number];

type CustomerFormModel = {
  name: string;
  mobile: string;
  email: string;
  businessName: string;
  gstNumber: string;
  customerType: CustomerType;
  address: string;
  followUpDate: string;
  status: string;
};

type ProductFormModel = {
  name: string;
  sku: string;
  unit: string;
  unitPrice: string;
  openingStock: string;
};

function formatDate(value?: string) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString();
}

function formatProductStatus(product: any) {
  if (product.currentStock <= 0) return 'OUT OF STOCK';
  if (product.currentStock <= (product.minimumStock || 0)) return 'LOW STOCK';
  return 'ACTIVE';
}

function getUser() {
  return JSON.parse(localStorage.getItem('user') || '{}') as any;
}

function hasRole(...roles: string[]) {
  const user = getUser();
  return roles.includes(user.role);
}

function Login() {
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('Password123!');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', data.data.token);
      localStorage.setItem('user', JSON.stringify(data.data.user));
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed');
    }
  }

  return <div className="login"><form className="card login-card" onSubmit={submit}>
    <h1>Mini ERP</h1><p>ERP + CRM Operations Portal</p>
    {error && <div className="error">{error}</div>}
    <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" />
    <input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="Password" />
    <button>Sign in</button>
    <small>Demo: admin@example.com / Password123!</small>
  </form></div>;
}

function Layout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const user = getUser();
  const isAdmin = user.role === 'ADMIN';
  const isSales = user.role === 'SALES';
  const isWarehouse = user.role === 'WAREHOUSE';
  const isAccounts = user.role === 'ACCOUNTS';
  const canViewCustomers = isAdmin || isSales || isAccounts;
  const canViewProducts = isAdmin || isSales || isWarehouse || isAccounts;
  const canViewChallans = isAdmin || isSales || isAccounts;
  const canViewStockMovements = isAdmin || isWarehouse || isAccounts;

  return <div className="app">
    <aside><h2>Mini ERP</h2><p className="muted">{user.role}</p>
      <nav>
        <Link to="/dashboard">Dashboard</Link>
        {canViewCustomers && <Link to="/customers">Customers</Link>}
        {canViewProducts && <Link to="/products">Products</Link>}
        {canViewChallans && <Link to="/challans">Challans</Link>}
        {canViewStockMovements && <Link to="/stock-movements">Stock Movements</Link>}
      </nav>
      <button className="logout" onClick={() => { localStorage.clear(); navigate('/login'); }}>Logout</button>
    </aside>
    <main><header><span>Operations Portal</span><strong>{user.name}</strong></header>{children}</main>
  </div>;
}

function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  useEffect(() => { api.get('/dashboard/stats').then(r => setStats(r.data.data)).catch(() => { }); }, []);
  const cards = stats ? [
    ['Customers', stats.customers], ['Active Customers', stats.activeCustomers],
    ['Products', stats.products], ['Inventory', stats.inventoryQuantity],
    ['Low Stock', stats.lowStock], ['Draft Challans', stats.draft], ['Confirmed', stats.confirmed]
  ] : [];
  return <Layout><h1>Dashboard</h1><div className="grid">{cards.map(([a, b]) => <div className="card stat" key={a}><span>{a}</span><b>{b}</b></div>)}</div></Layout>;
}

function StockMovements() {
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const canViewStock = hasRole('ADMIN', 'WAREHOUSE', 'ACCOUNTS');

  useEffect(() => {
    if (!canViewStock) return;
    setLoading(true);
    api.get('/products/stock/movements')
      .then(r => setMovements(r.data.data || []))
      .catch(err => setError(err.response?.data?.message || 'Unable to load stock movements'))
      .finally(() => setLoading(false));
  }, [canViewStock]);

  if (!canViewStock) return <Navigate to="/dashboard" replace />;

  return <Layout>
    <div className="page-head">
      <h1>Stock Movements</h1>
    </div>
    {loading && <div className="card">Loading stock movements...</div>}
    {error && <div className="card error">{error}</div>}
    {!loading && !error && <div className="card">
      <table className="table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Product</th>
            <th>Type</th>
            <th>Qty</th>
            <th>Reason</th>
            <th>By</th>
          </tr>
        </thead>
        <tbody>
          {movements.length === 0 && <tr><td colSpan={6}>No stock movements found.</td></tr>}
          {movements.map(m => <tr key={m.id}>
            <td>{formatDate(m.createdAt)}</td>
            <td>{m.product?.name ?? m.productName ?? 'Unknown'}</td>
            <td>{m.type}</td>
            <td>{m.quantity}</td>
            <td>{m.reason}</td>
            <td>{m.createdBy?.name ?? m.createdByName ?? 'System'}</td>
          </tr>)}
        </tbody>
      </table>
    </div>}
  </Layout>;
}

function CustomerList() {
  const [data, setData] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const user = getUser();
  const isAdmin = user.role === 'ADMIN';
  const canManageCustomers = isAdmin || user.role === 'SALES';
  const canDeleteCustomers = isAdmin;

  const loadCustomers = () => {
    api.get('/customers', { params: { search } }).then(r => setData(r.data.data || [])).catch(() => { });
  };

  useEffect(() => {
    loadCustomers();
  }, [search]);

  async function deleteCustomer(id: number) {
    if (!window.confirm('Are you sure you want to delete this customer?')) return;
    try {
      await api.delete(`/customers/${id}`);
      setData(prev => prev.filter(x => x.id !== id));
    } catch {
      loadCustomers();
    }
  }

  return <Layout>
    <div className="page-head">
      <div>
        <h1>Customers</h1>
        <input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      {canManageCustomers && <button onClick={() => navigate('/customers/new')}>Add customer</button>}
    </div>
    <div className="card table-wrap">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Mobile</th>
            <th>Email</th>
            <th>Business</th>
            <th>Type</th>
            <th>Follow-up</th>
            <th>Status</th>
            {isAdmin && <th>Action</th>}
          </tr>
        </thead>
        <tbody>
          {data.map(x => <tr key={x.id} onClick={() => navigate(`/customers/${x.id}`)} style={{ cursor: 'pointer' }}>
            <td>{x.name}</td>
            <td>{x.mobile}</td>
            <td>{x.email || '—'}</td>
            <td>{x.businessName || '—'}</td>
            <td>{x.customerType}</td>
            <td>{formatDate(x.followUpDate)}</td>
            <td>{x.status}</td>
            {isAdmin && <td><button className="delete-button" onClick={(e) => { e.stopPropagation(); deleteCustomer(x.id); }}>Delete</button></td>}
          </tr>)}
        </tbody>
      </table>
    </div>
  </Layout>;
}

function CustomerForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const user = getUser();
  const canManageCustomers = user.role === 'ADMIN' || user.role === 'SALES';
  if (!canManageCustomers) return <Navigate to="/dashboard" replace />;
  const [customer, setCustomer] = useState<CustomerFormModel>({
    name: '', mobile: '', email: '', businessName: '', gstNumber: '', customerType: 'RETAIL',
    address: '', followUpDate: '', status: 'LEAD'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    api.get(`/customers/${id}`).then(r => {
      const data = r.data.data;
      setCustomer({
        name: data.name || '',
        mobile: data.mobile || '',
        email: data.email || '',
        businessName: data.businessName || '',
        gstNumber: data.gstNumber || '',
        customerType: data.customerType || 'RETAIL',
        address: data.address || '',
        followUpDate: data.followUpDate ? data.followUpDate.slice(0, 10) : '',
        status: data.status || 'LEAD'
      });
    }).catch(() => { });
  }, [id, isEdit]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const payload = {
      ...customer,
      followUpDate: customer.followUpDate || null,
    };

    try {
      if (isEdit) {
        await api.put(`/customers/${id}`, payload);
        navigate(`/customers/${id}`);
      } else {
        const { data } = await api.post('/customers', payload);
        navigate(`/customers/${data.data.id}`);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Save failed');
    } finally {
      setLoading(false);
    }
  }

  return <Layout>
    <div className="page-head"><h1>{isEdit ? 'Edit customer' : 'Add customer'}</h1></div>
    <div className="card">
      <form onSubmit={submit} className="form-grid">
        {error && <div className="error">{error}</div>}
        <input value={customer.name} onChange={e => setCustomer({ ...customer, name: e.target.value })} placeholder="Name" required />
        <input value={customer.mobile} onChange={e => setCustomer({ ...customer, mobile: e.target.value })} placeholder="Mobile" required />
        <input value={customer.email} onChange={e => setCustomer({ ...customer, email: e.target.value })} placeholder="Email" type="email" />
        <input value={customer.gstNumber} onChange={e => setCustomer({ ...customer, gstNumber: e.target.value })} placeholder="GST number" />
        <input value={customer.businessName} onChange={e => setCustomer({ ...customer, businessName: e.target.value })} placeholder="Business name" />
        <select value={customer.customerType} onChange={e => setCustomer({ ...customer, customerType: e.target.value as CustomerType })}>
          {customerTypes.map(type => <option key={type} value={type}>{type}</option>)}
        </select>
        <select value={customer.status} onChange={e => setCustomer({ ...customer, status: e.target.value })}>
          {statusOptions.map(status => <option key={status} value={status}>{status}</option>)}
        </select>
        <input value={customer.address} onChange={e => setCustomer({ ...customer, address: e.target.value })} placeholder="Address" />
        <input value={customer.followUpDate} onChange={e => setCustomer({ ...customer, followUpDate: e.target.value })} type="date" placeholder="Follow-up date" />
        <button type="submit" disabled={loading}>{loading ? 'Saving...' : (isEdit ? 'Update customer' : 'Create customer')}</button>
      </form>
    </div>
  </Layout>;
}

function ProductForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const user = getUser();
  const canManageProducts = user.role === 'ADMIN' || user.role === 'WAREHOUSE';
  if (!canManageProducts) return <Navigate to="/dashboard" replace />;
  const [product, setProduct] = useState<ProductFormModel>({ name: '', sku: '', unit: '', unitPrice: '', openingStock: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    api.get(`/products/${id}`).then(r => {
      const data = r.data.data;
      setProduct({
        name: data.name || '',
        sku: data.sku || '',
        unit: data.category || '',
        unitPrice: data.unitPrice?.toString() || '',
        openingStock: ''
      });
    }).catch(() => { setError('Failed to load product'); });
  }, [id, isEdit]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!product.name.trim() || !product.sku.trim() || !product.unit.trim() || !product.unitPrice.trim() || (!isEdit && !product.openingStock.trim())) {
      setError('Please fill in all required fields.');
      setLoading(false);
      return;
    }

    const payload: any = {
      name: product.name,
      sku: product.sku,
      unit: product.unit,
      unitPrice: product.unitPrice
    };

    if (!isEdit) {
      payload.openingStock = product.openingStock;
    }

    try {
      if (isEdit) {
        await api.put(`/products/${id}`, payload);
      } else {
        await api.post('/products', payload);
      }
      navigate('/products');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Save failed');
    } finally {
      setLoading(false);
    }
  }

  return <Layout>
    <div className="page-head"><h1>{isEdit ? 'Edit product' : 'Add product'}</h1></div>
    <div className="card">
      <form onSubmit={submit} className="form-grid">
        {error && <div className="error">{error}</div>}
        <input value={product.name} onChange={e => setProduct({ ...product, name: e.target.value })} placeholder="Product name" required />
        <input value={product.sku} onChange={e => setProduct({ ...product, sku: e.target.value })} placeholder="SKU" required />
        <input value={product.unit} onChange={e => setProduct({ ...product, unit: e.target.value })} placeholder="Unit" required />
        <input value={product.unitPrice} onChange={e => setProduct({ ...product, unitPrice: e.target.value })} placeholder="Selling price" type="number" min="0" step="0.01" required />
        {!isEdit && <input value={product.openingStock} onChange={e => setProduct({ ...product, openingStock: e.target.value })} placeholder="Opening stock" type="number" min="0" required />}
        <button type="submit" disabled={loading}>{loading ? 'Saving...' : (isEdit ? 'Update product' : 'Create product')}</button>
      </form>
    </div>
  </Layout>;
}

function ChallanForm() {
  const navigate = useNavigate();
  const user = getUser();
  const canManageChallans = user.role === 'ADMIN' || user.role === 'SALES';
  if (!canManageChallans) return <Navigate to="/dashboard" replace />;
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [customerId, setCustomerId] = useState<number | ''>('');
  const [items, setItems] = useState<Array<{ productId: number | ''; quantity: number; product?: any }>>([{ productId: '', quantity: 1 }]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/customers').then(r => setCustomers(r.data.data || [])).catch(() => { });
    api.get('/products').then(r => setProducts(r.data.data || [])).catch(() => { });
  }, []);

  const updateItem = (index: number, changes: Partial<{ productId: number | ''; quantity: number; product?: any }>) => {
    setItems(prev => prev.map((item, idx) => idx === index ? { ...item, ...changes } : item));
  };

  const addItem = () => setItems(prev => [...prev, { productId: '', quantity: 1 }]);
  const removeItem = (index: number) => setItems(prev => prev.filter((_, idx) => idx !== index));

  const computeTotals = () => {
    return items.reduce((acc, item) => {
      const product = products.find(p => p.id === item.productId);
      if (!product || !item.quantity) return acc;
      acc.totalQty += item.quantity;
      acc.totalAmount += Number(product.unitPrice) * item.quantity;
      return acc;
    }, { totalQty: 0, totalAmount: 0 });
  };

  const { totalQty, totalAmount } = computeTotals();

  const validate = () => {
    if (!customerId) return 'Please select a customer.';
    if (items.some(item => !item.productId)) return 'Please select a product for every row.';
    if (items.some(item => item.quantity <= 0)) return 'Quantity must be greater than zero.';
    if (items.some(item => {
      const product = products.find(p => p.id === item.productId);
      return product && item.quantity > product.currentStock;
    })) return 'One or more quantities exceed available stock.';
    return '';
  };

  async function saveDraft() {
    setError('');
    const validationError = validate();
    if (validationError) return setError(validationError);
    setSaving(true);
    try {
      await api.post('/challans', { customerId, items: items.map(item => ({ productId: item.productId, quantity: item.quantity })) });
      setSuccess('Challan saved as draft.');
      navigate('/challans');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save challan.');
    } finally {
      setSaving(false);
    }
  }

  async function saveAndConfirm() {
    setError('');
    const validationError = validate();
    if (validationError) return setError(validationError);
    setSaving(true);
    try {
      const { data } = await api.post('/challans', { customerId, items: items.map(item => ({ productId: item.productId, quantity: item.quantity })) });
      await api.post(`/challans/${data.data.id}/confirm`);
      setSuccess('Challan created and confirmed.');
      navigate('/challans');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to confirm challan.');
    } finally {
      setSaving(false);
    }
  }

  return <Layout>
    <div className="page-head"><div><h1>Create Challan</h1><p>Select a customer and add products.</p></div></div>
    <div className="card">
      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}
      <div className="form-grid">
        <label>Customer</label>
        <select value={customerId} onChange={e => setCustomerId(Number(e.target.value) || '')}>
          <option value="">Select customer</option>
          {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.mobile})</option>)}
        </select>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Product</th><th>SKU</th><th>Price</th><th>Stock</th><th>Quantity</th><th>Action</th></tr>
          </thead>
          <tbody>
            {items.map((item, index) => {
              const product = products.find(p => p.id === item.productId);
              return <tr key={index}>
                <td>
                  <select value={item.productId} onChange={e => updateItem(index, { productId: Number(e.target.value) || '' })}>
                    <option value="">Select product</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </td>
                <td>{product?.sku || '—'}</td>
                <td>{product ? `₹${Number(product.unitPrice).toFixed(2)}` : '—'}</td>
                <td>{product?.currentStock ?? '—'}</td>
                <td><input type="number" min="1" value={item.quantity} onChange={e => updateItem(index, { quantity: Number(e.target.value) })} /></td>
                <td><button type="button" className="delete-button" onClick={() => removeItem(index)}>Remove</button></td>
              </tr>;
            })}
          </tbody>
        </table>
      </div>
      <button type="button" onClick={addItem}>Add product</button>
      <div className="card summary">
        <p><strong>Total quantity:</strong> {totalQty}</p>
        <p><strong>Total amount:</strong> ₹{totalAmount.toFixed(2)}</p>
      </div>
      <div className="button-row">
        <button type="button" disabled={saving} onClick={saveDraft}>Save as Draft</button>
        <button type="button" disabled={saving} onClick={saveAndConfirm}>Save and Confirm</button>
      </div>
    </div>
  </Layout>;
}

function ChallanDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [challan, setChallan] = useState<any>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const user = getUser();
  const canManageChallans = user.role === 'ADMIN' || user.role === 'SALES';
  const canDeleteChallans = user.role === 'ADMIN';

  useEffect(() => {
    if (!id) return;
    api.get(`/challans/${id}`).then(r => setChallan(r.data.data)).catch(() => setError('Failed to load challan')).finally(() => setLoading(false));
  }, [id]);

  async function handleConfirm() {
    if (!challan || !id) return;
    if (!window.confirm('Confirm this challan?')) return;
    setError('');
    try {
      await api.post(`/challans/${id}/confirm`);
      setSuccess('Challan confirmed.');
      api.get(`/challans/${id}`).then(r => setChallan(r.data.data));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to confirm challan.');
    }
  }

  async function handleCancel() {
    if (!challan || !id) return;
    if (!window.confirm('Cancel this challan?')) return;
    setError('');
    try {
      await api.post(`/challans/${id}/cancel`);
      setSuccess('Challan cancelled.');
      api.get(`/challans/${id}`).then(r => setChallan(r.data.data));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to cancel challan.');
    }
  }

  async function handleDelete() {
    if (!challan || !id) return;
    if (!window.confirm('Delete this challan?')) return;
    setError('');
    try {
      await api.delete(`/challans/${id}`);
      navigate('/challans');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete challan.');
    }
  }

  if (loading) return <Layout><div className="page-head"><h1>Challan detail</h1></div><div className="card">Loading challan...</div></Layout>;
  if (!challan) return <Layout><div className="page-head"><h1>Challan detail</h1></div><div className="card">Challan not found.</div></Layout>;

  const totalQty = challan.items.reduce((sum: number, item: any) => sum + item.quantity, 0);
  const totalAmount = challan.items.reduce((sum: number, item: any) => sum + Number(item.total), 0);

  return <Layout>
    <div className="page-head"><div><h1>Challan #{challan.number}</h1><p>{challan.customer?.name}</p></div>
      <button onClick={() => navigate('/challans')}>Back to challans</button>
    </div>
    {error && <div className="error">{error}</div>}
    {success && <div className="success">{success}</div>}
    <div className="card detail-grid">
      <div><strong>Challan number</strong><p>{challan.number}</p></div>
      <div><strong>Customer</strong><p>{challan.customer?.name || '—'}</p></div>
      <div><strong>Created by</strong><p>{challan.createdBy?.name || '—'}</p></div>
      <div><strong>Created date</strong><p>{new Date(challan.createdAt).toLocaleString()}</p></div>
      <div><strong>Status</strong><p>{challan.status}</p></div>
    </div>
    <div className="card table-wrap">
      <table>
        <thead><tr><th>Product</th><th>SKU</th><th>Price</th><th>Quantity</th><th>Total</th></tr></thead>
        <tbody>
          {challan.items.map((item: any) => <tr key={item.id}>
            <td>{item.productName}</td>
            <td>{item.sku}</td>
            <td>₹{Number(item.unitPrice).toFixed(2)}</td>
            <td>{item.quantity}</td>
            <td>₹{Number(item.total).toFixed(2)}</td>
          </tr>)}
        </tbody>
      </table>
    </div>
    <div className="card summary">
      <p><strong>Total quantity:</strong> {totalQty}</p>
      <p><strong>Total amount:</strong> ₹{totalAmount.toFixed(2)}</p>
    </div>
    <div className="button-row">
      {canManageChallans && challan.status === 'DRAFT' && <button type="button" onClick={handleConfirm}>Confirm</button>}
      {canManageChallans && (challan.status === 'DRAFT' || challan.status === 'CONFIRMED') && <button type="button" className="delete-button" onClick={handleCancel}>Cancel</button>}
      {canDeleteChallans && challan.status !== 'CONFIRMED' && <button type="button" className="delete-button" onClick={handleDelete}>Delete</button>}
    </div>
  </Layout>;
}

function CustomerDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<any>(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const user = getUser();
  const canManageCustomers = user.role === 'ADMIN' || user.role === 'SALES';

  useEffect(() => {
    if (!id) return;
    api.get(`/customers/${id}`).then(r => setCustomer(r.data.data)).catch(() => { });
  }, [id]);

  async function saveNote(e: React.FormEvent) {
    e.preventDefault();
    if (!note.trim() || !id) return;
    setSaving(true);
    setError('');
    try {
      const { data } = await api.post(`/customers/${id}/followups`, { note });
      setCustomer((prev: any) => ({ ...prev, followUps: [data.data, ...(prev.followUps || [])] }));
      setNote('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  if (!customer) return <Layout><div className="page-head"><h1>Customer detail page</h1></div><div className="card">Loading customer...</div></Layout>;

  return <Layout>
    <div className="page-head"><div><h1>Customer detail page</h1><p>{customer.name}</p></div>
      {canManageCustomers && <button onClick={() => navigate(`/customers/${id}/edit`)}>Edit customer</button>}
    </div>
    <div className="card detail-grid">
      <div><strong>Name</strong><p>{customer.name}</p></div>
      <div><strong>Mobile</strong><p>{customer.mobile}</p></div>
      <div><strong>Email</strong><p>{customer.email || '—'}</p></div>
      <div><strong>GST number</strong><p>{customer.gstNumber || '—'}</p></div>
      <div><strong>Customer type</strong><p>{customer.customerType}</p></div>
      <div><strong>Business</strong><p>{customer.businessName || '—'}</p></div>
      <div><strong>Address</strong><p>{customer.address || '—'}</p></div>
      <div><strong>Follow-up date</strong><p>{formatDate(customer.followUpDate)}</p></div>
      <div><strong>Status</strong><p>{customer.status}</p></div>
    </div>
    <div className="card">
      <h2>Follow-up notes</h2>
      {canManageCustomers && <form onSubmit={saveNote} className="form-grid">
        {error && <div className="error">{error}</div>}
        <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Add follow-up notes" rows={4} />
        <button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save note'}</button>
      </form>}
      {customer.followUps && customer.followUps.length > 0 ? <div className="notes-list">
        {customer.followUps.map((followUp: any) => <div className="note" key={followUp.id}>
          <div className="note-meta"><strong>{new Date(followUp.createdAt).toLocaleString()}</strong></div>
          <p>{followUp.note}</p>
        </div>)}
      </div> : <p>No follow-up notes yet.</p>}
    </div>
  </Layout>;
}

function List({ type }: { type: 'products'|'challans'|'customers' }) {
  const [data, setData] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const user = getUser();
  const isAdmin = user.role === 'ADMIN';
  const canEditProducts = user.role === 'ADMIN' || user.role === 'WAREHOUSE';
  const canDeleteProducts = user.role === 'ADMIN';
  const canAddProduct = user.role === 'ADMIN' || user.role === 'WAREHOUSE';
  const canManageChallans = user.role === 'ADMIN' || user.role === 'SALES';
  const canDeleteChallans = user.role === 'ADMIN';
  const canCreateChallan = canManageChallans;

  const loadData = () => {
    api.get(`/${type}`, { params: { search } }).then(r => setData(r.data.data || [])).catch(() => { });
  };

  useEffect(() => { loadData(); }, [type, search]);

  async function deleteProduct(id: number) {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      await api.delete(`/products/${id}`);
      setData(prev => prev.filter(x => x.id !== id));
    } catch (err: any) {
      window.alert(err.response?.data?.message || 'Delete failed');
      loadData();
    }
  }

  async function handleChallanConfirm(id: number) {
    if (!window.confirm('Confirm this challan?')) return;
    try {
      await api.post(`/challans/${id}/confirm`);
      loadData();
    } catch (err: any) {
      window.alert(err.response?.data?.message || 'Confirm failed');
    }
  }

  async function handleChallanCancel(id: number) {
    if (!window.confirm('Cancel this challan?')) return;
    try {
      await api.post(`/challans/${id}/cancel`);
      loadData();
    } catch (err: any) {
      window.alert(err.response?.data?.message || 'Cancel failed');
    }
  }

  async function handleChallanDelete(id: number) {
    if (!window.confirm('Delete this challan?')) return;
    try {
      await api.delete(`/challans/${id}`);
      loadData();
    } catch (err: any) {
      window.alert(err.response?.data?.message || 'Delete failed');
    }
  }

  return <Layout>
    <div className="page-head">
      <div>
        <h1>{type[0].toUpperCase()+type.slice(1)}</h1>
        <input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      {type === 'products' && canAddProduct ? <button onClick={() => navigate('/products/new')}>Add product</button> : null}
      {type === 'challans' && canCreateChallan ? <button onClick={() => navigate('/challans/new')}>Create Challan</button> : null}
    </div>
    <div className="card table-wrap">
      <table>
        <thead>
          <tr>
            {type === 'customers' ? <><th>Name</th><th>Mobile</th><th>Business</th><th>Status</th></> : type === 'products' ? <><th>Name</th><th>SKU</th><th>Unit</th><th>Selling Price</th><th>Stock</th><th>Status</th><th>Actions</th></> : <><th>Number</th><th>Customer</th><th>Status</th><th>Total</th><th>Actions</th></>}
          </tr>
        </thead>
        <tbody>
          {data.map(x => <tr key={x.id} style={{ cursor: type === 'customers' ? 'pointer' : 'default' }} onClick={type === 'customers' ? () => navigate(`/customers/${x.id}`) : undefined}>
            {type === 'customers' ? <><td>{x.name}</td><td>{x.mobile}</td><td>{x.businessName}</td><td>{x.status}</td></> : type === 'products' ? <>
              <td>{x.name}</td>
              <td>{x.sku}</td>
              <td>{x.category || x.unit || '—'}</td>
              <td>₹{Number(x.unitPrice).toFixed(2)}</td>
              <td>{x.currentStock}</td>
              <td>{formatProductStatus(x)}</td>
              <td>
                {(canEditProducts || canDeleteProducts) && <div>
                  {canEditProducts && <button className="button-small" onClick={e => { e.stopPropagation(); navigate(`/products/${x.id}/edit`); }}>Edit</button>}
                  {canDeleteProducts && <button className="delete-button button-small" onClick={e => { e.stopPropagation(); deleteProduct(x.id); }}>Delete</button>}
                </div>}
              </td>
            </> : <>
              <td>{x.number}</td>
              <td>{x.customer?.name}</td>
              <td>{x.status}</td>
              <td>₹{Number(x.totalAmount).toFixed(2)}</td>
              <td>
                <button className="button-small" onClick={e => { e.stopPropagation(); navigate(`/challans/${x.id}`); }}>View</button>
                {canManageChallans && x.status === 'DRAFT' && <><button className="button-small" onClick={e => { e.stopPropagation(); handleChallanConfirm(x.id); }}>Confirm</button><button className="delete-button button-small" onClick={e => { e.stopPropagation(); handleChallanCancel(x.id); }}>Cancel</button></>}
                {canManageChallans && x.status === 'CONFIRMED' && <button className="delete-button button-small" onClick={e => { e.stopPropagation(); handleChallanCancel(x.id); }}>Cancel</button>}
                {canDeleteChallans && x.status !== 'CONFIRMED' && <button className="delete-button button-small" onClick={e => { e.stopPropagation(); handleChallanDelete(x.id); }}>Delete</button>}
              </td>
            </>}
          </tr>)}
        </tbody>
      </table>
    </div>
  </Layout>;
}

function Protected({ children }: { children: React.ReactNode }) {
  return localStorage.getItem('token') ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return <Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
    <Route path="/customers" element={<Protected><CustomerList /></Protected>} />
    <Route path="/customers/new" element={<Protected><CustomerForm /></Protected>} />
    <Route path="/customers/:id" element={<Protected><CustomerDetails /></Protected>} />
    <Route path="/customers/:id/edit" element={<Protected><CustomerForm /></Protected>} />
    <Route path="/products" element={<Protected><List type="products" /></Protected>} />
    <Route path="/products/new" element={<Protected><ProductForm /></Protected>} />
    <Route path="/products/:id/edit" element={<Protected><ProductForm /></Protected>} />
    <Route path="/challans" element={<Protected><List type="challans" /></Protected>} />
    <Route path="/challans/new" element={<Protected><ChallanForm /></Protected>} />
    <Route path="/challans/:id" element={<Protected><ChallanDetails /></Protected>} />
    <Route path="/stock-movements" element={<Protected><StockMovements /></Protected>} />
    <Route path="*" element={<Navigate to="/login" replace />} />
  </Routes>;
}
