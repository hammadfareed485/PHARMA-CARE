const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Cloudinary packages
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const app = express();
app.use(cors());
app.use(express.json());

// Cloudinary setup (Aapke original credentials)
cloudinary.config({
  cloud_name: 'bt4mtirl',
  api_key: '645129384526287',
  api_secret: 'OL_tdQStSyKk_PYp8bwksJTn9mE'
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'pharmacy_medicines',
    allowedFormats: ['jpg', 'png', 'jpeg'],
  },
});

const upload = multer({ storage: storage });

// YAHAN APNA ASAL MONGODB LINK PASTE KAREIN
const DB_LINK = 'mongodb://hammadfareed485_db_user:Hammad485@ac-0jlbmqv-shard-00-00.ojctxsp.mongodb.net:27017,ac-0jlbmqv-shard-00-01.ojctxsp.mongodb.net:27017,ac-0jlbmqv-shard-00-02.ojctxsp.mongodb.net:27017/?ssl=true&replicaSet=atlas-14hrs2-shard-0&authSource=admin';

mongoose.connect(DB_LINK).then(() => console.log("Database Connected.")).catch((err) => console.log(err));

const medicineSchema = new mongoose.Schema({ name: String, formula: String, price: Number, stock: Number, expiryDate: String, imageUrl: String });
const Medicine = mongoose.model('Medicine', medicineSchema);

const orderSchema = new mongoose.Schema({ customerName: String, phone: String, address: String, items: Array, totalBill: Number, paymentMethod: String, status: { type: String, default: 'Pending' } });
const Order = mongoose.model('Order', orderSchema);

app.post('/api/admin/login', (req, res) => {
    if (req.body.email === 'hammadfareed876@gmail.com' && req.body.password === 'admin123') res.status(200).json({ success: true });
    else res.status(401).json({ success: false });
});

// Dawai Save karna (Picture Upload ke sath)
app.post('/api/medicines', upload.single('image'), async (req, res) => {
    try {
        let imageUrl = req.body.imageUrl || "";
        
        // Agar picture direct upload hui hai, toh Cloudinary ka link set ho jayega
        if (req.file) {
            imageUrl = req.file.path; 
        }
        
        const dawai = new Medicine({ ...req.body, imageUrl }); 
        await dawai.save(); 
        res.status(201).json(dawai); 
    } catch (e) { res.status(400).json({ error: "Error" }); }
});

app.get('/api/medicines', async (req, res) => {
    try { res.status(200).json(await Medicine.find().sort({ _id: -1 })); } catch (e) { res.status(400).json({ error: "Error" }); }
});

app.delete('/api/medicines/:id', async (req, res) => {
    try { await Medicine.findByIdAndDelete(req.params.id); res.status(200).json({ message: "Deleted" }); } catch (e) { res.status(400).json({ error: "Error" }); }
});

// YEH WALA HISSA MISSING THA - Dawai Edit/Update karna (Picture ke sath)
app.put('/api/medicines/:id', upload.single('image'), async (req, res) => {
    try {
        let updateData = { ...req.body };
        // Agar nayi picture upload ki gayi hai toh Cloudinary ka link add karein
        if (req.file) {
            updateData.imageUrl = req.file.path; 
        }
        const updatedMedicine = await Medicine.findByIdAndUpdate(req.params.id, updateData, { new: true });
        res.status(200).json(updatedMedicine);
    } catch (e) { 
        res.status(400).json({ error: "Error updating medicine" }); 
    }
});

app.post('/api/orders', async (req, res) => {
    try {
        const order = new Order(req.body); await order.save();
        for (let item of req.body.items) {
            const dawai = await Medicine.findById(item._id);
            if (dawai) { dawai.stock -= item.cartQuantity; await dawai.save(); }
        }
        res.status(201).json({ message: "Success" });
    } catch (e) { res.status(400).json({ error: "Error" }); }
});

app.get('/api/orders', async (req, res) => {
    try { res.status(200).json(await Order.find().sort({ _id: -1 })); } catch (e) { res.status(400).json({ error: "Error" }); }
});

app.put('/api/orders/status/:id', async (req, res) => {
    try {
        const order = await Order.findById(req.params.id); order.status = req.body.status; await order.save();
        res.status(200).json({ message: "Updated" });
    } catch (e) { res.status(400).json({ error: "Error" }); }
});

app.put('/api/medicines/sell/:id', async (req, res) => {
    try {
        const { quantityToSell } = req.body;
        const medicine = await Medicine.findById(req.params.id);
        if (!medicine || medicine.stock < quantityToSell) return res.status(400).json({ error: "Stock error" });
        medicine.stock -= quantityToSell; await medicine.save();
        res.status(200).json({ totalBill: quantityToSell * medicine.price });
    } catch (e) { res.status(500).json({ error: "Error" }); }
});

app.listen(5000, () => console.log("Backend ON."));
