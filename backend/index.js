const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

mongoose.connect("mongodb+srv://sanjanakazisupti:D1yqCrFpW6Ac7Tou@cluster0.i9aqb.mongodb.net/")
    .then(() => console.log("✅ Connected to MongoDB"))
    .catch(err => console.error("❌ MongoDB connection error:", err));

const UserSchema = new mongoose.Schema({
    username: String,
    email: String,
    password: String
});

const User = mongoose.model("User", UserSchema);

// Signup Route
app.post("/signup", async (req, res) => {
    const { username, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, email, password: hashedPassword });

    await user.save();
    res.json({ message: "Signup successful!" });
});

// Login Route
app.post("/login", async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.json({ message: "User not found!" });

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) return res.json({ message: "Invalid credentials!" });

    res.json({ message: "Login successful!" });
});

app.listen(5001, () => console.log("Server running on port 5001"));
