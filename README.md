# 🕐 Sesame CLI

A modern command-line interface for Sesame Time, built with Node.js and React Ink. Track your work time, check in/out of projects, and monitor your daily progress directly from your terminal.

## ✨ Features

- **Interactive Terminal UI**: Beautiful, responsive interface built with React Ink
- **Real-time Work Tracking**: Live timer showing current session and daily progress
- **Project Management**: Easy project selection with visual icons
- **Persistent Sessions**: Automatically saves authentication and continues tracking across app restarts
- **Status Indicators**: Animated loading spinners and colored status messages
- **Time Calculation**: Automatically calculates elapsed time since last check-in on startup

## 🚀 Installation

### Method 1: Global Installation (Recommended)

1. Clone the repository:
```bash
git clone <repository-url>
cd sesame-cli
```

2. Install globally:
```bash
npm install -g .
```

This will install all dependencies and make the `sesame-cli` command available globally in your terminal.

### Method 2: Local Development

1. Clone the repository:
```bash
git clone <repository-url>
cd sesame-cli
```

2. Install dependencies:
```bash
npm install
```

3. Run with Node.js:
```bash
node index.js
```

## 💻 Usage

### Starting the Application

**If installed globally:**
```bash
sesame-cli
```

**If running locally:**
```bash
node index.js
```

### First Time Setup

On first run, you'll be prompted to enter your Sesame Time credentials:
- Email address
- Password

Your session will be saved securely for future use.

### Main Interface

The application displays three main sections:

1. **Work Status Panel** (top): Shows your current status, work time summary, and session timer
2. **Action Menu** (middle): Interactive menu for check-in/check-out operations
3. **Status Messages** (bottom): Real-time feedback with animated loading indicators

### Available Actions

- **⭐ Check In**: View and select from your assigned projects
- **🏁 Check Out**: End your current work session
- **🚪 Quit**: Exit the application

### Project Selection

When checking in, you'll see a list of your assigned projects:
- 📋 Project Name 1
- 📋 Project Name 2
- ⬅️ Back

## 📊 Work Time Display

### When Offline
- Shows static daily work summary
- Displays scheduled hours, worked hours, and completion percentage
- Shows remaining time needed

### When Online
- Live updating work timer
- Real-time session duration
- Dynamic progress tracking
- Automatic time calculation including elapsed time since last check-in

## 🎨 Visual Features

- **Animated Loading Indicators**: Spinning braille patterns (`⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏`) during operations
- **Color-coded Status Messages**:
  - 🟡 Yellow: Loading operations
  - 🟢 Green: Success messages
  - 🔴 Red: Error messages
- **Bordered Interface Sections**: Clean visual separation of content areas
- **Project Icons**: 📋 Visual representation of work projects

## 🔧 Configuration

The application automatically manages configuration in `~/.sesame-cli/config.json`:

- Session tokens and cookies
- User information
- Work status
- Current project details
- Time tracking data

## 📝 Status Messages

The application provides real-time feedback for all operations:

- `⠋ Getting your assigned projects...`
- `⠙ Checking in...`
- `⠹ Checking out...`
- `✨ Projects loaded successfully`
- `🎉 Check-in successful!`
- `💥 Failed to get projects`

## 🔒 Security

- Credentials are stored locally in your home directory
- Session tokens are managed securely
- No sensitive information is logged to console
- Automatic session persistence for convenience

## 🛠️ Technical Details

### Built With

- **Node.js**: Runtime environment
- **React**: UI framework
- **Ink**: Terminal UI components
- **Axios**: HTTP client for API requests
- **Prompts**: Interactive command-line prompts

### Architecture

- **SesameAPI Class**: Handles all API interactions with Sesame Time
- **React Components**: Interactive terminal interface
- **State Management**: Real-time updates and user interactions
- **Configuration Management**: Persistent storage of user data

### API Integration

The application integrates with the Sesame Time API:
- Authentication endpoints
- User information retrieval
- Project assignment queries
- Check-in/check-out operations
- Real-time work status updates

## 🚨 Error Handling

The application gracefully handles various error scenarios:
- Network connectivity issues
- Invalid credentials
- API rate limiting
- Missing project assignments
- Session expiration

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Commit your changes: `git commit -m 'Add feature'`
5. Push to the branch: `git push origin feature-name`
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

If you encounter any issues or have questions:

1. Check the status messages in the application
2. Verify your internet connection
3. Ensure your Sesame Time credentials are correct
4. Try logging out and logging back in

---

Made with ❤️ for better time tracking