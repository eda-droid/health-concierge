# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased] - 2026-05-23

### Added
- Further improved the Apple Watch import flow and made it day-bound.
- Added the ability to delete today’s Apple Watch import without affecting meals, water, training logs, or history.
- Added clearer status display for imported Health data.

### Changed
- Refined the Apple Watch import logic to handle energy units correctly.
- Added support for `kcal` and `kJ` in Health Auto Export imports.
- Reworked the calorie model conceptually into resting metabolic rate, activity, steps/NEAT, and TEF.
- Made the calorie breakdown in the UI clearer so the source of each value is easier to understand.

### Fixed
- Identified the issue causing imported calories to appear too high: `kJ` values could be treated as if they were `kcal`.
- Reduced or prepared to reduce potential double-counting of activity calories from Watch data and steps.
- Addressed the issue where Watch imports could remain active too long as current-day values.

### Next
- Cleanly separate step-based calories from Apple Watch active energy to avoid double counting.
- Add a body-fat / body composition adjustment for resting metabolic rate.
- Further improve training-log-based activity calorie estimation when no Watch import is available.
