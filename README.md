# Saranya Jewellery Management System

A full-stack MERN (MongoDB, Express, React, Node.js) application for jewellery business management, featuring customer dashboards, staff portals, inventory management, loyalty programs, order processing, and customer support.

## Tech Stack

- **Frontend:** React 18, Vite, React Router, React Icons
- **Backend:** Node.js, Express.js, Mongoose
- **Database:** MongoDB Atlas
- **Authentication:** Session-based with bcrypt password hashing
- **File Upload:** Cloudinary
- **Email:** Gmail & Testmail.app Integration
- **PDF Export:** jsPDF

## Prerequisites

Before cloning and setting up the project, ensure you have:

- **Node.js** (v16 or higher) - [Download](https://nodejs.org/)
- **npm** (comes with Node.js)
- **Git** - [Download](https://git-scm.com/)
- **MongoDB Atlas Account** - [Create Account](https://www.mongodb.com/cloud/atlas)
- **Cloudinary Account** - [Sign Up](https://cloudinary.com/) (for image uploads)
- **Gmail Account** (for email functionality)

## Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/Saranya-Jewellery.git
cd Saranya-Jewellery
```

### 2. Install Dependencies

```bash
# Install root dependencies
npm install

# Install frontend dependencies
npm run frontend:install

# Install mobile dependencies (required for Expo)
npm run mobile:install
```

### 3. Environment Variables

The `.env` file is already configured with:

- MongoDB connection string
- Email configuration (Gmail & Testmail.app)
- Cloudinary API credentials
- Session secret
- Application URL

**Note:** If you're running this locally:

- Update `APP_URL` if using a different port
- Email is configured to use Testmail.app (`USE_TESTMAIL=true`), which captures all test emails
- For production, update `EMAIL_USER` and `EMAIL_PASSWORD` with your own credentials

### 4. Run the Project

Use separate terminals for backend/frontend/mobile during development.

**Terminal 1 - Backend API (Express):**

```bash
npm run dev
```

Backend runs on `http://localhost:3000`

**Terminal 2 - Frontend (Vite):**

```bash
cd frontend
npm run dev
```

Frontend runs on `http://localhost:5173`

**Terminal 3 - Mobile (Expo, optional):**

```bash
cd mobile
npx expo start
```

If Expo says `module expo is not installed`, install mobile deps first:

```bash
npm run mobile:install
```

**Single command for production-like run (build frontend + serve from backend):**

```bash
npm run start:mern
```

## Run In Expo Go (Mobile, Same Wi-Fi)

The repository now includes a mobile wrapper app in `mobile/` built with Expo and WebView.

### 1. Start the website for LAN access

From `frontend/`, run:

```bash
npm run dev -- --host
```

This exposes Vite on your local network (default port `5173`).

### 2. Start Expo

From project root, run:

```bash
npm run mobile:start
```

Then scan the QR code in Expo Go.

### 3. Splash behavior

- Splash image: `mobile/assets/splash.jpg` (copied from `frontend/public/SaranyaLOGO.jpg`)
- Duration: 2 seconds before WebView opens the website

### 4. URL resolution

By default, the app auto-detects your computer LAN IP from Expo and opens:

`http://<your-lan-ip>:5173`

If needed, override manually:

```bash
EXPO_PUBLIC_WEB_URL=http://192.168.1.10:5173 npm run mobile:start
```

## Project Structure

```
├── backend/
│   ├── server.js                 # Main Express server
│   ├── config/
│   │   ├── db.js                 # MongoDB connection
│   │   └── email.js              # Email configuration
│   ├── controllers/              # Business logic
│   ├── middleware/               # Authentication, logging
│   ├── models/                   # Mongoose schemas
│   ├── routes/                   # API endpoints
│   └── utils/                    # Helper functions
└── frontend/
    ├── src/
    │   ├── App.jsx               # Main React component
    │   ├── main.jsx              # Entry point
    │   ├── auth.js               # Authentication utilities
    │   ├── routeMap.js           # Route definitions
    │   ├── components/           # Reusable components
    │   └── pages/                # Page components
    └── vite.config.js            # Vite configuration
```

## Key Features

### Customer Portal

- Register & Login
- Browse products & shop
- Shopping cart & checkout
- Order history & tracking
- Loyalty program & rewards
- Customer support chat
- Product reviews

### Staff Portal

- Login & registration
- Dashboard analytics
- Order management
- Inventory management
- Customer care
- Staff audit logs

### Admin Dashboard

- User management
- System monitoring
- Analytics & reports

### Inventory Management

- Stock tracking
- Gold rate updates
- Supplier management
- Stock alerts

### Loyalty Program

- Tiered loyalty system
- Reward redemption
- Special offers

### Backend Services

- RESTful API with Express
- MongoDB data persistence
- Session authentication
- Email notifications
- File uploads (Cloudinary)
- Real-time chat system

## API Endpoints

All API endpoints are prefixed with `/api/`:

- `/api/auth/` - Authentication (login, register, logout)
- `/api/customer/` - Customer operations
- `/api/products/` - Product management
- `/api/orders/` - Order management
- `/api/inventory/` - Inventory management
- `/api/staff/` - Staff operations
- `/api/chat/` - Chat functionality
- `/api/loyalty/` - Loyalty program
- `/api/reviews/` - Product reviews
- `/api/suppliers/` - Supplier management

## Email Testing

The system is configured with **Testmail.app** for development:

- All test emails are captured at: `vkzvk.test@inbox.testmail.app`
- Check emails at: [Testmail.app](https://testmail.app)
- To use real Gmail, set `USE_TESTMAIL=false` in `.env`

## Troubleshooting

### MongoDB Connection Issues

```
Error: MONGO_URI not defined
```

- Ensure `.env` file exists in the root directory
- Check MongoDB Atlas cluster is active
- Verify network access is enabled for your IP

### Port Already in Use

```
Error: Port 3000 is already in use
```

- Change `APP_URL` in `.env` to use a different port
- Or kill existing process: `lsof -ti:3000 | xargs kill -9`

### Frontend Not Loading

- Ensure frontend dependencies are installed: `npm run frontend:install`
- Clear Vite cache: `rm -rf frontend/dist frontend/.vite`

### Email Not Sending

- Verify `USE_TESTMAIL=true` in `.env` for testing
- Check email logs in the admin dashboard
- Ensure email credentials are correct

## Development Tips

- **Hot Reload:** Frontend changes auto-reload via Vite
- **Backend Changes:** Restart `npm run dev` to apply changes
- **Database:** Use MongoDB Atlas dashboard to inspect collections
- **Logs:** Check console output for detailed error messages
- **API Testing:** Use Postman or VS Code REST Client

## Support

For issues or questions, check the error logs in the console or contact the development team.

## License

ISC
