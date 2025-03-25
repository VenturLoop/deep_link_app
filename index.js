require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

// Middleware
app.use(cors());
app.use(express.json()); // Parse JSON requests

// Serve static files from "public"
app.use(express.static("public"));
// Routes
app.get("/", (req, res) => {
  res.send("🚀 Welcome to Venturloop Backend!");
});

app.get("/.well-known/assetlinks.json", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.sendFile(
    path.join(__dirname, "public", ".well-known", "assetlinks.json")
  );
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server is running on http://localhost:${PORT}`);
});
