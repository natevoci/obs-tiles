# TODO list

- Configuration persistence
  - Import from URL
    - github
    - google drive (https://webapps.stackexchange.com/a/34001)
  - Store last import in localStorage
  - Allow local modifications, and store in localStorage
  - By loading external config (eg. store in github)
  - After importing
    - Warn if modifications
    - If success, "configuration changed", or "no changes detected"

- On startup check import URL. If configuration changes detected prompt to update.

- Confirmation popup when starting and stopping streaming and recording

- Warning message if using https instead of http

- Prevent screen sleeping
  - maybe with a looped video like suggested in https://stackoverflow.com/a/68301551
  - or maybe with https://github.com/richtr/NoSleep.js

- Generic "send" button
  - import URL in query string to allow bookmarks, and separate Configs

- Document tile types and properties

- Add background colour prop to groups

- YouTube demo

- [PWA](https://docs.microsoft.com/en-us/microsoft-edge/progressive-web-apps-chromium/get-started)
  - Add manifest
  - Add service worker with offline support
