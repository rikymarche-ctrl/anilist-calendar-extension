# Anilist Weekly Schedule

> Transform your Anilist experience with a beautiful weekly calendar view of your anime release schedule.

![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)

![Anilist Weekly Schedule](https://via.placeholder.com/800x400?text=Anilist+Weekly+Schedule+Screenshot)

## Overview

Anilist Weekly Schedule enhances your anime tracking experience by replacing the basic "Airing" section with an intuitive weekly calendar. Instead of just showing a list of upcoming episodes with numbers, this extension organizes your shows by day of the week, making it much easier to see at a glance when new episodes are releasing.

The extension is designed to integrate seamlessly with Anilist's interface, respecting both light and dark themes while providing a clean, responsive layout that works on both desktop and mobile.

## Features

- **Weekly Calendar View**: See your airing anime organized by day of the week
- **Episode Information**: Clear display of episode numbers and airing times
- **Current Day Highlight**: Today's column is highlighted for quick reference
- **Responsive Design**: Works perfectly on both desktop and mobile devices
- **Custom Styling**: Matches Anilist's design language and respects the site's theme
- **Cached Data**: Efficiently stores schedule data to minimize API requests
- **Manual Refresh**: Update your schedule data anytime with a single click

## Browser Compatibility

Compatible with modern Chromium-based browsers, including Chrome, Edge, and Brave.

## Installation

Installation steps are similar across browsers:

1. Download the latest release from the [Releases](https://github.com/rikymarche-ctrl/anilist-weekly-schedule/releases) page
2. Unzip the file to a location of your choice
3. Go to your browser's extensions page:
    - Chrome: `chrome://extensions/`
    - Edge: `edge://extensions/`
    - Brave: `brave://extensions/`
    - Other browsers: Check your browser's menu for the extensions/add-ons section
4. Enable "Developer mode" (usually a toggle in the top-right corner)
5. Click "Load unpacked" and select the extension directory (unzipped)

## Usage

1. Navigate to [Anilist](https://anilist.co) and log in to your account
2. The extension will automatically replace the "Airing" section on your home page with the weekly calendar
3. Click on any anime in the calendar to go to its page
4. Use the "Refresh Schedule" button at the bottom of the calendar to update the data if needed

## Privacy

This extension:
- Works exclusively on anilist.co
- Stores schedule data locally in your browser for caching purposes
- Makes API requests only to the official Anilist GraphQL endpoint
- Does not collect or transmit any personal data

## Development

### Prerequisites
- Basic knowledge of JavaScript, HTML, and CSS
- Web browser with developer tools

### Local Setup
```bash
# Clone the repository
git clone https://github.com/rikymarche-ctrl/anilist-weekly-schedule.git

# Navigate to project directory
cd anilist-weekly-schedule

# Load the extension in your browser following the installation steps
```

### Project Structure
- `manifest.json`: Extension configuration
- `content.js`: Main script that detects and replaces the Airing section
- `styles.css`: Styling for the weekly calendar view
- `icons/`: Extension icons in various sizes

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE.txt](LICENSE.txt) file for details.

## Acknowledgments

- Thanks to the Anilist team for providing a great API
- Inspired by various calendar applications and anime tracking solutions

---

Made with ❤️ for the Anilist community
