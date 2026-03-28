# 🎨 Mad Editzzz — Photo Editing Presets Platform

A full-stack website for sharing and downloading photo editing presets.
Dark cinematic theme with admin panel, download countdown, and dynamic preset management.

---

## 🚀 Quick Start (Run Locally)

### Prerequisites
- **Node.js** v16 or higher → [Download here](https://nodejs.org)
- No database setup needed (uses JSON file storage)

### Step 1 — Get the files
Place the entire `mad-editzzz` folder somewhere on your computer.

### Step 2 — Install dependencies
Open your terminal, navigate to the project folder, and run:
```bash
cd mad-editzzz
npm install
```

### Step 3 — Start the server
```bash
npm start
```

You should see:
```
🎨 Mad Editzzz is running!
🌐 Open: http://localhost:3000
🔐 Admin: http://localhost:3000/admin
🔑 Password: mad@123
```

### Step 4 — Open in browser
- **Homepage:** http://localhost:3000
- **Admin panel:** http://localhost:3000/admin

---

## 🔑 Admin Access

- **URL:** `http://localhost:3000/admin`
- **Password:** `mad@123`

To change the password, open `server.js` and edit line 15:
```js
const ADMIN_PASSWORD = 'your-new-password';
```

---

## 📁 Project Structure

```
mad-editzzz/
├── server.js              ← Express server (backend)
├── package.json           ← Node.js dependencies
├── data/
│   └── presets.json       ← JSON database (auto-updated)
└── public/                ← Frontend files (served statically)
    ├── index.html         ← Homepage
    ├── admin.html         ← Admin panel
    ├── css/
    │   ├── style.css      ← Main styles (dark theme)
    │   └── admin.css      ← Admin-specific styles
    ├── js/
    │   ├── app.js         ← Homepage JS (grid, modal, countdown)
    │   └── admin.js       ← Admin JS (CRUD, auth)
    └── uploads/           ← Auto-created when images are uploaded
```

---

## ✨ Features

### Homepage
- Animated dark hero section with floating orbs
- Preset grid with category badges and download counts
- Filter by category (Portrait, Landscape, Cinematic, etc.)
- Live search
- Download modal with 30-second countdown timer
- Animated circular progress ring + progress bar
- Toast notification when download is ready

### Admin Panel
- Password-protected login
- Add presets with image upload (drag & drop) or image URL
- Edit existing presets
- Delete presets
- Changes appear instantly on homepage

---

## 🔧 Customization

### Add more categories
In `public/index.html`, add a button to the filters section:
```html
<button class="filter-btn" data-filter="Nature">Nature</button>
```

### Change countdown timer
In `public/js/app.js`, find `startCountdown(30)` and change `30` to any seconds.

### Change accent color
In `public/css/style.css`, change:
```css
--accent: #e8ff3c;
```

### Use a real database
Replace the `readData()` and `writeData()` functions in `server.js` with MongoDB queries using Mongoose. The API routes remain the same.

---

## 📦 Dependencies

| Package | Purpose |
|---------|---------|
| express | Web server |
| express-session | Admin authentication |
| multer | Image file uploads |
| uuid | Unique preset IDs |

---

## 🌐 Deployment

### Deploy to Railway (free)
1. Push code to GitHub
2. Connect repo to [Railway.app](https://railway.app)
3. Set `PORT` environment variable if needed

### Deploy to Render (free)
1. Push to GitHub
2. Create a Web Service on [Render.com](https://render.com)
3. Build command: `npm install`
4. Start command: `node server.js`

---

Made with 🔥 for photo editors everywhere.
