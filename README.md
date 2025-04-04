# Anilist Weekly Schedule

> Transform your Anilist experience with a beautiful weekly calendar view of your anime release schedule.

![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)

## Overview

Anilist Weekly Schedule enhances your anime tracking experience by replacing the basic "Airing" section with an intuitive weekly calendar. Instead of just showing a list of upcoming episodes with countdowns, this extension organizes your shows by day of the week, making it much easier to see at a glance when new episodes are releasing.

The extension is designed to integrate seamlessly with Anilist's interface, respecting both light and dark themes while providing a clean, responsive layout that works on both desktop and mobile.

## Features

- **Weekly Calendar View**: See your airing anime organized by day of the week
- **Episode Information**: Clear display of episode numbers and airing times
- **Current Day Highlight**: Today's column is highlighted for quick reference
- **Multiple Display Modes**:
   - **Standard Mode**: Detailed view with titles, episode numbers, and times
   - **Compact Mode**: Space-efficient layout ideal for many shows
   - **Grid Mode**: Image-focused view similar to Anilist's default style with hover details
- **Customizable Start Day**: Choose which day of the week appears first (Today, Sunday, Monday, etc.)
- **Empty Day Filtering**: Option to hide days with no scheduled episodes
- **Responsive Design**: Works perfectly on both desktop and mobile devices
- **Custom Styling**: Matches Anilist's design language and respects the site's theme

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
3. Click the settings icon in the calendar header to customize your view:
   - Change the first day of the week
   - Toggle compact mode for a more condensed view
   - Enable grid mode to see anime covers in a gallery layout
   - Choose to hide empty days
4. Click on any anime in the calendar to go to its page

## Privacy

This extension:
- Works exclusively on anilist.co
- Stores user preferences locally in your browser
- Does not collect or transmit any personal data
- Does not modify any Anilist data

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
- `options.html/js`: Options page for extension settings
- `popup.html/js`: Extension popup interface
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

- Thanks to the Anilist team for providing a great anime tracking platform
- Inspired by various calendar applications and anime tracking solutions

---

Made with ❤️ for the Anilist community