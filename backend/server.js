const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const PDFDocument = require("pdfkit");
const path = require("path");
const fs = require("fs");
const bodyParser = require("body-parser");

// Add this near the top of your server.js file, after your cors middleware:
const app = express();
app.use(express.json());
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Optional: Add a specific route for preflight requests
app.options("/generate-pdf", cors());

// Middleware setup with increased limits for base64 images
app.use(express.json());
app.use(express.urlencoded());
app.use(cors());

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

// Create temp directory if it doesn't exist
const tempDir = path.join(__dirname, "temp");
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir);
}

// MongoDB Connection
mongoose
  .connect(
    "mongodb+srv://sanjanakazisupti:D1yqCrFpW6Ac7Tou@cluster0.i9aqb.mongodb.net/Resume_builder",
  )
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// User Schema
const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: { type: String, default: "" },
    location: { type: String, default: "" },
    bio: { type: String, default: "" },
    skills: { type: String, default: "" },
  },
  { timestamps: true },
);

// Define User Model
const User = mongoose.model("User", userSchema);

const ResumeBuilderSchema = new mongoose.Schema(
  {
    userEmail: { type: String, required: true },
    firstname: String,
    surname: String,
    city: String,
    phone: String,
    postalcode: Number,
    email: String,
    password: String,
    summary: String,
    skills: String,
    experience: String,
    education: String,
  },
  { timestamps: true },
);

const ResumeBuilder = new mongoose.model("ResumeBuilder", ResumeBuilderSchema);

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return res.status(401).json({ message: "Access denied!" });

  jwt.verify(token, "your_secret_key", (err, user) => {
    if (err) return res.status(403).json({ message: "Invalid token!" });
    req.user = user;
    next();
  });
};

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
    console.error("Signup error:", error);
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
    if (!isValidPassword)
      return res.status(400).json({ message: "Invalid credentials!" });

    // Generate JWT Token
    const token = jwt.sign({ id: user._id }, "your_secret_key", {
      expiresIn: "1h",
    });

    res.json({
      message: "Login successful!",
      token,
      user: { email: user.email, username: user.username },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error!" });
  }
});

// Update Profile Route
app.put("/update-profile", async (req, res) => {
  try {
    const { email, phone, location, bio, skills, resume } = req.body;

    // Find the user and update the details
    const updatedUser = await User.findOneAndUpdate(
      { email },
      { phone, location, bio, skills, resume },
      { new: true, runValidators: true },
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found!" });
    }

    res.json({ message: "Profile updated successfully!", user: updatedUser });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ message: "Something went wrong!" });
  }
});

app.post("/resumeSubmit", async (req, res) => {
  try {
    const {
      email,
      firstname,
      surname,
      city,
      postalcode,
      phone,
      summary,
      skills,
      experience,
      education,
    } = req.body;

    console.log("Received Data:", req.body);
    // Fetch user by email (instead of ObjectId)
    const user = await User.findOne({ email });

    console.log(user);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Prepare the resume data
    const resumeData = {
      userEmail: user.email,
      firstname,
      surname,
      city,
      postalcode,
      phone,
      email, // User's personal email
      summary,
      skills,
      experience,
      education,
    };

    // Try to find and update the resume if it exists, else create a new one
    const updatedResume = await ResumeBuilder.findOneAndUpdate(
      { userEmail: user.email }, // Check by user email
      resumeData, // Data to update or create
      { new: true, upsert: true }, // If no document found, create a new one
    );

    res.status(200).json({
      message: "Resume saved or updated successfully!",
      resume: updatedResume,
    });
  } catch (error) {
    console.error("Error saving resume:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/getResume", async (req, res) => {
  try {
    const { userEmail } = req.query; // Get email from query params

    // Fetch resume data using the user's email
    const resume = await ResumeBuilder.findOne({ userEmail: userEmail });

    if (!resume) {
      return res.status(404).json({ error: "Resume not found" });
    }

    res.status(200).json(resume);
  } catch (error) {
    console.error("Error fetching resume:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PDF Generation Route
// Replace your existing /generate-pdf route with this improved version:

app.post("/generate-pdf", async (req, res) => {
  try {
    console.log("Received PDF generation request");
    const data = req.body;

    console.log("Data received for PDF generation");

    if (!data) {
      return res
        .status(400)
        .json({ message: "No data provided for PDF generation" });
    }

    // Validate required fields
    const requiredFields = [
      "firstName",
      "surname",
      "city",
      "postalCode",
      "country",
      "phone",
      "email",
      "summary",
      "skills",
      "experience",
      "education",
    ];

    for (const field of requiredFields) {
      if (!data[field]) {
        return res
          .status(400)
          .json({ message: `Missing required field: ${field}` });
      }
    }

    let userId = null;

    // If authenticated, associate with user
    if (req.headers.authorization) {
      try {
        const token = req.headers.authorization.split(" ")[1];
        const decoded = jwt.verify(token, "your_secret_key");
        userId = decoded.id;
        console.log("Authenticated user:", userId);
      } catch (err) {
        console.log("User not authenticated for resume save");
      }
    }

    // Create a temporary file path for the PDF
    const pdfPath = path.join(
      tempDir,
      `cv_${data.firstName}_${data.surname}_${Date.now()}.pdf`,
    );

    // Create a new PDF document
    const doc = new PDFDocument({
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
      size: "A4",
    });

    // Pipe the PDF to a file
    const pdfStream = fs.createWriteStream(pdfPath);
    doc.pipe(pdfStream);

    // Process and save photo if provided
    let photoPath = null;
    if (data.photo) {
      try {
        console.log("Processing photo...");
        const imgData = data.photo.replace(/^data:image\/\w+;base64,/, "");
        const imgBuffer = Buffer.from(imgData, "base64");
        photoPath = path.join(tempDir, `${Date.now()}.png`);

        fs.writeFileSync(photoPath, imgBuffer);
        console.log("Photo saved at:", photoPath);
      } catch (error) {
        console.error("Error processing photo:", error);
      }
    }

    // Create the PDF content
    createPDF(doc, data, photoPath);

    // Save resume data to MongoDB if user is authenticated
    if (userId) {
      try {
        console.log("Saving resume to database...");
        const resume = new Resume({
          userId,
          firstName: data.firstName,
          surname: data.surname,
          city: data.city,
          postalCode: data.postalCode,
          country: data.country,
          phone: data.phone,
          email: data.email,
          summary: data.summary,
          skills: data.skills,
          experience: data.experience,
          education: data.education,
          photoPath: photoPath ? path.basename(photoPath) : null,
        });

        await resume.save();
        console.log("Resume saved to database");
      } catch (dbError) {
        console.error("Error saving resume to database:", dbError);
        // Continue with PDF generation even if DB save fails
      }
    }

    // Finalize the PDF and wait for it to be written to disk
    doc.end();

    // Wait for the PDF to be fully written before sending it
    pdfStream.on("finish", () => {
      console.log("PDF file created successfully at:", pdfPath);

      // Send the file as a download
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=cv_${data.firstName}_${data.surname}.pdf`,
      );

      // Read and send the file
      const fileStream = fs.createReadStream(pdfPath);
      fileStream.pipe(res);

      // Delete files when done
      fileStream.on("end", () => {
        // Clean up the PDF file after sending
        try {
          fs.unlinkSync(pdfPath);
          console.log("Temp PDF file deleted");

          // Clean up the photo file if it exists
          if (photoPath) {
            fs.unlinkSync(photoPath);
            console.log("Temp photo file deleted");
          }
        } catch (err) {
          console.error("Error deleting temp files:", err);
        }
      });
    });

    // Handle errors in the stream
    pdfStream.on("error", (err) => {
      console.error("Error writing PDF:", err);
      res
        .status(500)
        .json({ message: "Error generating PDF", error: err.message });
    });
  } catch (error) {
    console.error("Detailed error generating PDF:", error);

    // Check if headers are already sent before attempting to send error response
    if (!res.headersSent) {
      res.status(500).json({
        message: "Error generating PDF",
        error: error.message,
        stack: error.stack,
      });
    } else {
      console.error("Headers already sent, could not send error response");
    }
  }
});

// Get user resumes
app.get("/resumes", authenticateToken, async (req, res) => {
  try {
    const resumes = await Resume.find({ userId: req.user.id });
    res.json({ resumes });
  } catch (error) {
    console.error("Error fetching resumes:", error);
    res.status(500).json({ message: "Error fetching resumes" });
  }
});

// Function to create the PDF content
function createPDF(doc, data, photoPath) {
  try {
    // Add header with name
    doc
      .font("Helvetica-Bold")
      .fontSize(24)
      .text(`${data.firstName} ${data.surname}`, { align: "center" });

    doc.moveDown();

    // Add contact information
    doc
      .font("Helvetica-Bold")
      .fontSize(16)
      .text("CONTACT", { underline: true });
    doc
      .font("Helvetica")
      .fontSize(12)
      .text(`City: ${data.city}`)
      .text(`Postal Code: ${data.postalCode}`)
      .text(`Country: ${data.country}`)
      .text(`Phone: ${data.phone}`)
      .text(`Email: ${data.email}`);

    doc.moveDown();

    // Add summary
    doc
      .font("Helvetica-Bold")
      .fontSize(16)
      .text("SUMMARY", { underline: true });
    doc.font("Helvetica").fontSize(12).text(data.summary);

    doc.moveDown();

    // Add skills
    doc.font("Helvetica-Bold").fontSize(16).text("SKILLS", { underline: true });
    doc.font("Helvetica").fontSize(12).text(data.skills);

    doc.moveDown();

    // Add experience
    doc
      .font("Helvetica-Bold")
      .fontSize(16)
      .text("EXPERIENCE", { underline: true });
    doc.font("Helvetica").fontSize(12).text(data.experience);

    doc.moveDown();

    // Add education
    doc
      .font("Helvetica-Bold")
      .fontSize(16)
      .text("EDUCATION", { underline: true });
    doc.font("Helvetica").fontSize(12).text(data.education);

    // If there's a photo, add it
    if (photoPath) {
      try {
        console.log("Adding photo to PDF:", photoPath);
        doc.image(photoPath, 450, 50, { width: 100 });
      } catch (error) {
        console.error("Error adding photo to PDF:", error);
      }
    }
  } catch (pdfError) {
    console.error("Error creating PDF content:", pdfError);
    throw pdfError;
  }
}

// Serve the main HTML file
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Start Server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
