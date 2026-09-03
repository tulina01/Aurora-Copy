# Aurora Tenant Management System - Backend Setup Guide

This guide will walk you through setting up the complete backend for the Aurora Tenant Management System with MongoDB Atlas integration.

## Prerequisites

- Node.js (version 14 or higher)
- npm (comes with Node.js)
- A modern web browser
- Internet connection for MongoDB Atlas

## Step 1: MongoDB Atlas Database Setup

### 1.1 Create MongoDB Atlas Account
1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Click "Try Free" and create an account
3. Choose the "Free" tier (M0 Sandbox)
4. Select your preferred cloud provider (AWS, Google Cloud, or Azure)
5. Choose a region close to you
6. Click "Create Cluster"

### 1.2 Configure Database Access
1. In the left sidebar, click "Database Access"
2. Click "Add New Database User"
3. Choose "Password" authentication
4. Create a username and password (save these securely!)
5. Select "Read and write to any database"
6. Click "Add User"

### 1.3 Configure Network Access
1. In the left sidebar, click "Network Access"
2. Click "Add IP Address"
3. Click "Allow Access from Anywhere" (for development)
4. Click "Confirm"

### 1.4 Get Connection String
1. Click "Connect" on your cluster
2. Choose "Connect your application"
3. Copy the connection string (it looks like: `mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority`)
4. Replace `<username>`, `<password>`, and `<dbname>` with your actual values

## Step 2: Backend Installation

### 2.1 Install Dependencies
Open your terminal/command prompt in the Aurora folder and run:

```bash
npm install
```

This will install all required packages:
- Express.js (web framework)
- Mongoose (MongoDB ODM)
- CORS (Cross-origin resource sharing)
- Helmet (Security middleware)
- Express Rate Limit (Rate limiting)
- Morgan (HTTP request logger)
- Dotenv (Environment variables)

### 2.2 Configure Environment Variables
1. Open the `config.env` file
2. Replace the MongoDB connection string with your actual connection string:

```env
MONGODB_URI=mongodb+srv://your_actual_username:your_actual_password@your_cluster.mongodb.net/aurora_tenant_db?retryWrites=true&w=majority
```

3. Update other variables as needed:
   - `PORT`: Server port (default: 3000)
   - `NODE_ENV`: Environment (development/production)
   - `JWT_SECRET`: Secret key for authentication (change this!)

## Step 3: Start the Backend Server

### 3.1 Development Mode
```bash
npm run dev
```

### 3.2 Production Mode
```bash
npm start
```

You should see output like:
```
🚀 Aurora Tenant Management Server is running
📍 Server URL: http://localhost:3000
🌍 Environment: development
📅 Started at: 2024-01-XX...
✅ Connected to MongoDB Atlas successfully
📊 Database: aurora_tenant_db
```

## Step 4: Test the Backend

### 4.1 Health Check
Open your browser and go to: `http://localhost:3000/api/health`

You should see:
```json
{
  "status": "OK",
  "message": "Aurora Tenant Management API is running",
  "timestamp": "2024-01-XX...",
  "environment": "development"
}
```

### 4.2 Test API Endpoints
You can test the API endpoints using tools like:
- Browser (for GET requests)
- Postman
- curl
- Thunder Client (VS Code extension)

## Step 5: Frontend Integration

### 5.1 Update API Configuration
The frontend is already configured to connect to `http://localhost:3000/api`. If you change the port, update the `baseURL` in `js/api.js`.

### 5.2 Test Complete Application
1. Make sure the backend is running
2. Open `index.html` in your browser
3. Try adding a tenant, maintenance request, or inventory item
4. Check that data is saved to MongoDB Atlas

## API Endpoints Reference

### Tenants
- `GET /api/tenants` - Get all tenants
- `POST /api/tenants` - Create new tenant
- `GET /api/tenants/:id` - Get tenant by ID
- `PUT /api/tenants/:id` - Update tenant
- `DELETE /api/tenants/:id` - Delete tenant
- `GET /api/tenants/stats/dashboard` - Get dashboard statistics

### Maintenance
- `GET /api/maintenance` - Get all maintenance requests
- `POST /api/maintenance` - Create new maintenance request
- `GET /api/maintenance/:id` - Get maintenance by ID
- `PUT /api/maintenance/:id` - Update maintenance
- `DELETE /api/maintenance/:id` - Delete maintenance
- `PATCH /api/maintenance/:id/complete` - Mark as completed
- `GET /api/maintenance/stats/overview` - Get maintenance statistics

### Inventory
- `GET /api/inventory` - Get all inventory items
- `POST /api/inventory` - Create new inventory item
- `GET /api/inventory/:id` - Get inventory by ID
- `PUT /api/inventory/:id` - Update inventory
- `DELETE /api/inventory/:id` - Delete inventory
- `GET /api/inventory/category/:category` - Get by category
- `GET /api/inventory/stats/overview` - Get inventory statistics

## Database Schema

### Tenant Collection
- name, phone, email
- apartmentNumber, checkinDate, checkoutDate
- rentalBasis, rentAmount, deposit
- bookingSource, specialRequests, remarks
- status, idVerification
- timestamps

### Maintenance Collection
- apartmentNumber, type, description
- priority, status, reportedDate, completedDate
- assignedTo, estimatedCost, actualCost
- previousCondition, postDepartureCondition
- damages, depositDeductions, notes
- timestamps

### Inventory Collection
- apartmentNumber, category, type, count
- condition, brand, model
- purchaseDate, purchasePrice, warrantyExpiry
- location, notes, status
- lastMaintenance, nextMaintenance
- specifications, images
- timestamps

## Troubleshooting

### Common Issues

1. **MongoDB Connection Failed**
   - Check your connection string
   - Verify username and password
   - Ensure IP address is whitelisted
   - Check network connectivity

2. **Port Already in Use**
   - Change the PORT in config.env
   - Kill the process using the port
   - Use a different port

3. **CORS Errors**
   - Backend is configured to allow all origins in development
   - Check that the frontend is making requests to the correct URL

4. **Module Not Found**
   - Run `npm install` again
   - Check that all dependencies are installed
   - Verify Node.js version

### Error Logs
Check the console output for detailed error messages. The server logs all requests and errors.

## Security Considerations

1. **Environment Variables**: Never commit sensitive data to version control
2. **Rate Limiting**: Configured to prevent abuse
3. **Input Validation**: All inputs are validated on the server
4. **CORS**: Configured for development (adjust for production)
5. **Helmet**: Security headers are enabled

## Production Deployment

For production deployment:

1. Set `NODE_ENV=production`
2. Use a strong JWT_SECRET
3. Configure CORS for your domain
4. Set up proper MongoDB Atlas security
5. Use HTTPS
6. Set up monitoring and logging
7. Configure backup strategies

## Support

If you encounter issues:

1. Check the console for error messages
2. Verify all configuration steps
3. Test the MongoDB connection
4. Check network connectivity
5. Review the API documentation

## Next Steps

Once the backend is running:

1. Test all CRUD operations
2. Add sample data
3. Test the frontend integration
4. Configure additional features
5. Set up monitoring
6. Plan for scaling

---

**Aurora Tenant Management System** - Making property management simple and efficient with cloud database integration.

