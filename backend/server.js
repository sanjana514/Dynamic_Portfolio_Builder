const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const cors = require("cors");
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json());
app.use(cors());

// MongoDB Connection
mongoose.connect("mongodb+srv://sanjanakazisupti:D1yqCrFpW6Ac7Tou@cluster0.i9aqb.mongodb.net/Resume_builder")
    .then(() => console.log("✅ Connected to MongoDB"))
    .catch(err => console.error("❌ MongoDB connection error:", err));

// User Schema (Define this first)
const userSchema = new mongoose.Schema({
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: { type: String, default: "" },
    location: { type: String, default: "" },
    bio: { type: String, default: "" },
    skills: { type: String, default: "" }
}, { timestamps: true });

// 👇 **Define User Model after Schema**
const User = mongoose.model("User", userSchema);

// Now, write the API Routes
app.post("/signup", async (req, res) => {
    try {
        const { username, email, password } = req.body;
        if (!username || !email || !password) {
            return res.status(400).json({ message: "All fields are required!" });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "Email already exists!" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ username, email, password: hashedPassword });

        await user.save();
        res.status(201).json({ message: "Signup successful!" });
    } catch (error) {
        res.status(500).json({ message: "Server error!" });
    }
});

// Signup Route
app.post("/signup", async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ message: "All fields are required!" });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "Email already exists!" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ username, email, password: hashedPassword });

        await user.save();
        res.status(201).json({ message: "Signup successful!" });
    } catch (error) {
        res.status(500).json({ message: "Server error!" });
    }
});

// Login Route
app.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: "User not found!" });

        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) return res.status(400).json({ message: "Invalid credentials!" });

        // Generate JWT Token
        const token = jwt.sign({ id: user._id }, "your_secret_key", { expiresIn: "1h" });

        res.json({ message: "Login successful!", token, user: { email: user.email, username: user.username } });
    } catch (error) {
        res.status(500).json({ message: "Server error!" });
    }
});
app.put("/update-profile", async (req, res) => {
    try {
        const { email, phone, location, bio, skills, resume } = req.body;

        // Find the user and update the details
        const updatedUser = await User.findOneAndUpdate(
            { email },
            { phone, location, bio, skills, resume },
            { new: true, runValidators: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ message: "User not found!" });
        }

        res.json({ message: "Profile updated successfully!", user: updatedUser });
    } catch (error) {
        res.status(500).json({ message: "Something went wrong!" });
    }
});
// Start Server
app.listen(5001, () => console.log("🚀 Server running on port 5001"));
