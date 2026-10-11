import React, { useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export default function App() {
  // Current user state (persisted in localStorage)
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('grocery_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Current active page: 'AUTH' | 'LISTS' | 'LIST_DETAIL'
  const [currentPage, setCurrentPage] = useState(user ? 'LISTS' : 'AUTH');
  const [selectedList, setSelectedList] = useState(null);

  // Sync auth state with current view
  const handleLoginSuccess = (userData) => {
    setUser(userData);
    localStorage.setItem('grocery_user', JSON.stringify(userData));
    setCurrentPage('LISTS');
  };

  const handleSignOut = () => {
    setUser(null);
    setSelectedList(null);
    localStorage.removeItem('grocery_user');
    setCurrentPage('AUTH');
  };

  const handleOpenList = (list) => {
    setSelectedList(list);
    setCurrentPage('LIST_DETAIL');
  };

  const handleBackToLists = () => {
    setSelectedList(null);
    setCurrentPage('LISTS');
  };

  return (
    <div>
      {/* Top Navigation */}
      <nav className="navbar">
        <div className="navbar-inner">
          <div className="brand">
            <span className="brand-icon">🛒</span>
            <span className="brand-title">Grocery List Manager</span>
          </div>
          {user && (
            <div className="user-status">
              <span className="user-badge">📱 {user.phone}</span>
              <button className="btn-signout" onClick={handleSignOut} title="Sign Out">
                Sign Out
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Main View Router (Max 3 Pages) */}
      <main className="app-container">
        {currentPage === 'AUTH' && (
          <AuthPage onLoginSuccess={handleLoginSuccess} />
        )}

        {currentPage === 'LISTS' && (
          <ListsPage
            user={user}
            onOpenList={handleOpenList}
          />
        )}

        {currentPage === 'LIST_DETAIL' && selectedList && (
          <ListDetailPage
            user={user}
            list={selectedList}
            onBack={handleBackToLists}
          />
        )}
      </main>

      <footer className="footer-note">
        Powered by <span>Minimoth OTP</span> &bull; 45-Minute Workshop Stack
      </footer>
    </div>
  );
}

// =============================================================================
// PAGE 1: AUTH PAGE (Registration / Login via Minimoth OTP)
// =============================================================================
function AuthPage({ onLoginSuccess }) {
  const [step, setStep] = useState('PHONE'); // 'PHONE' | 'OTP'
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!phone.trim()) {
      setError('Please enter a valid phone number.');
      return;
    }

    setError('');
    setInfo('');
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim() })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send OTP.');
      }

      setInfo(data.message || 'OTP sent via WhatsApp/SMS!');
      setStep('OTP');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!code.trim()) {
      setError('Please enter the 6-digit OTP code.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim(), code: code.trim() })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Verification failed.');
      }

      onLoginSuccess(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 440, margin: '30px auto' }}>
      <div className="card">
        <div className="page-header" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🥑</div>
          <h1 className="page-title" style={{ justifyContent: 'center' }}>
            Welcome
          </h1>
          <p className="page-subtitle">
            Sign in or register with your phone number via Minimoth OTP.
          </p>
        </div>

        {error && <div className="alert alert-error">⚠️ {error}</div>}
        {info && <div className="alert alert-success">✅ {info}</div>}

        {step === 'PHONE' ? (
          <form onSubmit={handleSendOtp}>
            <div className="form-group">
              <label className="form-label" htmlFor="phone-input">
                Mobile Number
              </label>
              <input
                id="phone-input"
                className="form-input"
                type="tel"
                placeholder="+91 98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={loading}
                autoFocus
              />
              <span style={{ fontSize: '0.76rem', color: '#64748b', display: 'block', marginTop: 4 }}>
                Enter with country code (e.g. +91 for India).
              </span>
            </div>

            <button
              id="btn-send-otp"
              type="submit"
              className="btn btn-primary btn-full"
              disabled={loading}
            >
              {loading ? 'Sending OTP...' : 'Send OTP Code'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp}>
            <div className="form-group">
              <label className="form-label" htmlFor="otp-input">
                6-Digit Verification Code
              </label>
              <input
                id="otp-input"
                className="form-input"
                type="text"
                placeholder="123456"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                disabled={loading}
                autoFocus
                style={{ textAlign: 'center', letterSpacing: '0.3em', fontSize: '1.2rem', fontWeight: 700 }}
              />
              <span style={{ fontSize: '0.76rem', color: '#64748b', display: 'block', marginTop: 4 }}>
                Sent to {phone} via WhatsApp / SMS
              </span>
            </div>

            <button
              id="btn-verify-otp"
              type="submit"
              className="btn btn-primary btn-full"
              disabled={loading}
            >
              {loading ? 'Verifying...' : 'Verify & Sign In'}
            </button>

            <button
              type="button"
              className="btn btn-secondary btn-full"
              style={{ marginTop: 10 }}
              onClick={() => {
                setStep('PHONE');
                setError('');
                setCode('');
              }}
              disabled={loading}
            >
              Change Phone Number
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// PAGE 2: LISTS OVERVIEW PAGE (Create & View Grocery Lists)
// =============================================================================
function ListsPage({ user, onOpenList }) {
  const [lists, setLists] = useState([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchLists = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch(`${API_BASE}/lists?userId=${user.id}`);
      if (!res.ok) {
        throw new Error('Failed to load lists.');
      }
      const data = await res.json();
      setLists(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchLists();
    }
  }, [user]);

  const handleCreateList = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      setSubmitting(true);
      setError('');
      const res = await fetch(`${API_BASE}/lists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, title: title.trim() })
      });

      const newList = await res.json();
      if (!res.ok) {
        throw new Error(newList.error || 'Failed to create list.');
      }

      setTitle('');
      setLists((prev) => [newList, ...prev]);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">
          <span>📋</span> My Grocery Lists
        </h1>
        <p className="page-subtitle">
          Organize your shopping lists for home, events, or weekly errands.
        </p>
      </div>

      {error && <div className="alert alert-error">⚠️ {error}</div>}

      {/* New List Form Card */}
      <div className="card">
        <form onSubmit={handleCreateList} className="form-row">
          <input
            id="new-list-title-input"
            className="form-input"
            type="text"
            placeholder="e.g. Weekly Farmers Market, Dinner Party..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={submitting}
          />
          <button
            id="btn-create-list"
            type="submit"
            className="btn btn-primary"
            disabled={submitting || !title.trim()}
          >
            {submitting ? 'Creating...' : '+ New List'}
          </button>
        </form>
      </div>

      {/* Lists Collection */}
      {loading ? (
        <div className="empty-state">
          <p>Loading your grocery lists...</p>
        </div>
      ) : lists.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-icon">🥬</div>
          <h3 className="empty-title">No grocery lists yet</h3>
          <p className="empty-text">
            Type a title above and click "+ New List" to start your first shopping list.
          </p>
        </div>
      ) : (
        <div className="lists-grid">
          {lists.map((item) => (
            <div
              key={item.id}
              className="list-item-card"
              onClick={() => onOpenList(item)}
            >
              <div className="list-item-info">
                <div className="list-icon">🛍️</div>
                <div>
                  <div className="list-title">{item.title}</div>
                  <div className="list-date">
                    Created on {new Date(item.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
              <div className="badge-count">
                {item.items?.length || 0} {item.items?.length === 1 ? 'item' : 'items'} &rarr;
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// PAGE 3: LIST DETAIL & ITEMS PAGE (Add & Manage Items in a List)
// =============================================================================
function ListDetailPage({ user, list, onBack }) {
  const [items, setItems] = useState(list.items || []);
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Local checkmark state for shopper satisfaction
  const [checkedItems, setCheckedItems] = useState({});

  const toggleChecked = (itemId) => {
    setCheckedItems((prev) => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setSubmitting(true);
      setError('');

      const res = await fetch(`${API_BASE}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listId: list.id,
          name: name.trim(),
          quantity: quantity.trim() || undefined
        })
      });

      const newItem = await res.json();
      if (!res.ok) {
        throw new Error(newItem.error || 'Failed to add item.');
      }

      setName('');
      setQuantity('');
      setItems((prev) => [newItem, ...prev]);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <button className="btn-back" onClick={onBack}>
        &larr; Back to Lists
      </button>

      <div className="page-header">
        <h1 className="page-title">
          <span>🥕</span> {list.title}
        </h1>
        <p className="page-subtitle">
          {items.length} {items.length === 1 ? 'item' : 'items'} planned
        </p>
      </div>

      {error && <div className="alert alert-error">⚠️ {error}</div>}

      {/* Add Item Card */}
      <div className="card">
        <form onSubmit={handleAddItem}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: 10 }}>
            <input
              id="item-name-input"
              className="form-input"
              type="text"
              placeholder="Item name (e.g. Fresh Spinach)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={submitting}
              autoFocus
            />
            <input
              id="item-qty-input"
              className="form-input"
              type="text"
              placeholder="Qty (e.g. 500g)"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              disabled={submitting}
            />
            <button
              id="btn-add-item"
              type="submit"
              className="btn btn-primary"
              disabled={submitting || !name.trim()}
            >
              {submitting ? 'Adding...' : '+ Add'}
            </button>
          </div>
        </form>
      </div>

      {/* Grocery Items List */}
      {items.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-icon">🛒</div>
          <h3 className="empty-title">Your list is empty</h3>
          <p className="empty-text">Add items above to build your grocery checklist.</p>
        </div>
      ) : (
        <div className="grocery-items-list">
          {items.map((it) => {
            const isDone = !!checkedItems[it.id];
            return (
              <div
                key={it.id}
                className={`item-row ${isDone ? 'completed' : ''}`}
                onClick={() => toggleChecked(it.id)}
                style={{ cursor: 'pointer' }}
              >
                <div className="item-left">
                  <div className={`checkbox-custom ${isDone ? 'checked' : ''}`}>
                    {isDone ? '✓' : ''}
                  </div>
                  <span className="item-name">{it.name}</span>
                </div>
                {it.quantity && (
                  <span className="item-quantity-pill">{it.quantity}</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
