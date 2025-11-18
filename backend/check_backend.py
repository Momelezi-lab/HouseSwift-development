#!/usr/bin/env python3
"""
Quick script to check if backend is running
"""
import requests
import sys

def check_backend():
    urls = [
        'http://127.0.0.1:5001/api/health',
        'http://localhost:5001/api/health',
        'https://house-hero-backend.onrender.com/api/health'
    ]
    
    print("Checking backend connection...")
    print("=" * 50)
    
    for url in urls:
        try:
            response = requests.get(url, timeout=3)
            if response.status_code == 200:
                print(f"✅ BACKEND IS RUNNING!")
                print(f"   URL: {url}")
                print(f"   Response: {response.json()}")
                return True
            else:
                print(f"❌ {url} - Status: {response.status_code}")
        except requests.exceptions.ConnectionError:
            print(f"❌ {url} - Connection refused (backend not running)")
        except requests.exceptions.Timeout:
            print(f"⏱️  {url} - Timeout")
        except Exception as e:
            print(f"❌ {url} - Error: {str(e)}")
    
    print("\n" + "=" * 50)
    print("Backend is NOT running or not accessible.")
    print("\nTo start the backend:")
    print("1. cd backend")
    print("2. python app.py")
    print("   OR")
    print("2. flask run --port 5001")
    return False

if __name__ == '__main__':
    check_backend()

