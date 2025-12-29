# Frontend - Due Diligence Platform

A modern React frontend built with Vite, React Router, and Tailwind CSS.

## Features

- ⚡ Fast development with Vite
- ⚛️ React 18 with modern hooks
- 🎨 Tailwind CSS for styling
- 🔐 Authentication with JWT
- 🛣️ React Router for navigation
- 📡 Axios for API calls

## Getting Started

### Install Dependencies

```bash
npm install
```

### Development

Run the development server:

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

### Build

Create a production build:

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```
frontend/
├── src/
│   ├── contexts/       # React contexts (AuthContext)
│   ├── pages/          # Page components (Login, Dashboard)
│   ├── services/       # API service layer
│   ├── App.jsx         # Main app component
│   ├── main.jsx        # Entry point
│   └── index.css      # Global styles
├── index.html          # HTML template
├── vite.config.js      # Vite configuration
└── package.json        # Dependencies
```

## API Configuration

The frontend is configured to proxy API requests to `http://localhost:5000` (your backend server). Make sure your backend is running on port 5000.

## Authentication

The app uses JWT tokens stored in localStorage. The authentication context provides:
- `login(email, password)` - Login function
- `logout()` - Logout function
- `user` - Current user object
- `loading` - Loading state

