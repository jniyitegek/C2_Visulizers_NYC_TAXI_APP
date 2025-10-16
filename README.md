# NYC Taxi Web Application

A simple trip management application with a Node.js backend and vanilla JavaScript frontend.

## Project Overview
This is a comprehensive README.md file for the NYC Trips web-app, which analyzes data from the New York City Taxi Trip dataset, and presents the data on the interactive dashboard.

## Project Structure
```
NYC Taxi App/
├── backend/
│   ├── clean_data.js
│   ├── cleaning_log.json
│   ├── index.js
│   ├── package.json
│   ├── package-lock.json
│   ├── to_sqlite.js
│   └── trips.db (tracked with Git LFS)
│
└── frontend/
    ├── css/
    │   └── style.css
    ├── js/
    │   ├── app.js
    │   └── data.js (apis)
    ├── index.html
    ├── tripdetails.html
    └── .gitignore
```

## Prerequisites

- Node.js (v14 or higher)
- npm (comes with Node.js)
- Git
- Git LFS (Large File Storage)
- A modern web browser

## Installation & Setup

### 1. Install Git LFS

Git LFS is required to download the `trips.db` database file, which is stored using Git's Large File Storage system.

**On macOS:**
```bash
brew install git-lfs
```

**On Ubuntu/Debian:**
```bash
sudo apt-get install git-lfs
```

**On Windows:**
Download and install from [git-lfs.github.com](https://git-lfs.github.com/)


After installation, configure Git LFS:
```bash
git lfs install
```

### 2. Clone the Repository

Open your terminal and run:
```bash
git clone "https!!!"
cd NYC-TAXI
```

### 3. Pull Large Files with Git LFS

After cloning, pull the large files (including `trips.db`):
```bash
git lfs pull
```

This command will download the actual `trips.db` file from LFS storage.

### 4. Backend Setup

Navigate to the backend directory and install dependencies:
```bash
cd backend
npm install
```

Run the backend server, make sure that port 3000 is free on your computer:
```bash
node index.js
```

The backend should now be running (typically on `http://localhost:3000`).

### 5. Frontend Setup

Open a new terminal and navigate to the frontend directory:
```bash
cd frontend
```

**Option 1: Using VS Code Live Server**
- Inside the frontend folder, run `open index.html` to run it in the browser

## Usage

1. Make sure the backend is running first
2. Open the index.html from frontend in your browser
3. The application should now be fully functional

## Development Notes

- Backend runs on Node.js
- Frontend uses vanilla JavaScript (no framework)
- Database: SQLite (`trips.db`) inside the backend folder
- Large files (trips.db) are managed with Git LFS