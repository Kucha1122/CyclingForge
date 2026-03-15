# Scripts

## Zwift workouts (whatsonzwift.com)

To add Zwift workouts from [whatsonzwift.com](https://whatsonzwift.com/workouts) as system workouts:

1. **Collect workout URLs and generate .zwo files**
   ```bash
   pip install requests beautifulsoup4
   # Optional: clone wozzwo for ZWO generation
   # git clone https://github.com/markdrayton/wozzwo && pip install -r wozzwo/requirements.txt
   python fetch_zwift_workouts.py --output-dir ./zwift_zwo --urls-only
   ```
   With wozzwo (generates .zwo files):
   ```bash
   python fetch_zwift_workouts.py --output-dir ./zwift_zwo --wozzwo ../wozzwo/wozzwo.py --delay 2
   ```

2. **Configure the app** to load ZWO from that folder:
   - In `appsettings.json` (or environment): set `Workouts:SeedZwiftEnabled` to `true` and `Workouts:SeedZwiftFromPath` to the full path of `zwift_zwo`.

3. **Seed the database**
   - Either restart the app (seeder runs on startup when no system workouts exist), or
   - Call `POST /api/workouts/seed-zwift` (with auth) to add new ZWO files from the configured path without restarting.

Respect [whatsonzwift.com Terms and conditions](https://whatsonzwift.com/terms-conditions/) and use `--delay` to throttle requests.
