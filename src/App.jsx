import { useState, useEffect } from 'react'

function App() {
  const [currentView, setCurrentView] = useState('store') 
  const [medicines, setMedicines] = useState([])
  const [cart, setCart] = useState([])
  const [orders, setOrders] = useState([])
  
  const [selectedMed, setSelectedMed] = useState(null)
  
  const [loginData, setLoginData] = useState({ email: '', password: '' })
  const [isAdmin, setIsAdmin] = useState(false)
  const [checkoutData, setCheckoutData] = useState({ customerName: '', phone: '', address: '', paymentMethod: 'COD', transactionId: '' })
  
  const [newMed, setNewMed] = useState({ name: '', formula: '', price: '', stock: '', expiryDate: '', imageUrl: '', imageFile: null })

  const [toast, setToast] = useState(null)
  const showNotification = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const loadMedicines = async () => {
    const res = await fetch('https://pharma-care-1-8h90.onrender.com//api/medicines')
    setMedicines(await res.json())
  }

  const loadOrders = async () => {
    const res = await fetch('https://pharma-care-1-8h90.onrender.com//api/orders')
    setOrders(await res.json())
  }

  useEffect(() => { loadMedicines() }, [])

  useEffect(() => {
    let interval;
    if (isAdmin && currentView === 'adminDashboard') {
      interval = setInterval(() => { loadOrders() }, 5000);
    }
    return () => clearInterval(interval);
  }, [isAdmin, currentView])

  const addToCart = (med) => {
    const existing = cart.find(item => item._id === med._id)
    if (existing) {
      if (existing.cartQuantity < med.stock) {
        setCart(cart.map(item => item._id === med._id ? { ...item, cartQuantity: item.cartQuantity + 1 } : item))
        showNotification(`${med.name} cart mein add ho gayi!`, 'success')
      } else { showNotification("Stock khatam hai!", 'error') }
    } else {
      setCart([...cart, { ...med, cartQuantity: 1 }])
      showNotification(`${med.name} cart mein add ho gayi!`, 'success')
    }
  }

  const buyNow = (med) => {
    const existing = cart.find(item => item._id === med._id)
    if (!existing) {
        setCart([...cart, { ...med, cartQuantity: 1 }])
    }
    setSelectedMed(null)
    setCurrentView('cart')
  }

  const removeFromCart = (id) => setCart(cart.filter(item => item._id !== id))
  
  const cartSubTotal = cart.reduce((total, item) => total + (item.price * item.cartQuantity), 0)
  const deliveryCharges = (cartSubTotal > 0 && cartSubTotal < 1500) ? 250 : 0
  const cartTotal = cartSubTotal + deliveryCharges

  const handleCheckout = async (e) => {
    e.preventDefault()
    if (cart.length === 0) return showNotification("Empty cart", 'error')
    if (checkoutData.paymentMethod === 'JazzCash' && checkoutData.transactionId.length < 11) {
        return showNotification("Please enter a Till jazzcash id!", 'error')
    }
    
    const res = await fetch('https://pharma-care-1-8h90.onrender.com//api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...checkoutData, items: cart, totalBill: cartTotal })
    })
    
    if (res.ok) {
      showNotification("Order Successfully Placed!", 'success')
      setCart([])
      setCheckoutData({ customerName: '', phone: '', address: '', paymentMethod: 'COD', transactionId: '' })
      setCurrentView('store')
      loadMedicines()
    } else { showNotification("something is wrong.", 'error') }
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    const res = await fetch('https://pharma-care-1-8h90.onrender.com//api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loginData)
    })
    if (res.ok) {
      setIsAdmin(true)
      setCurrentView('adminDashboard')
      loadOrders()
      showNotification("Welcome Admin!", 'success')
    } else { showNotification("please enter a valid username or passward!", 'error') }
  }

  // یھاں سے سبز نوٹیفکیشن مکمل ڈیلیٹ کر دیا گیا ہے
  const updateOrderStatus = async (id, newStatus) => {
    await fetch(`https://pharma-care-1-8h90.onrender.com//${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    })
    loadOrders()
  }

  // WHATSAPP BUTTON LOGIC
  const sendWhatsApp = (order) => {
    const itemNames = order.items.map(i => `${i.name} (x${i.cartQuantity})`).join(', ');
    let msg = `Assalam o Alaikum ${order.customerName}!\n\nPharmaCare ki janib se aapke order ki details:\n📦 Status: *${order.status}*\n💊 Medicines: ${itemNames}\n💰 Total Bill: Rs ${order.totalBill}\n\nShukriya!`;
    
    let phone = order.phone.replace(/\D/g, ''); 
    if(phone.startsWith('0')) { phone = '92' + phone.substring(1); }
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  }

  // SMS BUTTON LOGIC
  const sendSMS = (order) => {
    const itemNames = order.items.map(i => `${i.name} (x${i.cartQuantity})`).join(', ');
    let msg = `Assalam o Alaikum ${order.customerName}!\nPharmaCare: Aapka order ab ${order.status} ho chuka hai.\nMedicines: ${itemNames}\nTotal Bill: Rs ${order.totalBill}`;
    window.location.href = `sms:${order.phone}?body=${encodeURIComponent(msg)}`;
  }

  const handleAddMedicine = async (e) => {
    e.preventDefault()
    const formData = new FormData();
    formData.append('name', newMed.name);
    formData.append('formula', newMed.formula);
    formData.append('price', newMed.price);
    formData.append('stock', newMed.stock);
    formData.append('expiryDate', newMed.expiryDate);
    formData.append('imageUrl', newMed.imageUrl);
    if (newMed.imageFile) formData.append('image', newMed.imageFile);

    await fetch('https://pharma-care-1-8h90.onrender.com/', { method: 'POST', body: formData })
    setNewMed({ name: '', formula: '', price: '', stock: '', expiryDate: '', imageUrl: '', imageFile: null })
    if(document.getElementById("fileInput")) document.getElementById("fileInput").value = "";
    loadMedicines()
    showNotification("Medicine Inventory mein add ho gayi!", 'success')
  }

  const handleDeleteMedicine = async (id) => {
    if (window.confirm("Delete this medicine?")) {
      await fetch(`https://pharma-care-1-8h90.onrender.com/${id}`, { method: 'DELETE' })
      loadMedicines()
      showNotification("Medicine delete ho gayi!", 'success')
    }
  }

  const fixPictures = async () => {
    if (window.confirm("Purani dawaiyan delete ho kar 72 nai dawaiyan add ho jayengi. Proceed?")) {
      await fetch('https://pharma-care-1-8h90.onrender.com/')
      loadMedicines()
      showNotification("All original pictures loaded!", 'success')
    }
  }

  const lowStockAlerts = medicines.filter(m => m.stock < 10);
  const expiryAlerts = medicines.filter(m => {
    const daysLeft = (new Date(m.expiryDate) - new Date()) / (1000 * 60 * 60 * 24);
    return daysLeft > 0 && daysLeft <= 60;
  });

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-10 relative">
      
      {toast && (
        <div className={`fixed top-5 right-5 z-[100] px-6 py-3 rounded-lg shadow-2xl text-white font-bold transition-all transform duration-300 ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.msg}
        </div>
      )}

      {selectedMed && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-[200] p-4">
              <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row relative">
                  <button onClick={() => setSelectedMed(null)} className="absolute top-3 right-4 text-gray-500 hover:text-red-500 text-2xl font-bold bg-white rounded-full w-8 h-8 flex justify-center items-center shadow">×</button>
                  <div className="md:w-1/2 bg-gray-100 p-8 flex justify-center items-center">
                      <img src={selectedMed.imageUrl || "https://images.unsplash.com/photo-1584308666744-24d5e4b6c310?auto=format&fit=crop&w=500&q=80"} alt={selectedMed.name} className="w-full h-auto object-cover rounded-xl shadow-sm border border-gray-200" />
                  </div>
                  <div className="md:w-1/2 p-8 flex flex-col justify-center">
                      <span className="text-blue-600 font-bold text-sm mb-1 uppercase tracking-wider">PharmaCare Verified</span>
                      <h2 className="text-3xl font-extrabold text-gray-800 mb-2">{selectedMed.name}</h2>
                      <p className="text-gray-500 text-sm mb-4">Formula: <span className="font-semibold text-gray-700">{selectedMed.formula}</span></p>
                      
                      <div className="bg-blue-50 p-4 rounded-lg mb-6">
                        <span className="text-4xl font-black text-blue-700">Rs {selectedMed.price}</span>
                        <p className="text-sm text-blue-600 mt-1">✓ Best Price Guaranteed</p>
                      </div>

                      <div className="flex items-center gap-3 mb-8">
                          <span className="font-semibold text-gray-700">Availability:</span>
                          <span className={`px-3 py-1 rounded-full text-sm font-bold shadow-sm ${selectedMed.stock > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {selectedMed.stock > 0 ? `${selectedMed.stock} in Stock` : 'Out of Stock'}
                          </span>
                      </div>

                      <div className="flex gap-4 mt-auto">
                          <button onClick={() => addToCart(selectedMed)} disabled={selectedMed.stock <= 0} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-lg shadow-md transition disabled:bg-gray-300">Add to Cart</button>
                          <button onClick={() => buyNow(selectedMed)} disabled={selectedMed.stock <= 0} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow-md transition disabled:bg-gray-300">Buy Now</button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      <nav className="bg-blue-800 text-white p-4 shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 onClick={() => setCurrentView('store')} className="text-xl md:text-2xl font-bold tracking-wider cursor-pointer flex items-center gap-2">
            🏥 PHARMA<span className="text-blue-300">CARE</span>
          </h1>
          <div className="flex space-x-2 md:space-x-6 items-center">
            <button onClick={() => setCurrentView('store')} className="hover:text-blue-200 font-semibold transition hidden md:block">Store</button>
            <button onClick={() => setCurrentView('cart')} className="bg-orange-500 hover:bg-orange-600 px-3 md:px-4 py-2 rounded-full font-bold shadow-lg transition flex items-center gap-2">
              🛒 Cart <span className="bg-white text-orange-600 px-2 rounded-full text-sm font-bold text-center w-6 h-6 leading-6">{cart.length}</span>
            </button>
            <button onClick={() => isAdmin ? setCurrentView('adminDashboard') : setCurrentView('adminLogin')} className="bg-gray-900 hover:bg-black px-3 md:px-4 py-2 rounded font-semibold text-sm transition">
              Admin
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-4 mt-6">

        {currentView === 'store' && (
          <div>
            <div className="bg-white p-6 rounded-xl shadow-sm mb-8 text-center border-t-4 border-blue-600">
              <h2 className="text-3xl font-bold text-gray-800">Online Pharmacy Store</h2>
              <p className="text-gray-500 mt-2 text-sm md:text-base">Free Delivery on orders above Rs 1500</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
              {medicines.map((med) => (
                <div key={med._id} className="bg-white rounded-xl shadow hover:shadow-xl transition overflow-hidden flex flex-col border border-gray-100 cursor-pointer group" onClick={() => setSelectedMed(med)}>
                  <div className="h-40 md:h-48 w-full bg-gray-100 overflow-hidden relative">
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition z-10 flex justify-center items-center">
                        <span className="text-white opacity-0 group-hover:opacity-100 font-bold bg-blue-600 px-3 py-1 rounded-full drop-shadow-md transition">View Details</span>
                    </div>
                    <img src={med.imageUrl || "https://images.unsplash.com/photo-1584308666744-24d5e4b6c310?auto=format&fit=crop&w=500&q=80"} alt={med.name} className="w-full h-full object-cover transition transform group-hover:scale-105" />
                  </div>
                  <div className="p-4 flex flex-col flex-1">
                    <h3 className="font-bold text-gray-800 text-base md:text-lg line-clamp-1">{med.name}</h3>
                    <div className="mt-2 mb-4 flex justify-between items-center">
                      <span className="font-extrabold text-blue-700 text-lg md:text-xl">Rs {med.price}</span>
                      <span className={`text-[10px] sm:text-xs font-bold px-2 py-1 rounded ${med.stock > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {med.stock > 0 ? 'In Stock' : 'Out of Stock'}
                      </span>
                    </div>
                    <div className="flex gap-2 mt-auto" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => addToCart(med)} disabled={med.stock <= 0} className={`flex-1 py-2 rounded font-bold transition text-xs sm:text-sm ${med.stock > 0 ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-sm' : 'bg-gray-200 text-gray-400'}`}>Add Cart</button>
                        <button onClick={() => buyNow(med)} disabled={med.stock <= 0} className={`flex-1 py-2 rounded font-bold transition text-xs sm:text-sm ${med.stock > 0 ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm' : 'bg-gray-200 text-gray-400'}`}>Buy Now</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {currentView === 'cart' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white rounded-xl shadow-md p-6 h-fit">
              <h2 className="text-xl md:text-2xl font-bold border-b pb-4 mb-4">Your Shopping Cart</h2>
              {cart.length === 0 ? <p className="text-center text-gray-500 py-10">Empty cart.</p> : (
                <div className="space-y-4">
                  {cart.map((item) => (
                    <div key={item._id} className="flex items-center justify-between border-b pb-4">
                      <div className="flex items-center gap-4">
                        <img src={item.imageUrl} className="w-16 h-16 object-cover bg-gray-50 rounded" />
                        <div><h4 className="font-bold">{item.name}</h4><p className="text-sm text-gray-500">Rs {item.price} x {item.cartQuantity}</p></div>
                      </div>
                      <div className="flex items-center gap-4"><span className="font-bold text-lg text-blue-700">Rs {item.price * item.cartQuantity}</span><button onClick={() => removeFromCart(item._id)} className="bg-red-100 text-red-600 px-3 py-1 rounded hover:bg-red-200">X</button></div>
                    </div>
                  ))}
                  
                  <div className="border-t pt-4 mt-6">
                    <div className="flex justify-between text-gray-600 mb-2"><span>Subtotal:</span> <span>Rs {cartSubTotal}</span></div>
                    <div className="flex justify-between text-gray-600 mb-2">
                      <span>Delivery Charges: <span className="text-xs text-green-600 ml-2">(Free over Rs 1500)</span></span> 
                      <span>Rs {deliveryCharges}</span>
                    </div>
                    <div className="flex justify-between text-2xl font-black mt-4 text-gray-800 border-t pt-4">
                      <span>Total Bill:</span> <span className="text-blue-700">Rs {cartTotal}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-md p-6 h-fit border-t-4 border-blue-600">
              <h2 className="text-lg md:text-xl font-bold border-b pb-4 mb-4">Checkout Details</h2>
              <form onSubmit={handleCheckout} className="space-y-4">
                <div><label className="block text-sm font-semibold mb-1">Full Name</label><input type="text" required onChange={(e) => setCheckoutData({...checkoutData, customerName: e.target.value})} className="w-full border p-2 rounded outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50" /></div>
                <div><label className="block text-sm font-semibold mb-1">WhatsApp / Phone Number</label><input type="text" placeholder="03xxxxxxxxx" required onChange={(e) => setCheckoutData({...checkoutData, phone: e.target.value})} className="w-full border p-2 rounded outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50" /></div>
                <div><label className="block text-sm font-semibold mb-1">Delivery Address</label><textarea required rows="3" onChange={(e) => setCheckoutData({...checkoutData, address: e.target.value})} className="w-full border p-2 rounded outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50"></textarea></div>
                
                <div>
                  <label className="block text-sm font-semibold mb-1">Payment Method</label>
                  <select onChange={(e) => setCheckoutData({...checkoutData, paymentMethod: e.target.value, transactionId: ''})} className="w-full border p-3 rounded outline-none font-bold bg-blue-50 text-blue-800">
                    <option value="COD">Cash on Delivery (COD)</option>
                    <option value="JazzCash">JazzCash Online Payment</option>
                  </select>
                  
                  {checkoutData.paymentMethod === 'JazzCash' && (
                    <div className="mt-3 p-4 bg-white border border-red-200 rounded-lg shadow-inner relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 bg-red-600 h-full"></div>
                      <h4 className="font-extrabold text-red-600 mb-2 flex items-center gap-2">📱 JazzCash Gateway</h4>
                      <p className="text-sm text-gray-700 mb-3">Please send exactly <strong className="text-lg text-black">Rs {cartTotal}</strong> to the following Merchant Account:</p>
                      <div className="bg-gray-100 p-3 rounded text-center mb-4 border border-gray-200">
                        <span className="block text-xs text-gray-500 uppercase font-bold">Account Number</span>
                        <span className="text-2xl tracking-widest font-black text-gray-800">03045518658</span>
                      </div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Enter 12-Digit Transaction ID (TID) *</label>
                      <input type="text" required placeholder="e.g. 012345678912" onChange={(e) => setCheckoutData({...checkoutData, transactionId: e.target.value})} className="w-full border-2 border-red-100 p-2 rounded outline-none focus:border-red-400 bg-red-50 text-center tracking-widest font-mono" />
                    </div>
                  )}
                </div>
                <button type="submit" disabled={cart.length === 0} className="w-full bg-green-600 text-white font-bold py-4 rounded hover:bg-green-700 shadow-lg transition disabled:bg-gray-400 mt-6 text-lg uppercase tracking-wide">Confirm Order</button>
              </form>
            </div>
          </div>
        )}

        {currentView === 'adminLogin' && (
          <div className="max-w-md mx-auto bg-white p-8 rounded-xl shadow-lg mt-10 border-t-4 border-gray-900">
            <h2 className="text-2xl font-bold text-center mb-6">Admin Secure Login</h2>
            <form onSubmit={handleLogin} className="space-y-4">
              <input type="email" placeholder="Email" onChange={(e) => setLoginData({...loginData, email: e.target.value})} required className="w-full border p-3 rounded outline-none" />
              <input type="password" placeholder="Password" onChange={(e) => setLoginData({...loginData, password: e.target.value})} required className="w-full border p-3 rounded outline-none" />
              <button type="submit" className="w-full bg-gray-900 text-white font-bold py-3 rounded hover:bg-black">Login</button>
            </form>
          </div>
        )}

        {currentView === 'adminDashboard' && isAdmin && (
          <div className="space-y-8">
            <div className="bg-gray-900 text-white p-6 rounded-xl shadow-lg flex flex-col md:flex-row justify-between items-center gap-4">
              <div><h2 className="text-xl md:text-2xl font-bold">Admin Control Panel</h2><p className="text-gray-400 text-sm mt-1">Manage Orders, Alerts and Inventory</p></div>
              <div className="flex gap-3">
                <button onClick={fixPictures} className="bg-blue-600 px-4 py-2 rounded font-bold hover:bg-blue-700 text-sm md:text-base">Load Sample Medicines</button>
                <button onClick={() => {setIsAdmin(false); setCurrentView('store')}} className="bg-red-600 px-4 py-2 rounded font-bold hover:bg-red-700 text-sm md:text-base">Logout</button>
              </div>
            </div>

            {(lowStockAlerts.length > 0 || expiryAlerts.length > 0) && (
              <div className="space-y-3">
                {lowStockAlerts.length > 0 && (
                  <div className="bg-red-50 border-l-4 border-red-600 text-red-800 p-4 rounded shadow-sm">
                    <strong className="block mb-2 text-lg">⚠️ Out of Stock / Low Stock Alert:</strong>
                    <ul className="list-disc pl-5">
                      {lowStockAlerts.map(m => (
                        <li key={m._id} className="font-semibold">{m.name} <span className="text-red-600">(Sirf {m.stock} bachi hain)</span></li>
                      ))}
                    </ul>
                  </div>
                )}
                {expiryAlerts.length > 0 && (
                  <div className="bg-yellow-50 border-l-4 border-yellow-600 text-yellow-800 p-4 rounded shadow-sm">
                    <strong className="block mb-2 text-lg">⚠️ Expiry Alert (Agle 60 din mein):</strong>
                    <ul className="list-disc pl-5">
                      {expiryAlerts.map(m => (
                        <li key={m._id} className="font-semibold">{m.name} <span className="text-yellow-700">(Expiry: {new Date(m.expiryDate).toLocaleDateString()})</span></li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div className="bg-white rounded-xl shadow p-4 md:p-6 border-t-4 border-orange-500 overflow-hidden">
              <h3 className="text-lg md:text-xl font-bold mb-4 border-b pb-2">Customer Orders ({orders.length})</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead><tr className="bg-gray-100"><th className="p-3 border-b">Customer</th><th className="p-3 border-b">Items</th><th className="p-3 border-b">Total Bill</th><th className="p-3 border-b text-center">Payment Info</th><th className="p-3 border-b text-center">Status & Actions</th></tr></thead>
                  <tbody>
                    {orders.map(order => (
                      <tr key={order._id} className="border-b hover:bg-gray-50">
                        <td className="p-3"><p className="font-bold">{order.customerName}</p><p className="text-xs text-gray-500">{order.phone}<br/>{order.address}</p></td>
                        <td className="p-3 text-sm">{order.items.map(i => <div key={i._id}>• {i.name} (x{i.cartQuantity})</div>)}</td>
                        <td className="p-3 font-bold text-blue-700">Rs {order.totalBill}</td>
                        <td className="p-3 text-center">
                            <span className={`px-2 py-1 rounded text-xs font-bold block mb-1 ${order.paymentMethod === 'COD' ? 'bg-gray-200' : 'bg-yellow-100 text-yellow-800'}`}>{order.paymentMethod}</span>
                            {order.transactionId && <span className="text-[10px] font-mono bg-gray-100 px-1 border border-gray-300">TID: {order.transactionId}</span>}
                        </td>
                        <td className="p-3 text-center">
                          <select value={order.status} onChange={(e) => updateOrderStatus(order._id, e.target.value)} className="w-full mb-2 border p-1 rounded font-bold outline-none cursor-pointer bg-gray-50 text-gray-700 text-sm">
                            <option value="Pending">Pending</option>
                            <option value="Shipped">Shipped</option>
                            <option value="Delivered">Delivered</option>
                          </select>
                          <div className="flex gap-1 justify-center">
                            <button onClick={() => sendWhatsApp(order)} className="bg-green-500 text-white px-2 py-1.5 rounded text-xs font-bold w-full hover:bg-green-600 shadow">WhatsApp</button>
                            <button onClick={() => sendSMS(order)} className="bg-blue-500 text-white px-2 py-1.5 rounded text-xs font-bold w-full hover:bg-blue-600 shadow">Simple SMS</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="bg-white rounded-xl shadow p-4 md:p-6 h-fit border-t-4 border-blue-600">
                <h3 className="text-lg font-bold mb-4 border-b pb-2">Add New Medicine</h3>
                <form onSubmit={handleAddMedicine} className="space-y-3">
                  <input type="text" placeholder="Name" required onChange={(e) => setNewMed({...newMed, name: e.target.value})} value={newMed.name} className="w-full border p-2 rounded outline-none bg-gray-50" />
                  <input type="text" placeholder="Formula" required onChange={(e) => setNewMed({...newMed, formula: e.target.value})} value={newMed.formula} className="w-full border p-2 rounded outline-none bg-gray-50" />
                  <div className="flex gap-2">
                    <input type="number" placeholder="Price" required onChange={(e) => setNewMed({...newMed, price: e.target.value})} value={newMed.price} className="w-1/2 border p-2 rounded outline-none bg-gray-50" />
                    <input type="number" placeholder="Stock" required onChange={(e) => setNewMed({...newMed, stock: e.target.value})} value={newMed.stock} className="w-1/2 border p-2 rounded outline-none bg-gray-50" />
                  </div>
                  <input type="date" required onChange={(e) => setNewMed({...newMed, expiryDate: e.target.value})} value={newMed.expiryDate} className="w-full border p-2 rounded outline-none bg-gray-50" />
                  
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded space-y-2">
                    <label className="block text-xs font-bold text-blue-800">Add Picture (Any one option)</label>
                    <input type="text" placeholder="Image URL (Link)" onChange={(e) => setNewMed({...newMed, imageUrl: e.target.value})} value={newMed.imageUrl} className="w-full border p-2 rounded outline-none text-sm bg-white" />
                    <p className="text-center text-xs font-bold text-gray-500">OR</p>
                    <input type="file" id="fileInput" accept="image/*" onChange={(e) => setNewMed({...newMed, imageFile: e.target.files[0]})} className="w-full text-sm bg-white p-1 rounded border" />
                  </div>

                  <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded hover:bg-blue-700 mt-2 shadow-md">Save to Inventory</button>
                </form>
              </div>

              <div className="lg:col-span-2 bg-white rounded-xl shadow p-4 md:p-6 border-t-4 border-gray-600">
                <h3 className="text-lg font-bold mb-4 border-b pb-2">Manage Inventory ({medicines.length})</h3>
                <div className="overflow-y-auto max-h-[500px]">
                  <table className="w-full text-left border-collapse">
                    <thead><tr className="bg-gray-100"><th className="p-3 sticky top-0 bg-gray-100 z-10">Medicine</th><th className="p-3 sticky top-0 bg-gray-100 z-10">Price</th><th className="p-3 sticky top-0 bg-gray-100 z-10">Stock</th><th className="p-3 sticky top-0 bg-gray-100 z-10">Action</th></tr></thead>
                    <tbody>
                      {medicines.map(med => (
                        <tr key={med._id} className="border-b">
                          <td className="p-3 font-semibold flex items-center gap-3">
                            <img src={med.imageUrl || "https://images.unsplash.com/photo-1584308666744-24d5e4b6c310?auto=format&fit=crop&w=500&q=80"} className="w-10 h-10 object-cover rounded border" />
                            {med.name}
                          </td>
                          <td className="p-3 text-blue-700 font-bold">Rs {med.price}</td>
                          <td className="p-3"><span className={`px-2 py-1 rounded text-xs font-bold ${med.stock < 10 ? 'bg-red-100 text-red-700' : 'bg-gray-100'}`}>{med.stock}</span></td>
                          <td className="p-3"><button onClick={() => handleDeleteMedicine(med._id)} className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600 shadow">Delete</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  )
}

export default App
