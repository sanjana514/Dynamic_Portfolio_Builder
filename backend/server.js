const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

mongoose.connect("mongodb+srv://sanjanakazisupti:D1yqCrFpW6Ac7Tou@cluster0.i9aqb.mongodb.net/Resume_builder")
    .then(() => console.log("✅ Connected to MongoDB"))
    .catch(err => console.error("❌ MongoDB connection error:", err));

const userSchema = new mongoose.Schema(  {
    username: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
  
    password: {
      type: String,
      required: true,
    },
    
  },
  { timestamps: true });

const User = mongoose.model("User", userSchema);

app.post("/signup", async (req, res) => {
    try {
        console.log("Received Data:", req.body);
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ message: "All fields are required!" });
        }

        // ✅ Check if email already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "Email already exists!" });
        }

        console.log(existingUser);

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ username, email, password: hashedPassword });

        await user.save();
        res.status(201).json({ message: "Signup successful!" });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ message: "Server error!" });
    }
});


app.post("/login", async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.json({ message: "User not found!" });

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) return res.json({ message: "Invalid credentials!" });
    console.log("login");
    res.json({ message: "Login successful!" });
});


app.listen(5001, () => console.log("🚀 Server running on port 5001"));
