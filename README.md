# Codeforces POTD Plus 🚀

A Chrome extension that enhances your Codeforces daily practice with personalized problems, streak tracking, and history.

## Features ✨

### 1. 🌍 Global Daily Problem
- A deterministic daily problem selected for all users.
- Rating range: **800 - 2000**.
- Refreshes automatically at **midnight local time**.

### 2. 👤 Personalized "For You" Problem
- Problems tailored specifically to your Codeforces rating.
- **Smart Logic**:
  - **Rating < 1000** (or Unrated): Problems selected from **800 - 1200** range.
  - **Rating ≥ 1000**: Problems selected from **Rating +/- 200** range.
- Filters out problems you have already solved.

### 3. 🔥 Streak System
- Tracks your **Current Streak** of consecutive days solving the "For You" problem.
- Tracks your **Max Streak** (all-time high).
- **Rules**:
  - Solve today -> Streak + 1.
  - Miss a day -> Streak resets to 0.

### 4. 📅 Calendar & History
- Visualizes your monthly progress.
- Dates with a solved "For You" problem are marked with a **Green Checkmark**.
- **Time Travel**: Click on any past date in the calendar to load and solve that day's specific "For You" problem!

### 5. 🎨 Enhanced UI
- **Dark Mode**: sleek Slate-900 theme.
- **Compact Layout**: Designed to fit perfectly in the extension popup without scrolling.
- **Dynamic Indicators**: Tabs turn **Green** with a checkmark when you solve the daily problem.

## Installation 🛠️

1. **Clone the repository**:
   ```bash
   git clone https://github.com/dilsec20/codeforces_potd.git
   ```
2. **Install dependencies**:
   ```bash
   cd codeforces_potd
   npm install
   ```
3. **Build the extension**:
   ```bash
   npm run build
   ```
4. **Load into Chrome**:
   - Open Chrome and go to `chrome://extensions`.
   - Enable **Developer Mode** (top right).
   - Click **Load unpacked**.
   - Select the `dist` folder generated in your project directory.

## License 📄
MIT
