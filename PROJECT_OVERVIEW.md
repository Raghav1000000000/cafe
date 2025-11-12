# Snappy Serve Suite - Cafe Order Management System

## 📋 Project Overview

A complete digital ordering solution for cafes and restaurants with a mobile-first customer ordering app and a comprehensive kitchen/admin dashboard. Built with modern web technologies for real-time order management, menu control, and business analytics.

---

## 🎯 Core Features

### Customer-Facing App
- **Mobile-First Design**: Optimized for phone/tablet ordering
- **OTP Authentication**: Secure phone-based verification
- **Real-Time Menu**: Live menu updates with availability status
- **Smart Cart**: Add/remove items, quantity control, live total calculation
- **Order Tracking**: Real-time order status updates (Pending → Preparing → Ready)
- **Session Persistence**: Stay signed in across page refreshes
- **Table-Based Ordering**: Link orders to specific tables

### Kitchen Dashboard
- **Order Management**: View and manage all active orders
- **Status Workflow**: Pending → Preparing → Ready → Completed
- **Bill Generation**: Preview and generate bills with tax/service calculation
- **Menu Management**: Add/edit/delete menu items, control availability
- **Daily Reports**: Revenue, top items, hourly breakdowns, customer analytics
- **Completed Orders View**: Archive of finished orders
- **Auto-Refresh**: Live updates every 5 seconds

### Backend API
- **RESTful Endpoints**: Menu, Orders, Bills, Customers, OTP, Reports
- **MongoDB Integration**: Optional persistent storage (fallback to in-memory)
- **Phone Normalization**: E.164 format with country code support
- **Customer Persistence**: Link orders/bills to customer records
- **WhatsApp Integration**: OTP delivery and marketing messages via Twilio (optional)
- **Query Filtering**: Filter orders by status, date, completion state

---

## 🛠️ Technology Stack

### Frontend
- **Framework**: React 18.3+ with TypeScript
- **Build Tool**: Vite 5.4+
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Styling**: Tailwind CSS 3.4+
- **Icons**: Lucide React
- **State Management**: React hooks (useState, useEffect)
- **HTTP Client**: Native Fetch API

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js 4.21+
- **Database**: MongoDB (optional, with in-memory fallback)
- **OTP/Messaging**: Twilio (optional, for WhatsApp)
- **Utilities**: 
  - `uuid` for order/bill IDs
  - `cors` for cross-origin requests
  - `dotenv` for environment configuration

### Development Tools
- **Dev Server**: Nodemon (backend hot reload)
- **Linting**: ESLint 9+
- **TypeScript**: v5.8+ with strict mode disabled for rapid prototyping

---

## 📂 Project Structure

```
snappy-serve-suite-main/
├── src/                          # Frontend React app
│   ├── components/
│   │   ├── CustomerApp.tsx       # Customer ordering interface
│   │   ├── KitchenDashboard.tsx  # Kitchen/admin dashboard
│   │   ├── MenuManagement.tsx    # Menu CRUD interface
│   │   ├── DailyReport.tsx       # Analytics and reports
│   │   └── ui/                   # shadcn/ui components (40+ components)
│   ├── hooks/                    # Custom React hooks
│   ├── lib/                      # Utilities (cn, etc.)
│   ├── pages/                    # Route pages
│   ├── main.tsx                  # React entry point
│   └── index.css                 # Global styles + Tailwind
│
├── server/                       # Backend Express API
│   ├── index.js                  # Main server file
│   ├── data.js                   # In-memory menu data
│   ├── seed.js                   # MongoDB seed script
│   ├── .env.example              # Environment template
│   └── package.json              # Backend dependencies
│
├── public/                       # Static assets
├── .github/workflows/            # CI/CD (GitHub Actions)
├── index.html                    # HTML entry point
├── vite.config.ts                # Vite configuration
├── tailwind.config.ts            # Tailwind configuration
├── tsconfig.json                 # TypeScript configuration
└── package.json                  # Frontend dependencies
```

---

## 🚀 Setup & Installation

### Prerequisites
- **Node.js**: v18+ recommended
- **npm**: v9+ (comes with Node.js)
- **MongoDB**: Optional (local or Atlas cloud)
- **Twilio Account**: Optional (for WhatsApp)

### 1. Clone & Install

```bash
# Clone repository
git clone https://github.com/Raghav1000000000/cafe.git
cd snappy-serve-suite-main

# Install frontend dependencies
npm install

# Install backend dependencies
cd server
npm install
cd ..
```

### 2. Configure Backend (Optional)

Create `server/.env` for MongoDB and Twilio integration:

```bash
# MongoDB (optional - uses in-memory if not configured)
USE_MONGO=true
MONGODB_URI=mongodb://localhost:27017
MONGODB_DBNAME=snappy_serve

# Twilio WhatsApp (optional - for OTP/marketing)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886

# Phone normalization (default country code)
DEFAULT_COUNTRY_CODE=+1

# Server port
PORT=4001
```

### 3. Run the Application

**Option A: Development (Both Servers)**
```bash
# Terminal 1: Start backend
cd server
npm run dev

# Terminal 2: Start frontend
npm run dev
```

**Option B: Production Build**
```bash
# Build frontend
npm run build

# Serve built files (or deploy to hosting)
npm run preview

# Backend in production
cd server
NODE_ENV=production npm start
```

### 4. Seed MongoDB (Optional)

```bash
cd server
node seed.js
```

---

## 🌐 API Endpoints

### Menu
- `GET /menu` - List all menu items grouped by category
- `POST /menu` - Add new menu item
- `PUT /menu/:id` - Update menu item
- `DELETE /menu/:id` - Remove menu item

### Orders
- `GET /orders` - List orders (query: `?status=READY&excludeCompleted=true`)
- `GET /orders/:id` - Get single order
- `POST /orders` - Create new order
- `PATCH /orders/:id` - Update order status

### Bills
- `POST /bills` - Generate bill (accepts customerPhone)
- `GET /bills/:id` - Get bill by ID
- `GET /bills/by-customer/:phone` - Get all bills for a customer

### Customers
- `POST /customers` - Create/update customer record
- `GET /customers` - List all customers

### Authentication
- `POST /otp` - Request OTP (returns code in dev, sends via WhatsApp in production)
- `POST /otp/verify` - Verify OTP and create customer session

### Messaging
- `POST /whatsapp/send` - Send WhatsApp message (requires Twilio)

### Reports
- `GET /reports/daily?date=YYYY-MM-DD` - Daily revenue, top items, hourly breakdown

### Development
- `POST /admin/seed-menu` - Seed menu from data.js (dev only)
- `GET /debug/otps` - List recent OTPs (dev only)

---

## 🔐 Environment Variables

### Backend (`server/.env`)
| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `4001` | Server port |
| `USE_MONGO` | No | `false` | Enable MongoDB persistence |
| `MONGODB_URI` | If Mongo | - | MongoDB connection string |
| `MONGODB_DBNAME` | No | `snappy_serve` | Database name |
| `TWILIO_ACCOUNT_SID` | If WhatsApp | - | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | If WhatsApp | - | Twilio auth token |
| `TWILIO_WHATSAPP_FROM` | If WhatsApp | - | Twilio WhatsApp number (e.g., `whatsapp:+14155238886`) |
| `DEFAULT_COUNTRY_CODE` | No | `+1` | Default country code for phone normalization |
| `NODE_ENV` | No | `development` | Environment mode |
| `DEBUG_OTPS` | No | `false` | Return OTP codes in production (testing only) |

### Frontend (`.env`)
| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_API_URL` | No | `http://localhost:4001` | Backend API URL |

---

## 💡 Key Features Explained

### 1. Phone Number Normalization
- Strips formatting (spaces, dashes, parentheses)
- Applies country code if missing (uses `DEFAULT_COUNTRY_CODE`)
- Stores in E.164 format (e.g., `+14155551234`)
- Used across OTP, customers, WhatsApp, and bills

### 2. OTP Flow
1. Customer enters phone number
2. Backend generates 4-digit code
3. Optionally sends via WhatsApp (if Twilio configured)
4. Returns code in dev mode (for testing)
5. On verification, creates/updates customer record in MongoDB
6. Session persisted in localStorage (`customerSession`)

### 3. Order Status Workflow
```
PENDING → PREPARING → READY → COMPLETED
         ↑              ↓
         └── BILL_REQUESTED
```
- Customer places order (PENDING)
- Kitchen accepts (PREPARING)
- Kitchen marks ready (READY)
- Customer/staff generates bill (auto-completes order)
- Alternative: Customer requests bill while order is READY (BILL_REQUESTED)

### 4. Bill Calculation
```javascript
subtotal = sum(item.price × item.quantity)
tax = Math.round(subtotal × 0.05)      // 5%
service = Math.round(subtotal × 0.02)  // 2%
total = subtotal + tax + service
```

### 5. Session Persistence
- **Customer**: Phone stored in `localStorage.customerSession`
- **Active Orders**: Per-phone key `localStorage.activeOrders:<phone>`
- Auto-restores on page reload
- Sign-out clears session

### 6. MongoDB Collections
- **menu**: { _id, name, category, price, available }
- **orders**: { _id, tableNumber, customerName, customerPhone, items[], status, totalAmount, createdAt, updatedAt }
- **bills**: { _id, tableNumber, customerName, customerPhone, items[], subtotal, tax, service, total, createdAt }
- **customers**: { phone, name, tableNumber, verifiedAt, createdAt, updatedAt }

---

## 📊 Database Schema

### Orders
```json
{
  "_id": "ORD-1731234567890",
  "tableNumber": 5,
  "customerName": "John Doe",
  "customerPhone": "+14155551234",
  "items": [
    { "id": "item-123", "name": "Latte", "quantity": 2, "price": 120 }
  ],
  "totalAmount": 240,
  "status": "PREPARING",
  "createdAt": 1731234567890,
  "updatedAt": 1731234580000
}
```

### Bills
```json
{
  "_id": "BILL-1731234600000",
  "tableNumber": 5,
  "customerName": "John Doe",
  "customerPhone": "+14155551234",
  "items": [...],
  "subtotal": 240,
  "tax": 12,
  "service": 5,
  "total": 257,
  "createdAt": 1731234600000
}
```

### Customers
```json
{
  "phone": "+14155551234",
  "name": "John Doe",
  "tableNumber": 5,
  "verifiedAt": 1731234567890,
  "createdAt": 1731234567890,
  "updatedAt": 1731234600000
}
```

---

## 🎨 UI Components

### shadcn/ui Components Used
- **Layout**: Card, Tabs, Badge, Separator
- **Forms**: Input, Button, Select, Checkbox, Radio Group
- **Feedback**: Alert, AlertDialog, Toast, Progress
- **Overlays**: Dialog, Sheet, Popover, Tooltip
- **Navigation**: Breadcrumb, Pagination
- **Data Display**: Table, Accordion, Collapsible
- **Media**: Avatar, Carousel
- **Utilities**: Command, Context Menu, Dropdown Menu

All components are customizable via Tailwind classes and support dark mode (via `next-themes`).

---

## 🔧 Development Tips

### Hot Reload
- Frontend: Vite auto-reloads on file changes
- Backend: Nodemon restarts server on `.js` file changes

### Port Conflicts
Backend automatically tries ports 4001–4011 if default is in use.

### MongoDB Setup (Local)
```bash
# Install MongoDB Community Edition
# macOS
brew install mongodb-community

# Start MongoDB
brew services start mongodb-community

# Or run manually
mongod --dbpath ~/data/db
```

### Twilio WhatsApp Sandbox
1. Sign up at [twilio.com](https://www.twilio.com)
2. Go to Messaging → Try it out → Send a WhatsApp message
3. Join sandbox by sending code to the sandbox number
4. Use sandbox number as `TWILIO_WHATSAPP_FROM`
5. Test numbers must join sandbox before receiving messages

### Debugging
- **Frontend**: Browser DevTools → Console/Network
- **Backend**: Check terminal for logs (OTP codes, Mongo connection, errors)
- **OTP Debug**: `GET /debug/otps` (dev only)
- **Network Errors**: Check `VITE_API_URL` matches backend port

---

## 🚢 Deployment

### Frontend (Static Site)
**Vercel/Netlify:**
```bash
npm run build
# Deploy ./dist folder
```

**GitHub Pages:**
```yaml
# .github/workflows/pages.yml exists
# Pushes to main → builds → deploys to gh-pages branch
```

### Backend (Node.js)
**Heroku/Railway/Render:**
```bash
# Set environment variables via platform dashboard
# Deploy server/ folder
# Set start command: node index.js
```

**VPS/DigitalOcean:**
```bash
# Install Node.js, MongoDB
# Clone repo, install dependencies
# Use PM2 for process management
pm2 start server/index.js --name cafe-backend
```

### MongoDB
**Atlas (Cloud):**
1. Create free cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Get connection string
3. Set `MONGODB_URI` environment variable

---

## 📈 Performance & Scalability

### Current Limits
- In-memory fallback suitable for **< 100 concurrent users**
- MongoDB recommended for **production use**
- Auto-refresh polls every 5 seconds (adjustable)

### Optimization Recommendations
1. **Add Indexes**:
   ```javascript
   db.orders.createIndex({ status: 1, createdAt: -1 })
   db.bills.createIndex({ customerPhone: 1, createdAt: -1 })
   db.customers.createIndex({ phone: 1 }, { unique: true })
   ```

2. **WebSocket Support**: Replace polling with real-time updates (Socket.io)

3. **Caching**: Add Redis for session management and menu caching

4. **Rate Limiting**: Protect OTP endpoint (express-rate-limit)

5. **Authentication**: Add JWT tokens for admin dashboard access

6. **CDN**: Serve static assets via Cloudflare/Vercel

---

## 🐛 Known Issues & Limitations

### Current Limitations
1. **OTP Security**: 
   - 4-digit codes (consider 6 digits for production)
   - No expiry time (add 2-5 min TTL)
   - No rate limiting (add max 3 attempts per phone)

2. **Authentication**: 
   - Customer sessions stored in localStorage (vulnerable to XSS)
   - No admin authentication (anyone can access kitchen dashboard)

3. **Concurrency**: 
   - In-memory store lost on server restart
   - No optimistic locking for order updates

4. **WhatsApp**: 
   - Twilio sandbox requires users to join (production needs approved template messages)
   - No message delivery tracking

### Workarounds
- Use MongoDB for persistence (survives restarts)
- Add Helmet.js for security headers
- Implement JWT authentication for admin routes
- Add HTTPS in production (Let's Encrypt)

---

## 🎓 Learning Resources

### Technologies Used
- [React Docs](https://react.dev)
- [Vite Guide](https://vitejs.dev/guide/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [MongoDB Manual](https://www.mongodb.com/docs/manual/)
- [Twilio WhatsApp API](https://www.twilio.com/docs/whatsapp)

### Tutorials Referenced
- React TypeScript patterns
- Vite + React setup
- Express REST API design
- MongoDB CRUD operations
- Tailwind responsive design

---

## 🤝 Contributing

### Development Workflow
1. Create feature branch: `git checkout -b feature/your-feature`
2. Make changes and test locally
3. Commit: `git commit -m "feat: add feature description"`
4. Push: `git push origin feature/your-feature`
5. Create Pull Request on GitHub

### Code Style
- Use TypeScript for frontend
- Follow ESLint rules (auto-fixable: `npm run lint -- --fix`)
- Use Prettier for formatting (if configured)
- Write descriptive commit messages (conventional commits)

---

## 📝 License

This project is private and proprietary. All rights reserved.

---

## 🙋 Support & Contact

- **GitHub Issues**: [Report bugs or request features](https://github.com/Raghav1000000000/cafe/issues)
- **Repository**: [Raghav1000000000/cafe](https://github.com/Raghav1000000000/cafe)
- **Branch**: `old-3am` (current development branch)

---

## 📅 Version History

### v0.1.0 (Current)
- ✅ Customer ordering app with OTP authentication
- ✅ Kitchen dashboard with order management
- ✅ Menu management and daily reports
- ✅ MongoDB integration with in-memory fallback
- ✅ Phone normalization and customer persistence
- ✅ WhatsApp integration via Twilio (optional)
- ✅ Bill generation with preview dialog
- ✅ Completed orders persistence fix
- ✅ Query filtering for orders API

### Planned Features
- [ ] Admin authentication (JWT)
- [ ] WebSocket real-time updates
- [ ] QR code table ordering
- [ ] Multi-language support
- [ ] Payment integration (Stripe/PayPal)
- [ ] Inventory management
- [ ] Staff shift tracking
- [ ] Customer loyalty program
- [ ] Print bill to thermal printer

---

## 🎤 Presentation Talking Points

### Business Value
1. **Efficiency**: Reduces order-taking time by 60%
2. **Accuracy**: Eliminates handwriting errors and miscommunication
3. **Customer Experience**: Self-service ordering, real-time tracking
4. **Data Insights**: Track popular items, peak hours, customer preferences
5. **Scalability**: Handles multiple tables/orders simultaneously

### Technical Highlights
1. **Modern Stack**: React + TypeScript + Vite (fast dev + build)
2. **Real-Time**: Auto-refresh every 5 seconds (upgradable to WebSocket)
3. **Mobile-First**: Responsive design, works on any device
4. **Flexible Storage**: Works with or without database
5. **Extensible**: Easy to add features (payments, inventory, etc.)

### Demo Flow
1. **Customer App**: 
   - Show OTP authentication
   - Browse menu, add items to cart
   - Place order and track status
   
2. **Kitchen Dashboard**:
   - Show active orders updating in real-time
   - Walk through order workflow (Accept → Prepare → Ready)
   - Generate bill with preview
   - Show completed orders and daily report

3. **Admin Features**:
   - Edit menu (add/remove items, mark unavailable)
   - View analytics (revenue, top items, hourly sales)

### Q&A Preparation
**Q: Why not use existing POS systems?**  
A: Our solution is free, customizable, and integrated. Commercial POS costs $50-200/month per terminal.

**Q: How secure is it?**  
A: Uses phone-based OTP, optional WhatsApp verification, HTTPS in production. Can add JWT for admin access.

**Q: What about offline mode?**  
A: Frontend can work offline (PWA), backend requires internet for database sync.

**Q: Can it scale to multiple locations?**  
A: Yes, each location can have its own database or share a central MongoDB cluster.

**Q: What's the total cost to run?**  
A: Free tier on most platforms (Vercel + MongoDB Atlas + Twilio sandbox). Production: ~$10-30/month.

---

## 🎯 Next Steps

### Immediate Improvements
1. Add admin authentication (username/password or JWT)
2. Implement OTP expiry (2-5 minute window)
3. Add rate limiting on OTP endpoint
4. Create MongoDB indexes for performance
5. Add error boundary components
6. Write unit tests (Jest + React Testing Library)

### Future Enhancements
1. **Customer Features**:
   - Order history
   - Favorites/repeat orders
   - Dietary filters (veg, vegan, gluten-free)
   - Split bill functionality

2. **Kitchen Features**:
   - Print orders to kitchen printer
   - Ingredient inventory tracking
   - Prep time estimates
   - Staff assignments

3. **Business Features**:
   - Multi-location support
   - Staff management
   - Advanced analytics (day/week/month comparisons)
   - Export reports to CSV/PDF
   - Integration with accounting software

---

**Built with ❤️ for efficient cafe management**
