# Ten&See - Student Housing Platform

A full-stack property booking platform specifically designed for student accommodations.

## Features

### Frontend
- **Landing Page**: Modern, responsive design with animated elements
- **Listings Catalogue**: Filterable property listings with search, price range, property type, bedrooms, city, and university filters
- **Live Chat Widget**: Floating chat for instant customer support
- **WhatsApp Integration**: One-click WhatsApp contact with lead tracking
- **Booking Form**: Modal-based booking request system
- **Admin Dashboard**: Complete management interface

### Backend
- **REST API**: Express.js with MongoDB
- **Listings Management**: CRUD operations for properties
- **Lead Tracking**: Automatic capture from chat, WhatsApp, and booking forms
- **Live Chat**: Session-based messaging system
- **Analytics Dashboard**: Views, inquiries, lead sources, trends
- **JWT Authentication**: Secure admin access

## Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend**: Node.js, Express.js
- **Database**: MongoDB (Mongoose ODM)
- **Authentication**: JWT (JSON Web Tokens)

## Project Structure

```
tenandsee/
├── backend/
│   ├── server.js              # Main server entry
│   ├── package.json           # Dependencies
│   ├── .env.example           # Environment variables template
│   ├── models/
│   │   ├── Listing.js         # Property listing schema
│   │   ├── Lead.js            # Lead/customer inquiry schema
│   │   ├── ChatMessage.js     # Chat message schema
│   │   └── Admin.js           # Admin user schema
│   └── routes/
│       ├── listings.js        # Listing API routes
│       ├── leads.js           # Lead tracking routes
│       ├── chat.js            # Live chat routes
│       ├── admin.js           # Authentication routes
│       └── analytics.js       # Dashboard analytics
├── frontend/
│   ├── index.html             # Landing page
│   ├── listings.html          # Property catalogue
│   └── admin/
│       └── index.html         # Admin dashboard
```

## Setup Instructions

### Prerequisites
- Node.js (v16+)
- MongoDB (local or Atlas)
- npm or yarn

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env`:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/tenandsee
JWT_SECRET=your_super_secret_key_here
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=$2a$10$... (bcrypt hash)
```

To generate a password hash:
```javascript
const bcrypt = require('bcryptjs');
const hash = bcrypt.hashSync('yourpassword', 10);
console.log(hash);
```

### 3. Start MongoDB

Local MongoDB:
```bash
mongod
```

Or use MongoDB Atlas (cloud):
1. Create account at mongodb.com
2. Create cluster and database
3. Get connection string
4. Update MONGODB_URI in .env

### 4. Seed Initial Data (Optional)

Create an admin user via API or directly in MongoDB.

### 5. Start the Server

```bash
npm start
# or for development with auto-reload:
npm run dev
```

### 6. Access the Application

- **Website**: http://localhost:5000
- **Admin Panel**: http://localhost:5000/admin
- **API Base**: http://localhost:5000/api

## API Endpoints

### Listings
- `GET /api/listings` - Get all listings (with filters)
- `GET /api/listings/:id` - Get single listing
- `POST /api/listings` - Create listing (admin)
- `PUT /api/listings/:id` - Update listing (admin)
- `DELETE /api/listings/:id` - Delete listing (admin)
- `GET /api/listings/filters/options` - Get filter options

### Leads
- `GET /api/leads` - Get all leads (admin)
- `POST /api/leads` - Create lead (public)
- `GET /api/leads/:id` - Get single lead
- `PUT /api/leads/:id` - Update lead status (admin)
- `DELETE /api/leads/:id` - Delete lead (admin)

### Chat
- `POST /api/chat` - Send message
- `GET /api/chat/:sessionId` - Get session messages
- `GET /api/chat/admin/sessions` - Get all sessions (admin)
- `PUT /api/chat/read/:sessionId` - Mark as read (admin)

### Admin
- `POST /api/admin/login` - Admin login
- `GET /api/admin/profile` - Get profile (auth required)
- `POST /api/admin/create` - Create admin (admin only)

### Analytics
- `GET /api/analytics/dashboard` - Dashboard stats
- `GET /api/analytics/trends` - Lead trends (30 days)

## Lead Tracking

The platform automatically tracks leads from:
1. **Live Chat** - When users start a chat session
2. **WhatsApp** - When users click WhatsApp links
3. **Booking Form** - When users submit booking requests
4. **Contact Actions** - Any interaction that generates interest

Each lead includes:
- Name, email, phone
- Source (chat, whatsapp, booking_form, etc.)
- Linked listing (if applicable)
- Status (new, contacted, viewing_scheduled, converted, closed)
- IP address and user agent
- Timestamp

## Scalability Considerations

This architecture is designed to scale:

1. **Database**: MongoDB supports horizontal scaling via sharding
2. **API**: Stateless design allows load balancing
3. **Frontend**: Static files can be served via CDN
4. **Chat**: Can be upgraded to Socket.io for real-time
5. **Images**: Store in cloud storage (AWS S3, Cloudinary) instead of URLs
6. **Search**: Integrate Elasticsearch for advanced search

## Future Integrations

The codebase is structured to easily add:
- Payment gateways (Stripe, PayPal)
- Google Maps API for location display
- Email notifications (SendGrid, Mailgun)
- SMS notifications (Twilio)
- Calendar integration (Google Calendar)
- Document uploads (leases, IDs)
- Review/rating system
- Multi-language support

## Deployment

### Option 1: VPS (DigitalOcean, Linode, AWS EC2)
1. Set up Ubuntu server
2. Install Node.js, MongoDB, PM2
3. Clone repository
4. Configure environment variables
5. Use PM2: `pm2 start server.js`
6. Set up Nginx reverse proxy
7. Configure SSL with Let's Encrypt

### Option 2: Platform as a Service
- **Heroku**: Easy deployment with MongoDB Atlas
- **Railway**: Simple hosting with auto-deploy
- **Render**: Free tier available

### Option 3: Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY backend/package*.json ./
RUN npm install
COPY . .
EXPOSE 5000
CMD ["node", "backend/server.js"]
```

## Domain Connection

1. Purchase domain from registrar (Namecheap, GoDaddy, etc.)
2. Point A record to your server IP
3. Configure Nginx:
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Security Notes

- Change default JWT_SECRET in production
- Use strong admin passwords
- Enable MongoDB authentication
- Set up rate limiting on API
- Use HTTPS in production
- Sanitize user inputs
- Regular dependency updates

## Support

For questions or issues, contact the development team or open an issue in the repository.

---
Built with care for students worldwide.
# TEN-AND-SEE
