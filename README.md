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

### 4. Start the Application

**Development Mode (Frontend + Backend):**

```bash
npm run dev
```

This starts the backend server on `http://localhost:3000`

**Production Mode (Build Frontend + Run Backend):**

```bash
npm run start:mern
```

**Frontend Only (with Vite dev server):**

```bash
cd frontend
npm run dev
```

Frontend will be available on `http://localhost:5173`

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
