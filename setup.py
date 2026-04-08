"""
Setup script to prepare the development environment
"""
import subprocess
import sys
from pathlib import Path


def main():
    """Setup development environment"""
    print("🚀 Setting up Continium Desktop development environment...")
    
    # Check Python version
    if sys.version_info < (3, 10):
        print("❌ Python 3.10+ is required")
        sys.exit(1)
    
    print(f"✅ Python {sys.version_info.major}.{sys.version_info.minor} detected")
    
    # Install dependencies
    print("\n📦 Installing dependencies...")
    subprocess.run([sys.executable, "-m", "pip", "install", "--upgrade", "pip"], check=True)
    subprocess.run([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"], check=True)
    
    print("\n✅ Setup complete!")
    print("\n📝 Next steps:")
    print("   1. Add your app icons to resources/ folder")
    print("   2. Run the app: python src/main.py")
    print("   3. Build installer: python build.py")


if __name__ == "__main__":
    main()
