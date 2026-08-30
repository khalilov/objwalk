# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.0] - 2026-08-30

### Added

- `clone` — deep clone of objects and arrays with `Date`, `RegExp`, symbol keys,
  and circular reference support.

## [1.2.0] - 2026-08-30

### Added

- `equally` — deep structural equality with `NaN`, `Date`, `RegExp`, symbol keys,
  and circular reference support.

## [1.1.0] - 2026-07-31

### Added

- `pick` options: `inherited` and `ignore` to restrict property lookups.

## [1.0.1] - 2026-07-14

### Changed

- Added `prepublishOnly` build step.

## [1.0.0] - 2026-07-14

### Added

- `merge` — deep merge of plain objects.

## [0.2.0] - 2026-07-10

### Added

- `each` — walk an object and call a function for each value.
- `map` — walk an object and build a new result.
- `pick`, `set`, `extract` utilities with the path syntax.

[Unreleased]: https://github.com/khalilov/objwalk/compare/v1.3.9...HEAD
[1.3.9]: https://github.com/khalilov/objwalk/compare/v1.2.0...v1.3.9
[1.2.0]: https://github.com/khalilov/objwalk/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/khalilov/objwalk/compare/v1.0.1...v1.1.0
[1.0.1]: https://github.com/khalilov/objwalk/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/khalilov/objwalk/compare/v0.2.0...v1.0.0
[0.2.0]: https://github.com/khalilov/objwalk/releases/tag/v0.2.0
