require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const path = require("path");

const app = express();

// Middleware
app.use(cors());
app.use(express.json()); // Parse JSON requests
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded requests

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

app.get("/callback", async (req, res) => {
  console.log("console", req.query);
  const { code } = req.query;
  console.log("Received Code:", code);

  if (!code) {
    return res.status(400).json({ error: "Authorization code is missing" });
  }

  try {
    const tokenResponse = await axios.post(
      "https://oauth2.googleapis.com/token",
      new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI,
        grant_type: "authorization_code",
      }).toString(),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }
    );

    const { id_token, access_token } = tokenResponse.data;

    // Fetch user info from Google
    const userInfoResponse = await axios.get(
      "https://www.googleapis.com/oauth2/v3/userinfo",
      {
        headers: { Authorization: `Bearer ${access_token}` },
      }
    );

    const user = userInfoResponse.data;
    console.log("userIN", user);

    // Send `id_token` to your backend for processing
    const backendResponse = await fetch(`https://venturloopbackend-v-1-0-9.onrender.com/auth/google-signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ idToken: id_token }),
    });

    if (!backendResponse.ok) {
      const errorData = await backendResponse.json();
      throw new Error(`Backend error: ${errorData.error || "Unknown error"}`);
    }

    const backendData = await backendResponse.json();
    console.log("Backend Response:", backendData);

    // Generate JWT token for your app
    const appToken = backendData.token? backendData.token : jwt.sign(
      { userId: user.sub, email: user.email, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Redirect user back to the mobile app using deep linking
    const deepLink = `venturloop://auth/signIn/createPass?token=${encodeURIComponent(
      appToken
    )}`;
    console.log("Redirecting to:", deepLink);
    
    res.redirect(deepLink);
  } catch (error) {
    console.error("OAuth Error:", error.response?.data || error.message);
    res.status(500).json({
      error: "Authentication failed",
      details: error.response?.data || error.message,
    });
  }
});

app.get("/callback_linkedIn", async (req, res) => {
  console.log("Console:", req.query);
  const { code } = req.query;
  console.log("Received Code:", code);

  if (!code) {
    return res.status(400).json({ error: "Authorization code is missing" });
  }

  try {
    // Exchange authorization code for access token
    const tokenResponse = await axios.post(
      "https://www.linkedin.com/oauth/v2/accessToken",
      new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: process.env.LINKEDIN_CLIENT_ID,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET,
        redirect_uri: process.env.LINKEDIN_REDIRECT_URI,
      }).toString(),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }
    );

    const { access_token } = tokenResponse.data;
    console.log("Access Token:", access_token);

    // Fetch user profile using OpenID Connect
    const userProfileResponse = await axios.get(
      "https://api.linkedin.com/v2/userinfo",
      {
        headers: { Authorization: `Bearer ${access_token}` },
      }
    );

    // Fetch user email from LinkedIn
    const userEmailResponse = await axios.get(
      "https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))",
      {
        headers: { Authorization: `Bearer ${access_token}` },
      }
    );

    const user = userProfileResponse.data;
    const email =
      userEmailResponse.data?.elements?.[0]?.["handle~"]?.emailAddress || null;

    if (!email) {
      throw new Error("Email not found in LinkedIn response.");
    }

    console.log("User Info:", user);
    console.log("User Email:", email);

    // Generate JWT token for authentication
    const appToken = jwt.sign(
      {
        userId: user.sub, // OpenID returns 'sub' as user ID
        email,
        firstName: user.given_name,
        lastName: user.family_name,
        picture: user.picture,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Redirect back to the mobile app using deep linking
    const deepLink = `venturloop://callback?token=${appToken}`;
    res.redirect(deepLink);
  } catch (error) {
    console.error("OAuth Error:", error.response?.data || error.message);
    res
      .status(500)
      .json({
        error: "Authentication failed",
        details: error.response?.data || error.message,
      });
  }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server is running on http://localhost:${PORT}`);
});
