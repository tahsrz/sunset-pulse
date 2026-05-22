# TAH / Memoria v4 Super-Cartridge Specification

Status: Draft, reader prototype started  
Last updated: May 20, 2026  
Primary goal: Define a future cartridge format that can package every existing `.tah` and `.hat/.tah` cartridge into one high-capacity, provenance-aware Memoria pair.

## 1. Purpose

Memoria v4 is the proposed archive format for Atlas Pulse scale.

The current system can already read:

- Single-file indexed `.tah` cartridges.
- Split Memoria `.hat/.tah` pairs.
- Raw swarm-style `.tah` streams with sidecar metadata.

The v4 goal is to consolidate those sources into one canonical super-cartridge:

```text
atlas_pulse_master.hat
atlas_pulse_master.tah
```

The `.hat` file remains the Header Atlas: metadata, indexes, source tables, route tables, and filter structures. The `.tah` file remains the payload store: text shards, compressed blocks, optional vector or spatial payloads, and future binary data.

## 2. Design Goals

1. Package all locally created cartridges into a single searchable Memoria pair.
2. Preserve every source cartridge, source path, source type, and build timestamp.
3. Support Atlas Pulse mapping by linking digital shards to physical places.
4. Raise theoretical address capacity by using wider offsets, counts, and section sizes.
5. Keep old v3 and v3.5 cartridges importable through a deterministic migration process.
6. Let readers reject unsupported versions cleanly instead of misreading bytes.
7. Support incremental rebuilds so one changed source cartridge does not require reprocessing the entire archive.

## 3. Non-Goals

- v4 does not replace small cartridges for development, debugging, or targeted publishing.
- v4 does not imply that any deployment can practically store exabytes of data.
- v4 does not make raw MLS listing text, private records, or third-party copyrighted content safe to store. Ingest still needs compliance filters.
- v4 does not require every reader to support every optional section.

## 4. Existing Format Baseline

### Indexed TAH v3

The TypeScript `TAHBuilder` currently creates one `.tah` file with:

- 64-byte header.
- Global Bloom filter.
- Fixed-width shard index entries.
- Inline payload text.

This is efficient for small, focused cartridges.

### Memoria v3.5 Pair

The current Memoria reader expects:

- `.hat`: header, global Bloom filter, fixed-width index entries, local shard Bloom filters.
- `.tah`: payload text referenced by offsets in `.hat`.

This is the right foundation for a larger archive because the index and payload can scale independently.

## 5. Capacity Model

The commonly discussed upper bound of 18.4 exabytes comes from an unsigned 64-bit byte offset:

```text
2^64 - 1 bytes = 18,446,744,073,709,551,615 bytes
```

That is about 18.4 exabytes in decimal units, or 16 exbibytes in binary units.

For v4, this number should be treated as addressable range, not practical operating capacity. Practical capacity is constrained by filesystem limits, object storage limits, build time, memory pressure, network transfer, backup strategy, and index rebuild cost.

The v4 format should support:

- 64-bit offsets for normal high-capacity archives.
- Optional 128-bit logical offsets for sharded object-storage layouts.
- 64-bit shard counts.
- 64-bit source counts.
- 64-bit section byte sizes.

## 6. File Pair Roles

### `.hat`: Header Atlas

The `.hat` file contains the navigation structure:

- Superblock.
- Section directory.
- Global filters.
- Source table.
- Domain table.
- Place table.
- Shard index.
- Optional term statistics.
- Optional BM25 metadata.
- Optional compression dictionary metadata.
- Optional route and publication metadata.

### `.tah`: Payload Store

The `.tah` file contains the shard payloads:

- Text shards.
- Compressed text blocks.
- Spatial payloads.
- Future image, vector, or embedding payloads.
- Optional per-block checksums.

The `.tah` file should remain append-friendly so future incremental builds can add new blocks without immediately rewriting all existing payload bytes.

## 7. Superblock

The v4 `.hat` file starts with a fixed-size superblock.

Proposed fields:

| Field | Type | Purpose |
| --- | --- | --- |
| magic | u32 | Identifies Memoria v4. |
| version_major | u16 | Major format version. |
| version_minor | u16 | Minor format version. |
| flags | u64 | Feature flags. |
| section_count | u32 | Number of section directory entries. |
| hash_family | u16 | Hash algorithm family. |
| default_bloom_k | u16 | Default Bloom hash count. |
| shard_count | u64 | Total payload shards. |
| source_count | u64 | Total source cartridges. |
| place_count | u64 | Total physical anchors. |
| build_unix_ms | u64 | Build timestamp. |
| hat_byte_size | u64 | Declared `.hat` byte size. |
| tah_byte_size | u64 | Declared `.tah` byte size. |
| header_checksum | u128 | Checksum for critical header bytes. |

The exact byte layout can be finalized during implementation. The important rule is that readers must be able to identify v4 before parsing section-specific structures.

## 8. Section Directory

After the superblock, v4 uses a section directory rather than fixed offsets.

Each section entry should include:

- Section type.
- Section version.
- Byte offset.
- Byte length.
- Item count.
- Compression mode.
- Checksum.

This lets the format evolve without forcing every table to stay at a hard-coded offset forever.

Required sections:

- `GLOBAL_FILTER`
- `SOURCE_TABLE`
- `SHARD_INDEX`
- `PAYLOAD_MAP`

Recommended sections:

- `DOMAIN_TABLE`
- `PLACE_TABLE`
- `TERM_STATS`
- `BM25_STATS`
- `ROUTE_TABLE`
- `BUILD_MANIFEST`

Optional sections:

- `VECTOR_INDEX`
- `SPATIAL_INDEX`
- `COMPRESSION_DICT`
- `DELETION_TOMBSTONES`
- `SIGNATURES`

## 9. Source Table

Every imported cartridge gets one source-table row.

Proposed fields:

| Field | Type | Purpose |
| --- | --- | --- |
| source_id | u64 | Stable row id. |
| source_slug | string_ref | Human and route-safe id. |
| source_name | string_ref | Original filename. |
| source_type | enum | `indexed-tah`, `memoria-pair`, `swarm-stream`, `text-import`, `unknown`. |
| source_path_hash | u64 | Hash of original relative path. |
| source_content_hash | u256 | Content checksum. |
| imported_unix_ms | u64 | Import time. |
| shard_start | u64 | First shard id from this source. |
| shard_count | u64 | Number of shards from this source. |
| domain_id | u64 | Domain classification. |
| place_id | u64 | Strongest physical anchor, if known. |

This table is the key to keeping the super-cartridge debuggable. A search result should always be able to explain where it came from.

## 10. Place Table

Atlas Pulse needs a first-class place model.

Proposed fields:

| Field | Type | Purpose |
| --- | --- | --- |
| place_id | u64 | Stable place id. |
| place_slug | string_ref | Route-safe place id. |
| label | string_ref | Display name. |
| lat | f64 | Latitude. |
| lng | f64 | Longitude. |
| place_type | enum | City, county, neighborhood, parcel, venue, region, unknown. |
| confidence | f32 | Confidence of digital-to-physical binding. |
| coverage | f32 | Atlas Pulse completion percentage. |
| parent_place_id | u64 | Optional containing place. |

The progress bar in Atlas Pulse can read from this table instead of guessing coverage from filenames.

## 11. Shard Index

Each shard should know its payload position, source, place, and retrieval hints.

Proposed fields:

| Field | Type | Purpose |
| --- | --- | --- |
| shard_id | u64 | Stable shard id. |
| source_id | u64 | Original cartridge source. |
| place_id | u64 | Physical anchor, if any. |
| domain_id | u64 | Domain classifier. |
| payload_offset | u64 or u128 | Position in `.tah`. |
| payload_length | u64 | Payload byte length. |
| payload_type | enum | Text, coord, image, vector, binary. |
| compression | enum | None, zstd, gzip, brotli, custom. |
| word_count | u32 | Text complexity estimate. |
| quality_score | f32 | Optional ingest quality score. |
| local_filter_ref | section_ref | Local Bloom or shard filter. |
| bm25_ref | section_ref | Optional BM25 stats row. |

## 12. Retrieval Indexes

v4 should support layered retrieval:

1. Global Bloom filter: quick archive-level rejection.
2. Source Bloom filters: route queries toward likely source cartridges.
3. Place Bloom filters: route Atlas Pulse queries toward physical anchors.
4. Local shard filters: identify candidate shards.
5. BM25 ranking: score candidates with term frequency and document-length normalization.
6. Optional semantic reranking: future vector or model-based refinement.

BM25 should be stored as a deterministic optional section:

- Term hash.
- Document frequency.
- Average document length.
- Per-shard term frequency hints.

This gives the archive a science-backed ranking layer without making embeddings mandatory.

## 13. Hashing

The current system uses CityHash-style 64-bit hashing for TAH and Memoria filters.

v4 should define hash families explicitly:

- `cityhash64-v1` for compatibility with current cartridges.
- `cityhash128-v1` for future wide identifiers.
- `sha256` or `blake3` for content checksums.

Bloom filters should store the hash family, `m`, and `k` with the section that owns them. That lets future filters use different parameters without changing the whole file format.

## 14. Import Pipeline

The v4 packager should run in stages:

1. Discover cartridge roots.
2. Classify each file as indexed `.tah`, Memoria pair, swarm stream, or raw text.
3. Extract text shards and metadata.
4. Normalize text and remove unsafe or non-compliant material.
5. Segment oversized payloads.
6. Assign source ids, domain ids, and place ids.
7. Build source, place, and shard tables.
8. Build Bloom filters and BM25 statistics.
9. Write `.tah` payload blocks.
10. Write `.hat` sections and checksums.
11. Verify the archive through a read-after-write search suite.

## 15. Incremental Builds

The first version may rebuild the archive from scratch. The target design should allow incremental builds.

Incremental state should track:

- Source content hash.
- Prior source id.
- Prior shard id range.
- Deleted or replaced sources.
- Payload append offsets.
- Tombstone sections for removed shards.

The reader should ignore tombstoned shards. A compaction job can later rewrite the pair into a smaller archive.

## 16. Compatibility Strategy

v4 should not break current readers. Instead:

- Current v3/v3.5 readers continue reading existing cartridges.
- A new `MemoriaV4Retriever` reads v4.
- A packager imports existing cartridges into v4.
- API routes can prefer v4 when present and fall back to the current catalog.
- `/tah` can display v4 as one master cartridge while still listing source cartridges.

## 17. API Surface

Recommended future endpoints:

| Endpoint | Purpose |
| --- | --- |
| `POST /api/tah/pack` | Build a v4 super-cartridge from selected sources. |
| `GET /api/tah/master` | Return master archive metadata. |
| `GET /api/tah/master/sources` | List source cartridges inside the master archive. |
| `GET /api/tah/master/places` | List Atlas Pulse physical anchors. |
| `POST /api/tah/master/search` | Search the master archive. |
| `POST /api/tah/master/verify` | Run read-after-write verification. |

The current `/api/tah/forge` endpoint can remain focused on creating individual `.tah` files and v3.5 Memoria pairs.

## 18. Atlas Pulse Integration

The master archive should feed Atlas Pulse directly.

Atlas Pulse can calculate:

- Total mapped places.
- Place-level coverage.
- Strongest cartridge-to-place binding.
- Source density by region.
- Search confidence by place.
- Build progress during long packager runs.

A place progress value should come from source coverage, shard confidence, and verified retrieval quality, not only from the presence of a file.

## 19. Compliance and Safety

Every import path must preserve compliance boundaries.

Required controls:

- Exclude raw MLS listing prose unless the data is explicitly allowed and sanitized.
- Exclude private user data unless the target archive is private.
- Store source provenance so unsafe content can be traced and removed.
- Support deletion tombstones for removal requests.
- Avoid publishing private local paths in public metadata.
- Keep public route tables separate from local build manifests.

## 20. Implementation Milestones

### Milestone 1: v3.5 Packager

- Use the current `MemoriaBuilder`.
- Package selected existing cartridges into one `.hat/.tah` pair.
- Preserve source labels in shard text.
- Verify search against known terms.

### Milestone 2: v4 Reader Prototype

- Define superblock and section directory.
- Implement read-only metadata parsing.
- Add fixture tests for unsupported-version rejection.
- Initial TypeScript prototype: `lib/core/memoria_v4.ts`.

### Milestone 3: v4 Writer Prototype

- Write source table, shard index, and payload map.
- Store checksums.
- Run read-after-write tests.

### Milestone 4: Atlas Pulse Binding

- Add place table.
- Attach cartridges to physical anchors.
- Expose progress data to Atlas Pulse.

### Milestone 5: Ranking Layer

- Add BM25 term statistics.
- Compare v3.5 local Bloom search against v4 Bloom plus BM25.
- Tune score explainability.

### Milestone 6: Incremental Build

- Track source hashes.
- Append changed sources.
- Tombstone removed sources.
- Add compaction tooling.

## 21. Open Questions

1. Should v4 use 64-bit physical offsets only, or include optional 128-bit logical object-store offsets from day one?
2. Should payload compression be per-shard or per-block?
3. Should BM25 term stats live entirely in `.hat`, or should large term tables spill into `.tah`?
4. Should place binding happen during packaging, or should Atlas Pulse maintain a separate editable place registry?
5. Should source cartridges be embedded verbatim for perfect reconstruction, or should v4 store extracted shards only?
6. What is the minimum reader subset required for web deployment?
7. Should the public master archive be separate from private/operator archives?

## 22. Near-Term Recommendation

Build v4 in two layers.

First, ship a practical v3.5 super-cartridge packager using the current reader-compatible Memoria pair. This gives Atlas Pulse a real master archive quickly.

Second, implement v4 as a parallel experimental format with explicit section directories, source tables, place tables, and BM25 stats. Once the reader and writer are stable, the site can prefer v4 while continuing to publish smaller cartridges for debugging, crawling, and targeted updates.
