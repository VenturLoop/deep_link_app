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
  const { code } = req.query;

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

    // Send `id_token` to your backend for processing
    const backendResponse = await fetch(
      `https://digitalocean.venturloop.com/auth/google-signup`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ idToken: id_token }),
      }
    );

    if (!backendResponse.ok) {
      const errorData = await backendResponse.json();
      throw new Error(`Backend error: ${errorData.error || "Unknown error"}`);
    }

    const backendData = await backendResponse.json();

    const appId = backendData.user._id;

    let deepLink = `venturloop://callback/auth/login?userId=${encodeURIComponent(
      appId
    )}`;

    if (backendData.isNewUser) {
      deepLink = `venturloop://callback/auth/signIn?userId=${encodeURIComponent(
        appId
      )}`;
    }

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
  const { code } = req.query;

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
        redirect_uri: process.env.LINKEDIN_REDIRECT_URI, // Must match exactly
      }).toString(),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }
    );

    const { id_token } = tokenResponse.data;

    // Send `id_token` to your backend for processing
    const backendResponse = await fetch(
      `https://digitalocean.venturloop.com/auth/linkedIn-signup`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id_token: id_token,
        }),
      }
    );

    if (!backendResponse.ok) {
      const errorData = await backendResponse.json();
      throw new Error(`Backend error: ${errorData.error || "Unknown error"}`);
    }

    const backendData = await backendResponse.json();

    const appId = backendData.user._id;

    let deepLink = `venturloop://callback/auth/login?userId=${encodeURIComponent(
      appId
    )}`;

    if (backendData.isNewUser) {
      deepLink = `venturloop://callback/auth/signIn?userId=${encodeURIComponent(
        appId
      )}`;
    }

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

app.get("/profile/:username", async (req, res) => {
  try {
    const { username } = req.params;

    // Convert username back to email
    const email = `${username}@gmail.com`;

    // Fetch user data from backend API
    const backendResponse = await fetch(
      "https://digitalocean.venturloop.com/api/share/user-profile",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      }
    );

    if (!backendResponse.ok) {
      const errorData = await backendResponse.json();
      return res
        .status(500)
        .send(`Backend error: ${errorData.error || "Unknown error"}`);
    }

    const result = await backendResponse.json();
    const user = result.user;

    if (!user) {
      return res.status(404).send("User not found");
    }

    const profileImage =
      user?.profile?.profileImage ||
      "https://img.freepik.com/free-vector/user-blue-gradient_78370-4692.jpg?t=st=1743190145~exp=1743193745~hmac=086d3875d17ff531c939f0866389dad07350e26e8fd97391a1176713ac9b0943&w=826";

    const userId = encodeURIComponent(user?.userId);

    res.send(`
      <html>
        <head>
          <meta property="og:title" content="${user.name}'s Profile" />
          <meta property="og:description" content="Check out ${user.name}'s profile on Venturloop." />
          <meta property="og:image" content="${profileImage}" />
          <meta property="og:url" content="https://app.venturloop.com/profile/${userId}" />
          <meta name="twitter:card" content="summary_large_image">
          <meta name="twitter:title" content="${user.name}'s Profile">
          <meta name="twitter:image" content="${profileImage}">
        </head>
        <body>
          <h1>Redirecting...</h1>
          <script>
            function redirectToApp() {
              var appLink = "venturloop://callback/profile/${userId}";
              var webLink = "https://app.venturloop.com/profile/${userId}";

              // Try to open the app
              window.location.href = appLink;

              // If app is not installed, fallback to web version
              setTimeout(function() {
                window.location.href = webLink;
              }, 2000);
            }

            redirectToApp();
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).send("Internal server error");
  }
});

app.get("/profile/:username", async (req, res) => {
  try {
    const { username } = req.params;

    // Convert username back to email
    const email = `${username}@gmail.com`;

    // Fetch user data from backend API
    const backendResponse = await fetch(
      "https://digitalocean.venturloop.com/api/share/user-profile",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      }
    );

    if (!backendResponse.ok) {
      const errorData = await backendResponse.json();
      return res
        .status(500)
        .send(`Backend error: ${errorData.error || "Unknown error"}`);
    }

    const result = await backendResponse.json();
    const user = result.user;

    console.log("user", user);

    if (!user) {
      return res.status(404).send("User not found");
    }

    const profileImage =
      user?.profile?.profileImage ||
      "https://img.freepik.com/free-vector/user-blue-gradient_78370-4692.jpg?t=st=1743190145~exp=1743193745~hmac=086d3875d17ff531c939f0866389dad07350e26e8fd97391a1176713ac9b0943&w=826";

    const userId = encodeURIComponent(user?.userId);

    res.send(`
      <html>
        <head>
          <meta property="og:title" content="${user.name}'s Profile" />
          <meta property="og:description" content="Check out ${user.name}'s profile on Venturloop." />
          <meta property="og:image" content="${profileImage}" />
          <meta property="og:url" content="https://app.venturloop.com/profile/${userId}" />
          <meta name="twitter:card" content="summary_large_image">
          <meta name="twitter:title" content="${user.name}'s Profile">
          <meta name="twitter:image" content="${profileImage}">
        </head>
        <body>
          <h1>Redirecting...</h1>
          <script>
            function redirectToApp() {
              var appLink = "venturloop://callback/profile/${userId}";
              var webLink = "https://app.venturloop.com/profile/${userId}";

              // Try to open the app
              window.location.href = appLink;

              // If app is not installed, fallback to web version
              setTimeout(function() {
                window.location.href = webLink;
              }, 2000);
            }

            redirectToApp();
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    console.log("Error fetching user profile:", error);
    res.status(500).send("Internal server error");
  }
});

app.get("/project/:projectId", async (req, res) => {
  try {
    const { projectId } = req.params;

    // Fetch user data from backend API
    const backendResponse = await fetch(
      "https://digitalocean.venturloop.com/api/share/user-profile",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      }
    );

    if (!backendResponse.ok) {
      const errorData = await backendResponse.json();
      return res
        .status(500)
        .send(`Backend error: ${errorData.error || "Unknown error"}`);
    }

    const result = await backendResponse.json();
    const user = result.user;

    if (!user) {
      return res.status(404).send("User not found");
    }

    const profileImage =
      user?.profile?.profileImage ||
      "https://img.freepik.com/free-vector/user-blue-gradient_78370-4692.jpg?t=st=1743190145~exp=1743193745~hmac=086d3875d17ff531c939f0866389dad07350e26e8fd97391a1176713ac9b0943&w=826";

    const userId = encodeURIComponent(user?.userId);

    res.send(`
      <html>
        <head>
          <meta property="og:title" content="${user.name}'s Profile" />
          <meta property="og:description" content="Check out ${user.name}'s profile on Venturloop." />
          <meta property="og:image" content="${profileImage}" />
          <meta property="og:url" content="https://app.venturloop.com/profile/${userId}" />
          <meta name="twitter:card" content="summary_large_image">
          <meta name="twitter:title" content="${user.name}'s Profile">
          <meta name="twitter:image" content="${profileImage}">
        </head>
        <body>
          <h1>Redirecting...</h1>
          <script>
            function redirectToApp() {
              var appLink = "venturloop://callback/profile/${userId}";
              var webLink = "https://app.venturloop.com/profile/${userId}";

              // Try to open the app
              window.location.href = appLink;

              // If app is not installed, fallback to web version
              setTimeout(function() {
                window.location.href = webLink;
              }, 2000);
            }

            redirectToApp();
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).send("Internal server error");
  }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server is running on http://localhost:${PORT}`);
});
