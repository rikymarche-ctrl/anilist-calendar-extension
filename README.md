# Anilist Calendar (Unofficial)


> Transform your Anilist experience with a beautiful weekly calendar view of your anime release schedule.

![License: GNU GPL3](https://img.shields.io/badge/License-GPL3-blue.svg)

## Overview

Anilist Calendar enhances your anime tracking experience by replacing the basic "Airing" section with an intuitive weekly calendar. Instead of just showing a list of upcoming episodes with countdowns, this extension organizes your shows by day of the week, making it much easier to see at a glance when new episodes are releasing.

The extension integrates seamlessly with Anilist's interface, fully respecting light, dark, and high contrast themes while providing a clean, responsive layout that works on both desktop and mobile devices.

![Anilist Hover Comments](https://imgur.com/CUZz0U2.png)

## Features

- **Weekly Calendar View**: See your airing anime organized by day of the week
- **Multiple Layout Modes**:
    - **Standard**: Detailed view with titles, episode numbers, and times
    - **Compact**: Space-efficient layout ideal for many shows
    - **Gallery**: Image-focused grid view with hover details
- **Episode Progress**: Easily mark episodes as watched directly from the calendar
- **Customization Options**:
    - Choose which day to display first (Today, Sunday, Monday, etc.)
    - Hide empty days with no scheduled episodes
    - Toggle time display (on/off)
    - Toggle episode numbers (on/off)
    - Choose time format (release time or countdown)
    - Adjust title alignment (left or center)
    - Column justification (top or center)
    - Full-width images in standard mode
    - Set maximum cards per day in gallery mode
- **Theme Support**: Automatically adapts to Anilist's light, dark, and high contrast themes
- **Responsive Design**: Works smoothly on devices of all sizes

## Installation

### Chrome, Edge, Brave, and other Chromium-based browsers

1. Download the latest release from the [Releases](https://github.com/rikymarche-ctrl/anilist-calendar-extension/releases) page
2. Unzip the file to a location of your choice
3. Go to your browser's extensions page:
    - Chrome: `chrome://extensions/`
    - Edge: `edge://extensions/`
    - Brave: `brave://extensions/`
4. Enable "Developer mode" (toggle in the top-right corner)
5. Click "Load unpacked" and select the extension directory you unzipped

## Usage

1. Navigate to [Anilist](https://anilist.co) and log in to your account
2. The extension will automatically replace the "Airing" section on your home page with the weekly calendar
3. Click the settings icon (⚙️) in the calendar header or section header to customize your view
4. Mark episodes as watched by clicking the + button on each anime card
5. Click on any anime card to navigate to its detailed page

### Settings Options

- **Layout Style**: Choose between Standard, Compact, or Gallery view
- **Full Width Images**: (Standard mode) Expand images to fill the entire card
- **Max Cards Per Day**: (Gallery mode) Limit the number of cards shown per day
- **Title Alignment**: Align titles to the left or center
- **Column Alignment**: Position content at the top or center of columns
- **Hide Empty Days**: Only show days with scheduled episodes
- **First Day of Week**: Choose which day to display first
- **Show Episode Numbers**: Toggle display of episode information
- **Show Time**: Toggle display of airing time
- **Time Format**: Choose between release time or countdown

## Privacy

This extension:
- Works exclusively on anilist.co
- Stores your preferences locally in your browser using `chrome.storage.sync`
- Does not collect or transmit any personal data
- Does not modify any Anilist data (only reads and displays it)

## Development

### Project Structure
- **init.js** - Initializes global namespace and theme detection
- **utils.js** - Common utility functions
- **settings.js** - Handles user preferences
- **settings-ui.js** - User interface for settings
- **calendar.js** - Creates and manages the weekly calendar view
- **main.js** - Main entry point that replaces the Airing section
- **CSS files** - Styling for calendar, settings, and common elements

### Local Development

```bash
# Clone the repository
git clone https://github.com/rikymarche-ctrl/anilist-calendar-extension

# Navigate to project directory
cd anilist-calendar-extension

# Follow installation steps to load the extension in developer mode
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the GNU GPL3 License - see the [LICENSE.txt](LICENSE.txt) file for details.

## Acknowledgments

- Thanks to the Anilist team for providing a great anime tracking platform
- The awesome anime community for inspiration and feedback

---

Made with ❤️ for the Anilist community