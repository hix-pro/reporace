# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial public release.

### Fixed
- Demo generation is now atomic. The daily-history wipe, the 30 days of generated rows, and the `data_mode=demo` / `demo_seeded_at` / `tracking_since` labels commit in a single transaction. A crash mid-run previously could delete existing history with nothing replacing it, or leave generated demo rows in the database while `data_mode` still read as `live` — silently summing demo rows into the 7d/30d gains under the LIVE badge. That can no longer happen: either the whole demo state commits or none of it does.
- A rate-limited GitHub API (HTTP 403/429 with the quota exhausted) now aborts a `seed` or `collect` run immediately, with the quota reset time in the error message, instead of skipping every repository one by one and reporting a mostly-empty snapshot as success. Existing data stays untouched in that case. Transient 5xx responses get one retry before a repository is skipped, and GraphQL responses that carry errors beside usable repository data are no longer discarded wholesale.
- `upsertRepo` now fails with a clear message when a repository's (renamed) full name would collide with a different tracked repository, naming both rows and pointing at `data/seed-repos.json`, instead of surfacing a raw SQLite UNIQUE constraint error.
- `shortDay` returns malformed day strings as-is instead of throwing a RangeError, matching the degrade-honestly behavior of the other formatters (`timeAgo`, `formatPercent`).
