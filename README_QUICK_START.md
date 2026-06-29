# Quick Start Guide - Financial ChatBot

## 🚀 Start All Services (Easiest Way)

**Double-click:** `start-all-services.bat`

This will launch all three services automatically:
1. Python AI Service (Port 5000)
2. Node.js Backend (Port 8000)  
3. React Frontend (Port 5173)

---

## 🔧 Manual Start (If needed)

### 1. Start Python AI Service
```bash
cd Python-Backend
python start.py
```
**Verify:** Open http://localhost:5000/health

### 2. Start Node.js Backend
```bash
cd Backend
npm run dev
```
**Verify:** Open http://localhost:8000/api/v1/health

### 3. Start React Frontend
```bash
cd Frontend
npm run dev
```
**Verify:** Open http://localhost:5173

---

## ❌ Common Issues & Fixes

### Issue 1: "EMFILE: too many open files"
**Fixed!** Updated `vite.config.js` to exclude node_modules from watching.

### Issue 2: Chat not responding
**Cause:** Python AI service not running
**Fix:** Start Python service first (see above)

### Issue 3: "@import must precede all other statements"
**Fixed!** Moved Google Fonts import before Tailwind in `index.css`

### Issue 4: Connection refused errors
**Cause:** Services not started in order
**Fix:** Use `start-all-services.bat` or start manually in order (Python → Node → React)

---

## ✅ Verify Everything is Working

1. **Python AI Service:** http://localhost:5000/health
   - Should show: `{"status":"healthy","message":"Financial Analysis Python Service is running"}`

2. **Node.js Backend:** http://localhost:8000/api/v1/health
   - Should show: `{"status":"OK","message":"FinChatBot API is running"}`

3. **React Frontend:** http://localhost:5173
   - Should open the app in your browser

4. **Test Chat:**
   - Login to the app
   - Upload a financial document
   - Send a message
   - Should receive AI response

---

## 🛑 Stop All Services

Press `Ctrl + C` in each terminal window or close the windows.

---

## 📦 Dependencies Check

If services fail to start, verify dependencies:

### Python Dependencies:
```bash
cd Python-Backend
pip install -r requirements.txt
```

### Node.js Dependencies:
```bash
cd Backend
npm install

cd ../Frontend
npm install
```

---

## 🔍 Debugging

### Check Python Service Logs:
Look in the Python service terminal for errors

### Check Node.js Backend Logs:
Look in the Backend terminal for:
- `✅ Python AI Service: Connected` (good)
- `❌ Python AI Service: NOT RUNNING` (start Python service)

### Check Frontend Console:
Open browser DevTools (F12) → Console tab for errors

---

## 💡 Pro Tips

1. Always start Python service FIRST (other services depend on it)
2. Clear Vite cache if you see weird errors: `rm -rf Frontend/node_modules/.vite`
3. Check firewall isn't blocking ports 5000, 8000, or 5173
4. Make sure MongoDB is running (backend needs it)

---

## 📧 Still Having Issues?

Check the error messages in the terminal and:
1. Ensure all environment variables are set (`.env` files)
2. Verify MongoDB connection string is correct
3. Check Python dependencies are installed
4. Ensure ports 5000, 8000, 5173 are not in use by other apps
