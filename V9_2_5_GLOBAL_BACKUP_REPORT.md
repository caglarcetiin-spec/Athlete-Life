# Athlete Life OS v9.2.5 — Global Backup Quick Action

- Added a persistent **Tüm Verileri Yedekle** action to the global top bar next to **Sürpriz Plan**.
- The action is visible on every application page because it lives outside page sections in the shared header.
- Reuses `BackupVault.exportBackup(true)`; no duplicate backup/export implementation was introduced.
- Full backup includes application data and Photo Progress images, identical to Settings > Data Vault > Tam Yedek.
- Added busy/disabled state while the backup file is being prepared.
- Backup filename version updated to 9.2.5.
- PWA cache bumped to `athlete-life-os-v9-2-5-global-backup`.
- Added `global-backup-v925.test.js` and updated cache-version regression expectations.
