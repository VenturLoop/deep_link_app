# Deep Link Backend

This repository contains the backend service for handling deep links in the VenturLoop application. It facilitates user redirection to specific in-app screens based on deep link URLs.

## Features
- Generates and processes deep links for various app functionalities.
- Supports Google and LinkedIn OAuth for authentication.
- Handles user redirections efficiently.
- Ensures secure deep link handling with proper validation.

## Technologies Used
- **Node.js**: Backend runtime.
- **Express.js**: Web framework for API handling.
- **MongoDB**: Database for storing user authentication details.
- **Firebase Admin SDK**: Used for managing authentication and notifications.
- **Expo Auth**: For integrating Google and LinkedIn authentication.

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/VenturLoop/deep_link_backend.git
   cd deep_link_backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:
   Create a `.env` file in the root directory and add the following:
   ```env
   PORT=5000
   MONGO_URI=your_mongodb_connection_string
   FIREBASE_CREDENTIALS=path_to_firebase_adminsdk.json
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   LINKEDIN_CLIENT_ID=your_linkedin_client_id
   LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret
   ```

## Usage

Start the server:
```bash
npm start
```

The server should be running on `http://localhost:5000`.

## API Endpoints

### Generate Deep Link
```http
POST /api/deeplink/generate
```
**Request Body:**
```json
{
  "target": "app_screen",
  "params": { "id": "1234" }
}
```
**Response:**
```json
{
  "deepLink": "venturloop://app_screen?id=1234"
}
```

### Resolve Deep Link
```http
GET /api/deeplink/resolve?link=venturloop://app_screen?id=1234
```
**Response:**
```json
{
  "screen": "app_screen",
  "params": { "id": "1234" }
}
```

## Deployment
To deploy on a DigitalOcean droplet:
1. SSH into your droplet and pull the latest changes.
2. Install dependencies and restart the service:
   ```bash
   npm install
   pm2 restart deep_link_backend
   ```

## Contributing
Feel free to open an issue or submit a pull request if you find any bugs or improvements.

## License
MIT License

