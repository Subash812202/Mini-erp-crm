const fetch = global.fetch || require('node-fetch');
const roles = [
  { email: 'admin@example.com', role: 'ADMIN' },
  { email: 'sales@example.com', role: 'SALES' },
  { email: 'warehouse@example.com', role: 'WAREHOUSE' },
  { email: 'accounts@example.com', role: 'ACCOUNTS' }
];
const api = 'http://localhost:4000/api';
const now = Date.now();
const unique = now.toString();
async function request(url, method, token, body) {
  const opts = { method, headers: { Authorization: `Bearer ${token}` } };
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(url, opts);
  let data;
  try { data = await res.json(); } catch (e) { data = null; }
  return { status: res.status, ok: res.ok, data };
}
async function run() {
  const tokens = {};
  for (const r of roles) {
    const resp = await request(`${api}/auth/login`, 'POST', '', { email: r.email, password: 'Password123!' });
    tokens[r.role] = resp.ok ? resp.data.data.token : null;
    console.log(`${r.role} login: ${resp.status} ${resp.ok ? 'ok' : JSON.stringify(resp.data)}`);
  }
  const adminToken = tokens.ADMIN;
  const adminHeaders = adminToken;
  const cEdit = await request(`${api}/customers`, 'POST', adminHeaders, {
    name: `PermCustEdit ${unique}`,
    mobile: `9000000${unique.slice(-4)}`,
    email: `perm.edit.${unique}@example.com`,
    businessName: 'PermEdit Co',
    gstNumber: `GST${unique.slice(-6)}`,
    customerType: 'RETAIL',
    address: 'Addr',
    status: 'LEAD'
  });
  const cDelete = await request(`${api}/customers`, 'POST', adminHeaders, {
    name: `PermCustDelete ${unique}`,
    mobile: `9000001${unique.slice(-4)}`,
    email: `perm.del.${unique}@example.com`,
    businessName: 'PermDelete Co',
    gstNumber: `GST${unique.slice(-6)}D`,
    customerType: 'RETAIL',
    address: 'Addr',
    status: 'LEAD'
  });
  const pEdit = await request(`${api}/products`, 'POST', adminHeaders, {
    name: `PermProdEdit ${unique}`,
    sku: `PERM-SKU-EDIT-${unique}`,
    unit: 'pcs',
    unitPrice: 30,
    openingStock: 20
  });
  const pDelete = await request(`${api}/products`, 'POST', adminHeaders, {
    name: `PermProdDelete ${unique}`,
    sku: `PERM-SKU-DEL-${unique}`,
    unit: 'pcs',
    unitPrice: 30,
    openingStock: 20
  });
  const pChallan = await request(`${api}/products`, 'POST', adminHeaders, {
    name: `PermProdChallan ${unique}`,
    sku: `PERM-SKU-CHL-${unique}`,
    unit: 'pcs',
    unitPrice: 50,
    openingStock: 20
  });
  if (!cEdit.ok || !cDelete.ok || !pEdit.ok || !pDelete.ok || !pChallan.ok) {
    console.error('Resource creation failed', { cEdit, cDelete, pEdit, pDelete, pChallan });
    process.exit(1);
  }
  const tests = [];
  for (const r of roles) {
    tests.push({ role: r.role, action: 'Customer Create', url: `${api}/customers`, method: 'POST', body: { name: `P Test ${r.role} ${unique}`, mobile: `900001${unique.slice(-4)}`, email: `perm.${r.role.toLowerCase()}.cust.${unique}@example.com`, businessName: 'Test', gstNumber: `GST${unique.slice(-6)}`, customerType: 'RETAIL', address: 'Addr', status: 'LEAD' } });
    tests.push({ role: r.role, action: 'Customer Edit', url: `${api}/customers/${cEdit.data.id}`, method: 'PUT', body: { name: `Updated PermCustEdit ${unique}` } });
    tests.push({ role: r.role, action: 'Customer Delete', url: `${api}/customers/${cDelete.data.id}`, method: 'DELETE' });
    tests.push({ role: r.role, action: 'Product Create', url: `${api}/products`, method: 'POST', body: { name: `P Test Prod ${r.role} ${unique}`, sku: `PERM-SKU-${r.role}-${unique}`, unit: 'pcs', unitPrice: 15, openingStock: 5 } });
    tests.push({ role: r.role, action: 'Product Edit', url: `${api}/products/${pEdit.data.id}`, method: 'PUT', body: { name: `Updated PermProdEdit ${unique}` } });
    tests.push({ role: r.role, action: 'Product Delete', url: `${api}/products/${pDelete.data.id}`, method: 'DELETE' });
    tests.push({ role: r.role, action: 'Challan Create', url: `${api}/challans`, method: 'POST', body: { customerId: cEdit.data.id, items: [{ productId: pChallan.data.id, quantity: 1 }] } });
    tests.push({ role: r.role, action: 'Stock List', url: `${api}/products/stock/movements`, method: 'GET' });
  }
  const results = [];
  for (const t of tests) {
    const token = tokens[t.role];
    const resp = await request(t.url, t.method, token, t.body);
    const allowed = resp.ok || resp.status === 201;
    results.push({ role: t.role, action: t.action, status: resp.status, ok: allowed, message: resp.data?.message || (resp.ok ? 'allowed' : 'denied') });
  }
  console.table(results);
}
run().catch(e => { console.error(e); process.exit(1); });
