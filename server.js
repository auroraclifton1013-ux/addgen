const express = require('express');
const axios = require('axios');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());

// ===== CONFIG =====
const SECRET_KEY = "YOUR_PAYSTACK_SECRET_KEY";
const JWT_SECRET = "MY_SECRET_TOKEN";

// ===== DATABASE =====
mongoose.connect("mongodb://127.0.0.1:27017/adgen");

const UserSchema = new mongoose.Schema({
  email: String,
  password: String,
  balance: { type: Number, default: 0 }
});

const User = mongoose.model("User", UserSchema);

// ===== AUTH ROUTES =====

// REGISTER
app.post('/register', async (req, res) => {
  const { email, password } = req.body;

  const hashed = await bcrypt.hash(password, 10);

  const user = new User({ email, password: hashed });
  await user.save();

  res.json({ message: "User created" });
});

// LOGIN
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });

  if (!user) return res.json({ error: "User not found" });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.json({ error: "Wrong password" });

  const token = jwt.sign({ id: user._id }, JWT_SECRET);

  res.json({ token, email: user.email, balance: user.balance });
});

// VERIFY TOKEN MIDDLEWARE
function auth(req, res, next) {
  const token = req.headers.authorization;

  if (!token) return res.status(401).json({ error: "No token" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

// ===== PAYMENT VERIFY =====
app.post('/verify-payment', auth, async (req, res) => {
  const { reference } = req.body;

  try {
    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: { Authorization: `Bearer ${SECRET_KEY}` }
      }
    );

    const data = response.data.data;

    if (data.status === "success") {
      const amount = data.amount / 100;

      const user = await User.findById(req.userId);
      user.balance += amount;
      await user.save();

      res.json({ status: "success", amount, balance: user.balance });
    } else {
      res.json({ status: "failed" });
    }

  } catch {
    res.json({ status: "error" });
  }
});

app.listen(3000, () => console.log("Server running"));
