# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.8.0]

### Changed

- **Breaking:** `map(data, callback, options?)` now returns a transformed array or
  dictionary. Its callback is `(key, value, path)` and returns the replacement value.
  Removed the store argument and accumulator behavior; use `each` for accumulation.
- Deep map callbacks run children first; callback replacements are not traversed
  again. `false`, `null`, and `undefined` are ordinary mapped values.
- `MapCallback<TResult, TKey>` describes the returned value and key type instead
  of the former store type. Results retain the input container kind and keys.

### Added

- `MapOptions` as the third argument, with `descend` to prune original containers
  before mapping their children, and `shallow: true` for one-level mapping.
- Shallow dictionary callbacks infer string keys; shallow array callbacks infer
  numeric indexes. Dynamic or deep calls keep `WalkKey`.

## [1.7.0]

### Added

- `flush(data, path)` now accepts `string | string[]` to delete multiple paths in order.
- `equally(a, b, paths?)` accepts an optional `string[]` to compare only selected paths.
  Omitting it preserves full comparison; an empty list returns `true`.

### Changed

- Returning exactly `false` from an `each` callback now stops the entire traversal
  for objects and arrays. Other return values remain ignored, and `descend: false`
  still skips only children. Callbacks that previously returned `false` must omit
  that return to keep walking. `map` still ignores callback results.
- `each` reads object property values as they are visited rather than reading all
  sibling values up front, so stopping prevents subsequent getter calls.
- Replaced internal `for...of` loops with `each`, restricting descent for shallow
  object lists. Sparse path lists in `flush` and fallback lists in `extract` now
  skip holes consistently with `each`.

### Fixed

- `equally` no longer treats a `Date` or `RegExp` as equal to an ordinary object
  with matching own properties.
- Sparse-array equality now checks every index, removing argument-order-dependent
  results while retaining equality between holes and explicit `undefined` slots.
  Both fixes also apply to selected paths and `diff` comparisons.

## [1.6.0]

### Added

- `diff(first, last)` and the public `DiffOperation` type — describe changes as
  `set`/`delete` operations with literal path segments and `[]` for root replacement.
  Recurses through plain objects' own enumerable string keys, compares arrays and
  other values with `equally`, and distinguishes deletion from `null`/`undefined`.
  Inputs are not mutated or cloned; cycles are outside the contract.
- Documented `diff` in the README and the bundled agent skill.
- `each` now supplies literal path segments as its fourth callback argument.
- `each` options: `root` visits the root, and `descend` controls traversal into
  container contents. Existing callbacks keep their key types and ignored return values.
- Public `EachEntry` and `EachOptions` types, and root-aware `EachCallback` typing.

### Changed

- `diff` now traverses through `each`, preserving operation order and replacement semantics.

## [1.5.0] - 2026-10-17

### Added

- `flush(data, path)` — delete nested own properties with explicit array-index support.
  Mutates and returns the input, leaves missing or non-object parents unchanged,
  and preserves empty containers. Array item deletion leaves a hole without shifting
  indexes or changing length. Getter, proxy, and non-configurable deletion errors propagate.
- Documented `flush` in the README and the bundled agent skill.

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

[1.6.0]: https://github.com/khalilov/objwalk/compare/v1.5.0...HEAD
[1.5.0]: https://github.com/khalilov/objwalk/compare/v1.4.0...v1.5.0
[1.3.9]: https://github.com/khalilov/objwalk/compare/v1.2.0...v1.3.9
[1.2.0]: https://github.com/khalilov/objwalk/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/khalilov/objwalk/compare/v1.0.1...v1.1.0
[1.0.1]: https://github.com/khalilov/objwalk/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/khalilov/objwalk/compare/v0.2.0...v1.0.0
[0.2.0]: https://github.com/khalilov/objwalk/releases/tag/v0.2.0
