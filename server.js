const express = require('express');
const axios = require('axios');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();

// ===== MIDDLEWARE =====
app.use(cors());
app.use(express.json());

// ===== HOME ROUTE =====
app.get('/', (req, res) => {
  res.json({ status: "Server is live 🚀" });
});

// ===== CONFIG (ENV VARIABLES) =====
const SECRET_KEY = process.env.PAYSTACK_SECRET;
const JWT_SECRET = process.env.JWT_SECRET;

// ===== DATABASE (CLOUD FIXED) =====
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("DB connected"))
  .catch(err => console.log("DB error:", err));

// ===== USER MODEL =====
const UserSchema = new mongoose.Schema({
  email: String,
  password: String,
  balance: { type: Number, default: 0 }
});

const User = mongoose.model("User", UserSchema);

// ===== REGISTER =====
app.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: "User already exists" });
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = new User({ email, password: hashed });
    await user.save();

    res.json({ message: "User created" });

  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// ===== LOGIN =====
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) return res.status(404).json({ error: "User not found" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: "Wrong password" });

    const token = jwt.sign({ id: user._id }, JWT_SECRET, {
      expiresIn: "7d"
    });

    res.json({
      token,
      email: user.email,
      balance: user.balance
    });

  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// ===== AUTH MIDDLEWARE =====
function auth(req, res, next) {
  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({ error: "No token" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

// ===== VERIFY PAYMENT =====
app.post('/verify-payment', auth, async (req, res) => {
  try {
    const { reference } = req.body;

    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${SECRET_KEY}`
        }
      }
    );

    const data = response.data.data;

    if (data.status === "success") {
      const amount = data.amount / 100;

      const user = await User.findById(req.userId);
      user.balance += amount;
      await user.save();

      return res.json({
        status: "success",
        amount,
        balance: user.balance
      });
    }

    res.json({ status: "failed" });

  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// ===== SERVER START (FIXED FOR RENDER) =====
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
