"""
Simple startup script for Python backend (no reload)
"""
import sys
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

if __name__ == '__main__':
    print("=" * 60)
    print("🚀 Starting Python Backend with Groq API")
    print("=" * 60)
    print()
    
    # Check API key
    groq_key = os.getenv("GROQ_API_KEY")
    if not groq_key:
        print("❌ ERROR: GROQ_API_KEY not found in .env file")
        print("   Get your key from: https://console.groq.com/keys")
        input("Press Enter to exit...")
        sys.exit(1)
    
    print(f"✅ GROQ_API_KEY: {groq_key[:10]}...{groq_key[-5:]}")
    print()
    
    # Start server without reload (avoids multiprocessing issues on Windows)
    import uvicorn
    port = int(os.getenv("PORT", 5000))
    print(f"Starting server on http://0.0.0.0:{port}")
    print("Press CTRL+C to stop")
    print("=" * 60)
    print()
    
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=False)
