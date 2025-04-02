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
      `https://venturloopbackend-v-1-0-9.onrender.com/auth/google-signup`,
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
    console.log("backendData",backendData)

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
      `https://venturloopbackend-v-1-0-9.onrender.com/auth/linkedIn-signup`,
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
      "https://venturloopbackend-v-1-0-9.onrender.com/api/share/user-profile",
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
    const { user } = result;

    if (!user) {
      return res.status(404).send("User not found");
    }

    const profileImage =
      user.profile?.profilePhoto ||
      "https://assets.zyrosite.com/cdn-cgi/image/format=auto,w=116,fit=crop,q=95/dOqyRBXrqRCpJKgN/whatsapp-image-2024-12-05-at-11.21.50-mp8qO4BzMyIP2DeR.jpeg" ||
      "";
    const encodedUserId = encodeURIComponent(user.userId);
    const encodedUserName = encodeURIComponent(username);

    res.send(`
      <html>
        <head>
          <meta property="og:title" content="${user.name}'s Profile" />
          <meta property="og:description" content="Check out ${user.name}'s profile on Venturloop." />
          <meta property="og:image" content="${profileImage}" />
          <meta property="og:url" content="https://app.venturloop.com/profile/${encodedUserName}" />
          <meta name="twitter:card" content="summary">
          <meta name="twitter:title" content="${user.name}'s Profile">
          <meta name="twitter:image" content="${profileImage}">
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .profile-container { display: flex; align-items: center; justify-content: center; gap: 10px; }
            img { width: 50px; height: 50px; border-radius: 50%; }
            h1 { font-size: 20px; }
          </style>
        </head>
        <body>
          <h1>Redirecting...</h1>
          <script>
            function redirectToApp() {
              var appLink = "venturloop://callback/profile?userId=${encodedUserId}";
              var webLink = "https://venturloop.com/profile/${encodedUserId}";

              window.location.href = appLink;

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

app.get("/investor/:investorId", async (req, res) => {
  try {
    const { investorId } = req.params;

    // Fetch investor data from backend API
    const backendResponse = await fetch(
      `https://venturloopbackend-v-1-0-9.onrender.com/api/share/investor-profile/${investorId}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      }
    );

    if (!backendResponse.ok) {
      const errorData = await backendResponse.json();
      return res
        .status(500)
        .send(`Backend error: ${errorData.error || "Unknown error"}`);
    }

    const result = await backendResponse.json();
    const investor = result.investor;

    if (!investor) {
      return res.status(404).send("Investor not found");
    }

    const profileImage =
      investor.investorImage ||
      "https://assets.zyrosite.com/cdn-cgi/image/format=auto,w=116,fit=crop,q=95/dOqyRBXrqRCpJKgN/whatsapp-image-2024-12-05-at-11.21.50-mp8qO4BzMyIP2DeR.jpeg" ||
      "";

    const encodedInvestorId = encodeURIComponent(investorId);

    res.send(`
      <html>
        <head>
          <title>${investor.name} - Investor Profile</title>
          <meta property="og:title" content="${investor.name} - Investor at Venturloop" />
          <meta property="og:description" content="${investor.bio}" />
          <meta property="og:image" content="${profileImage}" />
          <meta property="og:url" content="https://app.venturloop.com/investor/${encodedInvestorId}" />
          <meta property="og:type" content="profile" />

          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content="${investor.name} - Investor Profile" />
          <meta name="twitter:description" content="${investor.bio}" />
          <meta name="twitter:image" content="${profileImage}" />
        </head>
        <body>
          <h1>Redirecting...</h1>
          <script>
            function redirectToApp() {
              var appLink = "venturloop://callback/investor?investorId=${encodedInvestorId}";
              var webLink = "https://venturloop.com/investor/${encodedInvestorId}";

              window.location.href = appLink;

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
    console.error("Error fetching investor profile:", error);
    res.status(500).send("Internal server error");
  }
});

app.get("/project/:projectId", async (req, res) => {
  try {
    const { projectId } = req.params;

    // Fetch project data from backend API
    const backendResponse = await fetch(
      `https://venturloopbackend-v-1-0-9.onrender.com/api/share/project/${projectId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!backendResponse.ok) {
      const errorData = await backendResponse.json();
      return res
        .status(500)
        .send(`Backend error: ${errorData.error || "Unknown error"}`);
    }

    const result = await backendResponse.json();
    const project = result.project;

    if (!project) {
      return res.status(404).send("Project not found");
    }

    // Assign project image or fallback to a default image
    const projectImage =
      project.projectPhoto ||
      "https://assets.zyrosite.com/cdn-cgi/image/format=auto,w=116,fit=crop,q=95/dOqyRBXrqRCpJKgN/whatsapp-image-2024-12-05-at-11.21.50-mp8qO4BzMyIP2DeR.jpeg" ||
      "";

    const encodedProjectId = encodeURIComponent(projectId);

    res.send(`
      <html>
        <head>
          <title>${project.title} - Project on Venturloop</title>
          <meta property="og:title" content="${project.title} - A Startup on Venturloop" />
          <meta property="og:description" content="${project.description}" />
          <meta property="og:image" content="${projectImage}" />
          <meta property="og:url" content="https://app.venturloop.com/project/${encodedProjectId}" />
          <meta property="og:type" content="website" />
          
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content="${project.title} - Startup Profile" />
          <meta name="twitter:description" content="${project.description}" />
          <meta name="twitter:image" content="${projectImage}" />

          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .project-container { display: flex; align-items: center; justify-content: center; gap: 10px; }
            img { width: 50px; height: 50px; border-radius: 10px; }
            h1 { font-size: 20px; }
          </style>
        </head>
        <body>
          <h1>Redirecting...</h1>
          <script>
            function redirectToApp() {
              var appLink = "venturloop://callback/project?projectId=${encodedProjectId}";
              var webLink = "https://venturloop.com/project/${encodedProjectId}";

              window.location.href = appLink;

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
    console.error("Error fetching project:", error);
    res.status(500).send("Internal server error");
  }
});


// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server is running on http://localhost:${PORT}`);
});
