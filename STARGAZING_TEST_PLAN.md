# Stargazing App - Validation & Regression Checklist

This document provides a set of manual test scenarios to verify the functionality of the Stargazing application after any code changes.

## 1. Core Functionality & UI
- [ ] **Initial Load**: Verify the page loads with a "Detecting location" message.
- [ ] **Location Detection**: 
    - [ ] Verify IP-based location automatically detects the city and coordinates.
    - [ ] Verify clicking "Use Precise Location" triggers a browser permission prompt (if supported).
- [ ] **Clock Display**: 
    - [ ] Verify UTC time updates every second.
    - [ ] Verify Local System Time updates every second and shows the correct timezone abbreviation.

## 2. Astronomical Data rendering
- [ ] **Sun & Moon Cycles**:
    - [ ] Verify "Next Sunrise/Sunset" and "Next Moonrise/Moonset" display the correct upcoming event time.
    - [ ] Verify the blue progress bar accurately reflects the time elapsed within the current cycle (e.g., Rise to Set).
    - [ ] Verify the time range (e.g., `HH:MM - HH:MM`) is displayed below the progress bar.
- [ ] **Moon Phase**:
    - [ ] Verify the phase name (e.g., "Waxing Gibbous") matches the current date.
    - [ ] Verify the progress bar shows the progress from New Moon to the next New Moon.

## 3. Vedic Calendar (Paanji)
- [ ] **Basic Details**:
    - [ ] Verify **Tithi** displays a correct icon (🌘/🌒) and name.
    - [ ] **Critical**: Verify **Purnima** displays the Full Moon icon (🌕) and **Amavasya** displays the New Moon icon (🌑).
    - [ ] Verify **Nakshatra** displays the current lunar mansion and associated star.
    - [ ] Verify **Rashi** (Sun and Moon) accurately shows the current sidereal signs.
- [ ] **Progress Bars & Ranges**:
    - [ ] Verify all Vedic attributes (Tithi, Nakshatra, Rashi, Masa, Vaara, Paksha, Prahara) have a blue progress bar.
    - [ ] Verify the start and end times for the current attribute are displayed in the format `DD/MM HH:MM`.
- [ ] **Language Selection**:
    - [ ] Verify changing the language (Hindi, Bangla, etc.) updates all Vedic labels and attribute names immediately.
- [ ] **Prahara**:
    - [ ] Verify the **⏳ Prahara** section displays the current 3-hour division (e.g., `Day Prahara 2/4`) and updates as time passes.

## 4. Observing Conditions (Weather)
- [ ] **Data Rendering**:
    - [ ] Verify Cloud Cover, Visibility, AQI, and Humidity display numerical values.
    - [ ] Verify the "Observing Status" badge color and text change correctly based on weather (Excellent, Fair, or Poor).

## 5. Rashi Chart (Planetary Positions)
- [ ] **Chart Layout**:
    - [ ] Verify the 12-cell square grid is displayed correctly.
    - [ ] Verify each cell contains the correct Western and Sanskrit sign names.
- [ ] **Planetary Icons**:
    - [ ] Verify planets (Sun, Moon, Mercury, etc.) are positioned in the correct sign cells.
    - [ ] Verify the retrograde icon `(R)` appears in red for planets moving backwards.
    - [ ] Verify hovering over a planet reveals a tooltip with Degree, Nakshatra, and Motion.

## 6. External Interactivity & Links
- [ ] **Sky Chart (VirtualSky)**:
    - [ ] Verify the interactive star map loads at the bottom.
    - [ ] Verify **Zoom Buttons**: Clicking `+` or `-` focuses the map (allowing keyboard zoom `[` and `]`).
    - [ ] Verify **Interaction**: Click and drag within the map rotates the view.
- [ ] **Heavens-Above Link**:
    - [ ] Verify the link includes the correct Latitude/Longitude in the URL and opens the custom sky chart for the user's location.

## 7. Responsiveness & SEO
- [ ] **Responsive Design**: Verify the container and charts scale correctly on mobile devices (single column vs grid).
- [ ] **Meta Tags**: Verify `<title>` and `<meta name="description">` contain keywords like "Space", "Astronomy", and "Rashi".
- [ ] **SEO Content**: Verify the "About Stargazing App" section is present in the footer for indexing.
