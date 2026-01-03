# Stargazing App Backlog

## Completed Tasks
- [x] **Vedic Tithi Calculation**: Calculate and display the current Tithi based on Moon and Sun positions.
- [x] **Rashi Chart (Kundali)**: Display a South Indian style Rashi chart showing planetary positions (Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn, Uranus, Neptune) in the zodiac signs.
- [x] **Planetary Positions**: Calculate geocentric positions for the chart using `astronomy-engine`.
- [x] **Location Services**: IP-based and GPS-based location detection.
- [x] **Weather Integration**: Cloud cover, visibility, and AQI for observing conditions.
- [x] **Sky Map Integration**: Interactive Virtual Sky embed with zoom and constellation labels.

## Future Ideas
- [ ] **Cloud Run Backend**: Move API calls (Open-Meteo, Nominatim, IP-API) and potentially heavy astronomical calculations to a Cloud Run service.
    - **Hosting Integration**: Use Firebase Hosting rewrites (`/api/**`) to point to the Cloud Run service.
    - **Benefits**: Improved security (managed API keys), unified domain (no CORS), and reduced client-side bundle size.
- [ ] **Search Functionality**: Allow users to search for manual locations instead of just auto-detecting.
- [ ] **Night Mode UI Enhancements**: More refined dark mode aesthetics for field use.
