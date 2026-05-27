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
  res.json({
    status: "Server is live 🚀"
  });
});

// ===== ENV VARIABLES =====
const SECRET_KEY = process.env.PAYSTACK_SECRET;
const JWT_SECRET = process.env.JWT_SECRET;

// ===== DATABASE CONNECTION =====
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log("MongoDB connected ✅");
})
.catch((err) => {
  console.log("MongoDB error ❌", err);
});

// ===== USER MODEL =====
const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true
  },

  password: {
    type: String,
    required: true
  },

  balance: {
    type: Number,
    default: 0
  }
});

const User = mongoose.model("User", UserSchema);

// ===== REGISTER =====
app.post('/register', async (req, res) => {

  try {

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: "Email and password required"
      });
    }

    const existing = await User.findOne({ email });

    if (existing) {
      return res.status(400).json({
        error: "User already exists"
      });
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = new User({
      email,
      password: hashed
    });

    await user.save();

    res.json({
      success: true,
      message: "User created successfully"
    });

  } catch (err) {

    console.log(err);

    res.status(500).json({
      error: "Server error"
    });
  }
});

// ===== LOGIN =====
app.post('/login', async (req, res) => {

  try {

    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        error: "User not found"
      });
    }

    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      return res.status(401).json({
        error: "Wrong password"
      });
    }

    const token = jwt.sign(
      { id: user._id },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      token,
      email: user.email,
      balance: user.balance
    });

  } catch (err) {

    console.log(err);

    res.status(500).json({
      error: "Server error"
    });
  }
});

// ===== AUTH MIDDLEWARE =====
function auth(req, res, next) {

  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({
      error: "No token provided"
    });
  }

  try {

    const decoded = jwt.verify(token, JWT_SECRET);

    req.userId = decoded.id;

    next();

  } catch (err) {

    res.status(401).json({
      error: "Invalid token"
    });
  }
}

// ===== VERIFY PAYMENT =====
app.post('/verify-payment', auth, async (req, res) => {

  try {

    const { reference } = req.body;

    if (!reference) {
      return res.status(400).json({
        error: "Reference required"
      });
    }

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
        success: true,
        amount,
        balance: user.balance
      });
    }

    res.json({
      success: false,
      message: "Payment not successful"
    });

  } catch (err) {

    console.log(err);

    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// ===== START SERVER =====
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
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
  res.json({
    status: "Server is live 🚀"
  });
});

// ===== ENV VARIABLES =====
const SECRET_KEY = process.env.PAYSTACK_SECRET;
const JWT_SECRET = process.env.JWT_SECRET;

// ===== DATABASE CONNECTION =====
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log("MongoDB connected ✅");
})
.catch((err) => {
  console.log("MongoDB error ❌", err);
});

// ===== USER MODEL =====
const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true
  },

  password: {
    type: String,
    required: true
  },

  balance: {
    type: Number,
    default: 0
  }
});

const User = mongoose.model("User", UserSchema);

// ===== REGISTER =====
app.post('/register', async (req, res) => {

  try {

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: "Email and password required"
      });
    }

    const existing = await User.findOne({ email });

    if (existing) {
      return res.status(400).json({
        error: "User already exists"
      });
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = new User({
      email,
      password: hashed
    });

    await user.save();

    res.json({
      success: true,
      message: "User created successfully"
    });

  } catch (err) {

    console.log(err);

    res.status(500).json({
      error: "Server error"
    });
  }
});

// ===== LOGIN =====
app.post('/login', async (req, res) => {

  try {

    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        error: "User not found"
      });
    }

    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      return res.status(401).json({
        error: "Wrong password"
      });
    }

    const token = jwt.sign(
      { id: user._id },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      token,
      email: user.email,
      balance: user.balance
    });

  } catch (err) {

    console.log(err);

    res.status(500).json({
      error: "Server error"
    });
  }
});

// ===== AUTH MIDDLEWARE =====
function auth(req, res, next) {

  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({
      error: "No token provided"
    });
  }

  try {

    const decoded = jwt.verify(token, JWT_SECRET);

    req.userId = decoded.id;

    next();

  } catch (err) {

    res.status(401).json({
      error: "Invalid token"
    });
  }
}

// ===== VERIFY PAYMENT =====
app.post('/verify-payment', auth, async (req, res) => {

  try {

    const { reference } = req.body;

    if (!reference) {
      return res.status(400).json({
        error: "Reference required"
      });
    }

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
        success: true,
        amount,
        balance: user.balance
      });
    }

    res.json({
      success: false,
      message: "Payment not successful"
    });

  } catch (err) {

    console.log(err);

    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// ===== START SERVER =====
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
