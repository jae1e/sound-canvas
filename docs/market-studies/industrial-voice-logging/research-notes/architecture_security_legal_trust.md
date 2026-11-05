# Voice-first industrial logging app: architecture, data, security, legal and trust-UX fact base

Research date: 2026-11-05 (all URLs accessed that day unless noted). Labels: [F] verified on a primary source (official docs, statute text, licence file or commit); [V] vendor claim about its own product; [P] third party (law firm, press, blog, paper, wiki); [A] anecdote; [E] estimate; [H] hypothesis. Not legal advice; items marked "counsel" need a lawyer. Scope excludes market/competitors, robot/AV language-data demand and ASR model choice (covered by other researchers). Stack assumptions (Expo/React Native + TypeScript + Kotlin modules, one combined foreground service) come from `docs/products/voice-life-companion/technical-decisions.md` §2, §7, §9 and are not re-derived. The web-search budget ran out near the end of the session; the last few checks used direct fetches of known primary URLs and the GitHub API only.

## 1. Offline-first sync engines that can be fully self-hosted (React Native/Expo fit, licences, conflict needs)

### Takeaway
For an append-mostly log, the lowest-risk design is your own outbox sync: an append-only SQLite event table on the device, idempotent batch push, and a small pull channel. Use no CRDT. If you want a ready engine, PowerSync is now the strongest self-hosted option: its service moved from FSL to Apache-2.0 on 2026-11-03, it has an Expo-compatible SDK, and SQLCipher works through op-sqlite. The other engines fail on at least one hard constraint:
- Zero (Rocicorp) has no offline writes.
- Electric syncs reads only.
- Turso's offline sync is a beta with no durability guarantee.
- Realm/Atlas Device Sync is end-of-life.
- Couchbase React Native needs the Enterprise edition.
- Ditto is proprietary, with contact-sales pricing.

### Cited Findings
**PowerSync**
- The PowerSync Service repo is Apache-2.0 since 2026-11-03. Commit "Change license from FSL to Apache-2.0 (#878)" switched the root and submodule licences and removed the CLA. Before that the service was FSL-1.1-ALv2 (commit of 2025-08-06). [F] [GitHub commit history of LICENSE](https://github.com/powersync-ja/powersync-service/commits/main/LICENSE), [PR #878](https://github.com/powersync-ja/powersync-service/pull/878)
- PowerSync's legal pages still describe the self-hosted "Open Edition" as FSL. They say FSL software converts to an OSI licence two years after release, and that client SDKs are Apache-2.0. These pages may lag the 2026-11-03 change, and `powersync.com/legal/overview` returned 404 on 2026-11-05. [V] [PowerSync licensing terms](https://powersync.com/legal/licensing-terms), [Open Edition release post](https://www.powersync.com/blog/powersync-open-edition-release)
- The client SDK repo `powersync-js` is Apache-2.0 and was pushed 2026-11-05. [F] [GitHub](https://github.com/powersync-ja/powersync-js)
- Self-hosting: the service ships as the Docker image `journeyapps/powersync-service`. The CLI sets up a Docker Compose stack for local development. The dashboard is not available when self-hosting. A paid "Enterprise Self-Hosted Edition" with custom pricing exists. [V] [PowerSync self-hosting docs](https://docs.powersync.com/self-hosting/getting-started)
- Write path:
  - The app writes to local SQLite and the SDK adds the write to an upload queue.
  - The SDK calls your `uploadData()` connector, which sends the writes to your own API. That API must apply them synchronously to the source database.
  - The model is "server-authoritative architecture with a checkpoint system for conflict resolution".

  [V] [PowerSync: writing client changes](https://docs.powersync.com/installation/app-backend-setup/writing-client-changes)
- PowerSync's op-sqlite package accepts `sqliteOptions.encryptionKey` for SQLCipher. [V] [@powersync/op-sqlite on npm](https://www.npmjs.com/package/@powersync/op-sqlite)

**Electric**
- Electric is Apache-2.0 (repo pushed 2026-10-06). [F] [GitHub electric-sql/electric](https://github.com/electric-sql/electric)
- "Electric does not do write-path sync". Writes go through your API using optimistic or "through-the-database" patterns. Full offline support needs a local embedded database such as PGlite. [V] [Electric writes guide](https://electric.ax/docs/guides/writes)

**Zero / Replicache (Rocicorp)**
- Zero and Replicache are published from `rocicorp/mono` under Apache-2.0 (pushed 2026-11-04). [F] [GitHub rocicorp/mono](https://github.com/rocicorp/mono)
- Zero supports React Native and Expo through an expo-sqlite or op-sqlite `kvStore`. [V] [Zero React Native docs](https://zero.rocicorp.dev/docs/react-native)
- Zero has no offline writes. While the client is disconnected, "reads from synced data continue to work, but writes are rejected". The mutation-recovery system from Replicache "has not yet been ported to Zero", and the issue is still open. [V] [Zero connection docs](https://zero.rocicorp.dev/docs/connection), [Bug 246605](https://bugs.rocicorp.dev/p/zero/issue/246605)

**RxDB**
- RxDB core is Apache-2.0 (pushed 2026-11-05). [F] [GitHub pubkey/rxdb](https://github.com/pubkey/rxdb)
- The SQLite storage for React Native is in the paid `rxdb-premium` package. The trial is "for evaluation and prototypes only". [V] [RxDB SQLite storage](https://rxdb.info/rx-storage-sqlite.html), [RxDB premium](https://rxdb.info/premium/)

**WatermelonDB**
- MIT, pushed 2026-09-16. [F] [GitHub Nozbe/WatermelonDB](https://github.com/Nozbe/WatermelonDB)
- "Watermelon is only a local database — you need to bring your own backend". Its sync engine needs "two API endpoints on your backend that conform to Watermelon sync protocol". [V] [WatermelonDB Sync intro](https://watermelondb.dev/docs/Sync/Intro)

**CouchDB / PouchDB**
- Both are Apache-2.0 and active (pushed 2026-11-04/05). [F] [apache/couchdb](https://github.com/apache/couchdb), [apache/pouchdb](https://github.com/apache/pouchdb)

**Couchbase**
- The legacy `cbl-reactnative` module is deprecated. Its replacement, `@couchbase/couchbase-lite-react-native`, is a "Native Module for Couchbase Lite Enterprise". [F] [cbl-reactnative README](https://github.com/Couchbase-Ecosystem/cbl-reactnative)
- Couchbase Community Edition licence terms:
  - It is free but revocable and comes with no support.
  - It bars redistributing the community software on its own and caps Server CE clusters at five nodes.
  - An older version says unauthorised use owes a fee equal to the commercial price.

  [P: licence text summarised] [Couchbase Community licence](https://www.couchbase.com/it/community-license-agreement/), [NuGet copy 3.1.7](https://feed.nuget.org/packages/Couchbase.Lite/3.1.7/License)

**Realm / Atlas Device Sync**
- Atlas Device SDKs and Device Sync were deprecated in September 2024 and reached "end-of-life and be removed on September 30, 2025". The on-device database "will continue to exist as an open source project". [F] [MongoDB deprecation notice](https://www.mongodb.com/docs/atlas/device-sdks/deprecation/)
- `realm-js` is still Apache-2.0 and active (pushed 2026-11-02). [F] [GitHub](https://github.com/realm/realm-js)

**Ditto**
- The React Native SDK is `@dittolive/ditto`. It works with Expo Dev Builds 50+ but not Expo Go. Transports are Bluetooth LE, LAN with mDNS, AWDL (Apple) and Wi-Fi Aware (Android). A "Local Only" (`smallPeersOnly`) mode works offline. Server mode syncs "with Ditto's cloud infrastructure". [V] [Ditto React Native install guide](https://docs.ditto.live/sdk/latest/install-guides/react-native)
- Pricing is mostly contact-sales:
  - The Cloud Sync Pro base price is listed at $999.
  - AWS Marketplace lists Cloud Sync Pro at $11,988 including 1,000 connections.
  - A "self-managed" deployment is tied to the P2P tier.

  [V] [Ditto cloud-sync pricing](https://ditto.com/pricing/cloud-sync), [AWS Marketplace listing](https://aws.amazon.com/marketplace/pp/prodview-axv2ggb5yy5za)
- Ditto raised $82M in March 2025. [P] [SiliconANGLE 2025-03-12](https://siliconangle.com/2025/03/12/ditto-raises-82m-funding-edge-database/)

**Turso / libSQL**
- `turso` and `libsql` are both MIT and active. [F] [tursodatabase/turso](https://github.com/tursodatabase/turso), [tursodatabase/libsql](https://github.com/tursodatabase/libsql)
- Turso Offline Sync is "beta quality, and not yet recommended for production use … no durability guarantees, which means data loss is possible". Conflict resolution is not implemented yet. [V] [Turso offline sync public beta](https://turso.tech/blog/turso-offline-sync-public-beta)
- The React Native bindings are `@tursodatabase/sync-react-native`, which sync with Turso Cloud. [V] [Turso React Native bindings](https://turso.tech/blog/react-native-bindings-for-turso)

**CRDT libraries**
- cr-sqlite is MIT and was last pushed 2026-08-10. Its issue tracker shows 2023–2024 issues without visible maintainer replies. [F] repo metadata; [P] issue snapshot. [GitHub vlcn-io/cr-sqlite](https://github.com/vlcn-io/cr-sqlite)
- Automerge is MIT and active. Its JavaScript package is built on `automerge-wasm`. [F] [Automerge README](https://github.com/automerge/automerge)
- Yjs is MIT and active. [F] [Yjs LICENSE](https://github.com/yjs/yjs)
- The Zero docs note that offline writes are hard and that "no sync engine or CRDT algorithm can automatically solve it". The options they list include an append-only data model or restricting offline writes to a single device. [V] [Zero connection docs](https://zero.rocicorp.dev/docs/connection)

### Inferences
- [E] Conflicts are structurally rare in this domain:
  - Each utterance, photo or marker is created once by one device and never mutated. The ID is generated on the device (UUIDv7) and paired with a per-device monotonic `seq`.
  - Corrections (transcript edits, tags, reviewer annotations) are new events that reference the original (`supersedes`/`annotates`).
  - A server-authoritative, idempotent "insert if absent" by ID is therefore enough. Last-writer-wins applies only to the few mutable shared objects (project lists, tag vocabularies, device config).
- Rec. [E] Default choice is a custom outbox sync:
  - `expo-sqlite` (or op-sqlite) holds an `events` table plus an `outbox` index.
  - `POST /sync/push` takes `{device_id, from_seq, events[]}` and returns `acked_seq` plus the server hash of each event.
  - `GET /sync/pull?cursor=` returns server-side changes such as config, reviewer edits and project metadata.
  - This is roughly the WatermelonDB protocol shape but simpler. It adds no third-party service to the on-prem appliance.
- Rec. [E] Fall back to PowerSync (Apache-2.0 as of 2026-11-03) only if bidirectional partial replication of large shared datasets becomes necessary, for example site asset registries or other users' logs on the device. Cost: it adds the PowerSync service plus its bucket-storage database to the appliance, and writes still go through your own API.
- [H] Ditto is the only engine with a mature device-to-device mesh (BLE/LAN). That could matter later for crews in a basement or tunnel with no network, where peer-to-peer redundancy keeps a log alive even if one phone dies. Its proprietary licence and opaque pricing make it a poor default.
- Avoid for v1 [E]:
  - Zero: rejects offline writes.
  - Electric alone: read-path only.
  - Turso sync: beta, possible data loss, built around Turso Cloud.
  - Realm sync: removed.
  - Couchbase React Native: needs the Enterprise licence.
  - cr-sqlite: uncertain maintenance.
  - Automerge/Yjs: overkill for an append-only log. [H] A WebAssembly-based library may also struggle on Hermes.

### Gaps
- RxDB Premium price: not on the pages fetched.
- Whether PowerSync's website and legal pages will be updated to Apache-2.0, and which bucket-storage databases self-hosting requires (I believe MongoDB or Postgres, but did not verify).
- Whether Turso's sync server can be fully self-hosted without Turso Cloud.
- PouchDB React Native SQLite adapter maintenance.
- Automerge/Yjs on Hermes.
- A Ditto self-managed quote. All of these were unverified because the search budget ran out.

## 2. Large media upload over flaky networks (tus, self-hosted S3, background upload)

### Takeaway
Record audio as short, immutable, hashed segments. Upload them with tus (tusd server, MIT) or an equivalent chunked PUT, using the checksum extension. On Android, run routine uploads in WorkManager with network constraints and use a user-initiated data transfer (UIDT) job for "sync now / end of shift". Avoid dataSync foreground services because of the Android 15 limit of 6 hours per 24. For storage, do not build a new product on MinIO Community Edition: the GitHub repo is archived and source-only. For a single-box appliance, SeaweedFS (Apache-2.0) is the safest S3 layer. Garage (AGPL) lacks Object Lock, and Ceph is too heavy for one server.

### Cited Findings
**tus protocol and implementations**
- tus 1.0.0 core:
  - `HEAD` returns `Upload-Offset`.
  - `PATCH` sends bytes at that offset with `application/offset+octet-stream`. An offset mismatch returns 409.
  - Extensions are creation, creation-with-upload, creation-defer-length, expiration, checksum, termination and concatenation (parallel partial uploads).
  - The checksum extension uses `Upload-Checksum` and returns `460 Checksum Mismatch`. Servers "MUST support at least the SHA1 checksum algorithm".

  [F] [tus protocol](https://tus.io/protocols/resumable-upload)
- tusd is the official reference implementation (MIT). It stores uploads on local disk, GCS, or AWS S3 and any S3-compatible system. The latest release is v2.10.1 (2026-09-16). [F] [GitHub tus/tusd](https://github.com/tus/tusd)
- tusd supports file, gRPC and HTTP hooks. [P] [pkg.go.dev tusd](https://pkg.go.dev/github.com/tuokkom/tusd)
- The tus team works with the IETF HTTP working group on a resumable-uploads RFC. [V] [tus.io blog](https://tus.io/blog)
- tus-js-client (MIT; latest release v4.3.1, 2025-01-16) supports React Native. Files are passed as `{ uri: 'file:///…' }` objects, and the repo has a `/demos/reactnative` example. [F] [GitHub tus/tus-js-client](https://github.com/tus/tus-js-client)
- A native wrapper, react-native-tus-client, sits over TUSKit and tus-android-client. [P] [GitHub](https://github.com/vinzscam/react-native-tus-client)
- `react-native-background-upload` (Vydia) was last pushed 2024-04-01, so it is stale. [F] [GitHub](https://github.com/Vydia/react-native-background-upload)

**MinIO**
- The `minio/minio` GitHub repo is archived (last push 2026-04-24). Its README says "THIS REPOSITORY IS NO LONGER MAINTAINED" and points to "AIStor Free" (standalone, free licence) and paid "AIStor Enterprise". It also says "The MinIO community edition is now distributed as source code only", and the licence is AGPLv3. README commits record a "maintenance mode" note (2025-12-03) and a "latest free license and enterprise option" update (2026-01-06). [F] [GitHub minio/minio](https://github.com/minio/minio)
- MinIO removed the web management console from Community Edition around May–June 2025. [P] [Blocks & Files 2025-06-19](https://blocksandfiles.com/2025/06/19/minio-removes-management-features-from-basic-community-edition-object-storage-code/)

**Other self-hosted object stores**
- Garage is AGPLv3. [P] [Garage repo mirror](https://github.com/deuxfleurs-org/garage)
- Garage's S3 compatibility table shows multipart upload and presigned URLs implemented, and lifecycle only partly (AbortIncompleteMultipartUpload and Expiration). Versioning and Object Lock (PutObjectRetention/LegalHold) are missing. The page contradicts itself on SSE-C. [V] [Garage S3 compatibility](https://garagehq.deuxfleurs.fr/documentation/reference-manual/s3-compatibility/)
- SeaweedFS is Apache-2.0 and very active (pushed 2026-11-05). [F] [GitHub seaweedfs/seaweedfs](https://github.com/seaweedfs/seaweedfs)
- RustFS is Apache-2.0 and active. [F] [GitHub rustfs/rustfs](https://github.com/rustfs/rustfs) One comparison calls it suitable "for monitored pilot environments only". [P] [glukhov.org 2026](https://glukhov.org/data-infrastructure/object-storage/self-hosted-s3-alternatives/)
- Ceph is "LGPL-2.1 or LGPL-3". [F] [Ceph COPYING](https://github.com/ceph/ceph) For a single server with several TB, installing Ceph just for an S3 endpoint is "difficult to justify". [P] [glukhov.org](https://glukhov.org/data-infrastructure/object-storage/self-hosted-s3-alternatives/)

**Background upload on Android and iOS**
- Android 15 foreground-service timeout:
  - Apps targeting Android 15 get dataSync and mediaProcessing foreground services for "a total of 6 hours in a 24-hour period".
  - At the limit, `onTimeout()` gives a few seconds to stop.
  - Starting another one then throws `ForegroundServiceStartNotAllowedException` until the user brings the app to the foreground.
  - Google recommends WorkManager or other APIs instead.

  [F] [Android FGS timeout](https://developer.android.com/develop/background-work/services/fgs/timeout)
- Apps targeting Android 15 cannot launch a dataSync foreground service from `BOOT_COMPLETED`. [F] [Android FGS types](https://developer.android.com/develop/background-work/services/fgs/service-types)
- Android 14 added user-initiated data transfer jobs:
  - Use `JobInfo.Builder.setUserInitiated(true)` with the `RUN_USER_INITIATED_JOBS` permission.
  - The job must be scheduled while the app is visible.
  - It must call `setNotification()`, appears in Task Manager, and can be stopped by the user or the system.
  - On older versions, use WorkManager's foreground fallback.

  [F] [Android UIDT](https://developer.android.com/develop/background-work/background-tasks/uidt)
- Android 16, all apps: "jobs that are executing concurrently with a foreground service will adhere to the job runtime quota". Jobs started while the app is visible also count against quota after it leaves the foreground. This covers WorkManager, and Google recommends UIDT jobs for user-initiated transfers. [F] [Android 16 behaviour changes](https://developer.android.com/about/versions/16/behavior-changes-all)
- iOS: an Apple engineer says background `URLSession` sessions only support uploads from a file. Background scheduling under power policy "is largely considered an implementation detail" and can stall very large uploads. [V] [Apple Developer Forums thread 849761](https://developer.apple.com/forums/thread/849761) WWDC 2019 notes say discretionary transfers can be deferred "hours". [P] [WWDC Notes 2019/707](https://www.wwdcnotes.com/notes/wwdc19/707)

### Inferences
- Rec. [E] Audio capture should write fixed-length segments (for example 10–60 s, or one per utterance). Each segment is a separate file whose SHA-256 is computed on the device when it closes. This turns large-file upload into many small uploads that finish in short connectivity windows, limits crash loss to one segment, and gives natural integrity units (see §5).
- Rec. [E] Upload transport:
  - Use tus-js-client for prototypes.
  - For production, put the upload in the Kotlin native layer: OkHttp with tus semantics, or a plain `PUT` with offset/range plus a `Digest` header. Background execution then does not depend on the JS runtime.
  - Send SHA-256 through tus `Upload-Checksum` if the server enables it (sha1 is the mandatory minimum).
  - Never delete a local segment until the server acknowledges the same hash.
- Rec. [E] Scheduling on Android:
  - While the microphone foreground service is running (the session), the same process can push small segments opportunistically on its own thread. [H] Android 16 job quotas apply to jobs, not to threads in a running foreground service; verify against Play policy for a microphone-type service.
  - After the session, use WorkManager with `NetworkType.UNMETERED` or CONNECTED for routine sync, and a UIDT job for an explicit "Sync now" or end-of-shift bulk upload.
  - Avoid a dataSync foreground service as the main path because of the 6 h/24 h cap.
- Rec. [E] Appliance storage:
  - Prototype: tusd's filestore on the GPU box's local disk (ZFS or ext4 plus backups) is simplest.
  - Use an S3 layer when separating compute from storage. SeaweedFS (Apache-2.0) is the default. Garage's AGPL and missing Object Lock weigh against it for evidence-grade retention. Use Ceph RGW only at large customers that already run Ceph.
  - [H] Get counsel on bundling AGPL components into a commercial appliance.
- [E] iOS later: background `URLSession` needs file-based uploads, which segment files already are. Expect discretionary delays, and present them in the UI as "waiting for iOS" rather than as an error.

### Gaps
- Whether tusd implements the IETF resumable-upload draft headers. (Not verified: the tus 1.0.0 page does not mention it.)
- SeaweedFS and RustFS Object Lock (WORM) support: not verified.
- A maintained React Native background-upload library: none verified.
- iOS `BGContinuedProcessingTask` (newer iOS) was not researched.

## 3. Time synchronisation accuracy (phone clocks, GNSS, own offset estimation, robot/vehicle alignment, Bluetooth latency)

### Takeaway
Stock Android wall-clock time is only loosely disciplined. It makes one SNTP query roughly every 18–24 h, with a theoretical error of up to ~2.5 s, and real devices are off by roughly 10 ms to several seconds. An app can do much better on its own:
- Timestamp everything with the monotonic boot clock.
- Log periodic NTP-style exchanges with the on-prem server. App-level NTP reaches about 1 ms on good Wi-Fi.
- Disciplined to robot time with chrony/PTP, this gives a sub-10 ms budget.

The ~50 ms or better alignment that speech-to-robot-frame alignment probably needs is achievable. The weak link is the unmeasured, route-dependent Bluetooth microphone latency (tens to ~100+ ms), which must be calibrated or recorded as uncertainty.

### Cited Findings
**How Android sets the clock**
- Android network time detection:
  - It uses SNTP over UDP against `time.android.com` (Google Public NTP, "no SLA").
  - The poll interval is 64,800,000 ms (18 h), "approximately once a day", with 3 retries at 1 min and a 5,000 ms timeout.
  - The maximum theoretical error is "approximately 2.5 seconds" if all latency is on one leg. Mobile networks add long asymmetric delays.
  - Android 14+ supports multiple NTP servers.

  [F] [AOSP network time detection](https://source.android.com/docs/core/connect/time/network-time-detection)
- GNSS time detection (Android 12+) is optional and not enabled by default in AOSP (`config_enableGnssTimeUpdateService`). It only suggests a time when another app is already requesting location. [F] [AOSP GNSS time detection](https://source.android.com/docs/core/connect/time/gnss-time-detection)
- `SystemClock.currentNetworkTimeClock()` (API 33):
  - It returns time from the last successful network sync, does no blocking I/O, and throws if no valid time exists.
  - It "may use an insecure protocol", carries no accuracy guarantee, and consecutive reads can go backwards.

  [F, read via the .NET binding mirror of the Android reference] [SystemClock.currentNetworkTimeClock](https://learn.microsoft.com/en-us/dotnet/api/android.os.systemclock.currentnetworktimeclock?view=net-android-35.0)

**Reading GNSS and audio timestamps**
- `GnssClock`:
  - GPS time = `TimeNanos − (FullBiasNanos + BiasNanos)`, with `BiasUncertaintyNanos` and `TimeUncertaintyNanos`.
  - `HardwareClockDiscontinuityCount` flags clock resets.
  - UTC needs `LeapSecond`, available only when `hasLeapSecond()` is true.

  [F] [Android GnssClock reference](https://developer.android.com/reference/android/location/GnssClock)
- `AudioRecord.getTimestamp()` returns `framePosition` (all 64 bits valid) and the estimated capture `nanoTime` in `TIMEBASE_MONOTONIC` or `TIMEBASE_BOOTTIME` (the latter equals `elapsedRealtimeNanos`, which includes suspend). It "cannot account for any delay unknown to the implementation". [F] [Android AudioTimestamp](https://developer.android.com/reference/android/media/AudioTimestamp)

**Measured phone clock accuracy**
- GoodClock (Sandha et al., IoTDI 2020) is an app-level NTP library with drift correction. On UCLA campus Wi-Fi, offset variability was within 1 ms in 95% of cases, using 10 NTP requests per offset estimate. [P] [GitHub nesl/GoodClock](https://github.com/nesl/GoodClock), [search summary of README figure](https://github.com/nesl/GoodClock)
- Zhang et al., arXiv 2501.04886 (v5, 2026-01-02): a UDP-based protocol synchronised smartphone clocks to 60 µs. [P] [arXiv abstract](https://arxiv.org/abs/2501.04886) A search summary of the full paper adds two more figures that I did not verify in the abstract:
  - NTP error was a few ms near the access point and ~100 ms farther away.
  - Inter-phone drift stayed under 10 ms over 10 h.

  [P] [arXiv PDF](https://arxiv.org/pdf/2501.04886)
- Smartphone drift can exceed 150 ms/day, and individual NTP requests can err by up to 1,800 ms. [P] [Kyushu Univ. publication record](https://kyushu-u.elsevierpure.com/en/publications/rapid-clock-synchronisation-for-ubiquitous-sensing-services-invol/)
- Sync via phone peripherals: about 200 µs via audio, 1 ms via Wi-Fi and 3 ms via BLE. Gyroscope "twist" sync claims microsecond accuracy. [P] [Twist-n-Sync, Sensors 2021](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7795013/)
- Hobbyists report phones off by 10 ms to several seconds, and one regularly off by 300–700 ms. [A] [time-nuts 2017 thread](https://www.febo.com/pipermail/time-nuts/2017-March/104282.html)

**Robot side**
- PTP with software timestamping reaches "a few tens of microseconds" on a LAN; with hardware timestamping, "a few tenths of a microsecond". [V] [Oracle Linux chrony/PTP docs](https://docs.oracle.com/en/operating-systems/oracle-linux/10/chrony/chrony-AboutPTP.html)
- chrony with NIC hardware timestamping may reach sub-microsecond accuracy. Red Hat suggests PTP where switches are PTP-capable and NTP otherwise. [V] [Red Hat RHEL 10 docs](https://docs.redhat.com/ko/documentation/Red_Hat_Enterprise_Linux/10/html/configuring_time_synchronization/chrony-with-hw-timestamping)
- ROS 2 `message_filters` TimeSynchronizer needs exactly matching header stamps. [F] [ROS 2 tutorial](https://docs.ros.org/en/ros2_packages/rolling/api/message_filters/Tutorials/Writing-A-Time-Synchronizer-Python.html) `sensor_msgs/TimeReference` exists for external time sources "not actively synchronized with the system clock". [F] [ROS 2 Jazzy TimeReference](https://docs.ros.org/en/jazzy/p/sensor_msgs/msg/TimeReference.html)
- MCAP timestamps are "uint64 nanoseconds since a user-understood epoch (i.e unix epoch, robot boot time, etc.)", with `log_time` and `publish_time` fields. [F] [MCAP spec](https://mcap.dev/spec)
- LeRobot recording examples use cameras at `fps: 30`, and datasets carry a per-frame `timestamp`. [V] [LeRobot dataset v3 docs](https://huggingface.co/docs/lerobot/lerobot-dataset-v3)

**Bluetooth microphone latency**
- HFP latency is about 40 ms, with sampling limited to 8 kHz (narrowband) or 16 kHz (wideband). [P: patent text] [USPTO 10705793](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/10705793)
- Optimised LE Audio LC3 links reach 20–30 ms, against "typically 100ms" for Bluetooth Classic. [P] [audioXpress](https://audioxpress.com/article/wireless-audio-ultra-low-latency-audio-transmission-over-bluetooth-le-audio)
- A vendor table lists LE Audio LC3 at about 50 ms. [V] [Avantree](https://support.avantree.com/hc/en-us/articles/31257100736793)
- No measured SCO microphone-path figure was found.

### Inferences
- [E] Required accuracy:
  - Language-to-robot alignment for subtask labels and commands works at the scale of video frames (33 ms at 30 fps) and seconds-long actions. Within ±50 ms is good. ±100–200 ms is tolerable for coarse "what was said during this episode" labels.
  - Word-level alignment against audio-capable sensors (for example a robot's own microphone) or impact events needs ≤10 ms.
  - Sub-millisecond accuracy is unnecessary unless the speech audio itself is fused with other acoustic sensors.
  - CAN logs are usually at ms resolution, so the same ±10–50 ms targets apply.
- Rec. [E] Clock architecture:
  1. Stamp every capture event with `elapsedRealtimeNanos` (BOOTTIME) plus a `boot_id`, never wall-clock time.
  2. Take the audio frame-to-time mapping from `AudioRecord.getTimestamp(TIMEBASE_BOOTTIME)` at segment start and periodically.
  3. Log `clock_sync` events: NTP-style 4-timestamp exchanges with the on-prem server (8–16 samples, keep the lowest-RTT ones). Do this on connect, every few minutes during a session, and at stop. Optionally add a `currentNetworkTimeClock()` reading and, outdoors, `GnssClock`-derived GPS time.
  4. Discipline the server's clock to the robot or vehicle fleet with chrony/PTP. Fleet logs then share a time base with the phone logs.
  5. On the server, fit offset plus drift piecewise per boot session, and store the fit, residuals and per-event `utc_uncertainty_ms`. Raw samples are kept so alignment can be recomputed.
- Rec. [E] Physical sync markers as ground truth:
  - The app can play a short chirp or beep, or flash a screen pattern or QR code showing the current corrected time, so that the robot's camera or microphone (or a vehicle dashcam) captures it.
  - The user can also say a "mark" keyword while touching a robot e-stop or other logged button.
  - These give an end-to-end offset that includes Bluetooth and audio-pipeline latency. They play the role of the clapperboard in film production.
- Rec. [E] Bluetooth route: record the actual input route (built-in, SCO/HFP, LE Audio, USB) with every segment. Run a one-time loopback calibration per headset model: play a chirp on the phone speaker, capture it through the headset microphone, and compare with the built-in microphone. Apply the measured offset and store its uncertainty. Expect 20–150 ms of unknown offset on Bluetooth routes if this is skipped.
- [E] Achievable budgets: about 1–5 ms on site Wi-Fi to an on-prem server; tens of ms over LTE/5G VPN; plus 20–150 ms of uncalibrated Bluetooth latency. ±50 ms end-to-end is realistic on Wi-Fi with calibration.

### Gaps
- Whether the Galaxy S25 exposes GNSS raw measurements (`GnssClock` full bias) to apps, and whether Samsung enables GNSS time detection: not verified.
- Measured SCO and LE Audio microphone latency for Galaxy Buds on S25: not found.
- How much `AudioRecord` timestamp error remains on Bluetooth routes: not found.
- No published study of Android timestamp accuracy specifically against ROS 2 time was found.

## 4. Data model and export formats

### Takeaway
Keep the canonical store as an append-only, versioned event log: JSON records in SQLite on the device and Postgres or JSONL on the server, with media as content-addressed files. Generate robot and analytics formats on the server as derived exports:
- MCAP, with a JSON Schema or protobuf channel per event type, `foxglove.Log` for quick viewing, and audio and photos as attachments or references.
- rosbag2 through its MCAP storage plugin.
- LeRobot v3 language columns or tasks.
- Parquet for analytics.
- WebVTT/SRT for playback.
- XMP sidecars for photos.

OpenTelemetry's stable Logs Data Model is a useful naming precedent (Timestamp vs ObservedTimestamp, Body, Attributes). No dominant open standard for "annotated field logs" was found.

### Cited Findings
**MCAP**
- MCAP is "a modular container file format for recording timestamped pub/sub messages with arbitrary serialization formats". Its records:
  - Schema, Channel and Message records.
  - Attachment records with `log_time`, `create_time`, `name`, `media_type`, `data` and a CRC32. Attachments must not appear inside chunks.
  - Metadata records holding name plus `map<string,string>`.
  - Chunks compressed with `zstd`/`lz4`, plus chunk and message indexes. Opcodes 0x80–0xFF are reserved for private records.

  [F] [MCAP spec](https://mcap.dev/spec)
- MCAP well-known encodings:
  - Message encodings: ros1, cdr (ROS 2), protobuf, flatbuffer, capnproto, cbor, msgpack, json.
  - Schema encodings: protobuf, flatbuffer, capnproto, ros1msg, ros2msg, ros2idl, omgidl, jsonschema.
  - The schema may be empty only for self-describing encodings such as json.

  [F] [MCAP registry](https://mcap.dev/spec/registry)
- Foxglove's `foxglove.Log` schema has timestamp, level (UNKNOWN…FATAL, 0–5), message, name, file and line. The newer SDK page lists only timestamp, level and message. Exact schema names are required for Foxglove to recognise it. [V] [Foxglove Log schema](https://docs.foxglove.dev/docs/visualization/message-schemas/log/)

**rosbag2**
- rosbag2 has `mcap` and `sqlite3` storage plugins. MCAP's own compression "produces files that are still indexable", and `ros2 bag convert` converts between storage IDs. [F] [rosbag2 README](https://github.com/ros2/rosbag2)

**LeRobot**
- LeRobot v3 layout:
  - `meta/info.json` holds the schema, fps and path templates; `meta/stats.json` holds feature statistics.
  - `meta/tasks.jsonl` maps "natural-language task descriptions … to integer IDs".
  - `meta/episodes/` holds chunked Parquet with offsets.
  - `data/` holds Parquet shards with many episodes per file, and `videos/` holds MP4 per camera.
  - Loaders support `delta_timestamps` windows.

  [V] [LeRobot dataset v3](https://huggingface.co/docs/lerobot/lerobot-dataset-v3)
- The migration guide names `tasks.parquet` instead. The docs conflict on this filename. [V] [LeRobot porting v3](https://huggingface.co/docs/lerobot/porting_datasets_v3)
- A newer annotation pipeline writes `language_persistent` and `language_events` columns into the data Parquet. The docs label this format LeRobot v3.1, with styles such as subtask, plan and memory. [V] [LeRobot annotation pipeline](https://huggingface.co/docs/lerobot/annotation_pipeline)

**General log and photo standards**
- The OpenTelemetry Logs Data Model is "Status: Stable":
  - `Timestamp` is when the event occurred; `ObservedTimestamp` is when the collector observed it.
  - `Body` and `Attributes` carry the content.
  - TraceId and SpanId are optional and follow W3C Trace Context.

  [F] [OTel logs data model](https://opentelemetry.io/docs/specs/otel/logs/data-model/)
- EXIF has `OffsetTime` (0x9010), `OffsetTimeOriginal` (0x9011) and `SubSecTimeOriginal`. The offset tags were introduced in EXIF 2.31 (sources disagree on 2013 vs 2016). EXIF 3.0 came in May 2023. A GMT offset cannot be mapped back to a named time zone reliably. [P] [ExifTool forum on the 2.31 tag](https://exiftool.org/forum/index.php?msg=74958), [exifread tag table](https://sources.debian.org/src/python-exif/3.0.0-1/exifread/tags/exif.py), [EXIF overview](https://wikiwand.com/en/EXIF)

### Inferences
Rec. [E] Canonical event record (one table, `type` discriminator, JSON payload). Utterances, photos, markers, notes, GPS fixes, clock-sync samples, consent events and system events share these fields:

- **Identity**
  - `id` (UUIDv7), `schema_version`, `type`
  - `device_id`, `install_id`, `user_id` (pseudonymous), `org/site/project/asset_ids`
  - `session_id`, `seq` (per-device monotonic)
- **Time**
  - `t_start_boot_ns`, `t_end_boot_ns`, `boot_id`
  - `t_start_utc_est`, `t_end_utc_est`, `utc_uncertainty_ms`
  - `clock_fit_id` (link to the sync model), `observed_server_time` (set at ingest; the OTel `ObservedTimestamp` analogue)
- **Utterance payload**
  - `text`, `lang`, `is_final`, `revision`, `asr_engine`, `asr_model_version`, `confidence`
  - `words[{w, t0_ms, t1_ms, conf}]` relative to `t_start`
  - `speaker {label: "wearer"|"diar_N", identity_ref?}`; `identity_ref` is set only when there is consent (see §7)
  - `audio_ref {segment_id, sha256, codec, sample_rate, offset_samples, duration_ms}`
  - `input_route {type, device_name, latency_est_ms, latency_unc_ms}`
- **Context**
  - `location {lat, lon, alt, h_acc_m, v_acc_m, provider, fix_boot_ns}`
  - `photo_refs[{sha256, ...}]`, `tags[]`, `template_ref` (for example a TBM or risk-assessment form ID and field)
  - `robot_or_vehicle_refs[{system_id, topic?, episode_id?}]`
- **Lifecycle**
  - `supersedes` / `annotates`, for corrections as new events
  - `consent_ref`, `retention_class`
- **Integrity**
  - `prev_hash`, `record_hash`, `device_sig` (see §5)

Rec. [E] Exports, all generated on the server with an export manifest listing source event IDs and hashes:

- **MCAP**
  - `/voice/utterance` (JSON with `jsonschema`, or protobuf for size)
  - `/voice/words`
  - `/log` as `foxglove.Log`, so the Foxglove Log panel works with no custom code
  - `/gps`
  - `/clock_sync`
  - Audio segments as attachments, or Opus in a dedicated channel. Use `log_time` as corrected UTC ns, or the robot epoch if the customer wants it.
- **rosbag2**: write MCAP with ROS 2 `.msg` types, so `ros2 bag` tools work.
- **LeRobot**: map utterances onto the episode timeline as `language_events` (v3.1) or episode-level `tasks`. Keep the original IDs in an extra column.
- **Analytics and playback**: JSONL as the interchange and backup format; Parquet for analytics; WebVTT/SRT per audio segment.
- **Photos**: keep camera originals byte-identical (hashed). Write EXIF `OffsetTimeOriginal` and GPS on capture only if the app controls the encoder. Put the app's own metadata in an XMP sidecar or the JSON record, so the hashed original is not modified.
- [H] An existing open "field log" standard that fits well was not found. The OTel log model (for naming) and W3C Web Annotation (for "annotation targets a time range of a media file") are the closest precedents.

### Gaps
- The W3C Web Annotation Data Model, WebVTT status, the XMP spec and Foxglove's `LocationFix` schema were not re-verified this session; the search budget was exhausted.
- The LeRobot `tasks.jsonl` vs `tasks.parquet` conflict is unresolved.
- No open standard for TBM or risk-assessment forms was found (not searched in depth).

## 5. Integrity and evidence (tamper-evident logs, C2PA, chain of custody, Korean admissibility)

### Takeaway
Make integrity a property of capture:
- Hash every media segment and event on the device.
- Chain events per device (`prev_hash`).
- Sign checkpoints with a hardware-backed key whose Android Key Attestation is verified at enrolment.
- On the server, append everything to a Merkle transparency log (Trillian Tessera, Apache-2.0) and audit every access.

This matches what bodycam evidence systems do (SHA-2 at ingest plus an audit trail). It also matches what Korean courts examine: identity and integrity between original and copy, with hash comparison as the leading method. C2PA (spec 2.2) can add portable credentials to photos and to audio formats such as WAV, MP3 and M4A. App-generated certificates would not be on public trust lists, however.

### Cited Findings
**Tamper-evident logs**
- A plain hash chain is verified by recomputing from the start. A Merkle-tree log allows "efficient (lg N-length)" inclusion proofs plus consistency proofs. [P] [Russ Cox, Transparent Logs](https://research.swtch.com/tlog)
- Trillian Tessera is Apache-2.0 and active. It is a Go library for tile-based transparency logs on cloud or on-prem, with checkpoints and witness co-signing. [F] repo; [P] talk. [GitHub transparency-dev/tessera](https://github.com/transparency-dev/tessera), [Tessera talk](https://passthesalt.ubicast.tv/permalink/v126afbe75298vuwmjgl/)

**C2PA**
- C2PA spec 2.2 (May 2025):
  - Embeddable containers include JPEG, PNG, BMFF (MP4/M4A), RIFF (WAV) and ID3 (MP3).
  - Claim generators "are encouraged to obtain and include time-stamps" from RFC 3161 TSAs. Without one, a manifest becomes invalid when the signing credential expires or is revoked.
  - 2.2 adds timestamps and revocation information via update manifests.

  [F] [C2PA 2.2 specification](https://spec.c2pa.org/specifications/specifications/2.2/specs/C2PA_Specification.html)
- Library code cites C2PA 2.4 sections, so newer versions exist. [P] [encypher-c2pa source](https://docs.rs/crate/encypher-c2pa/1.8.0/source/src/c2pa-formats/lib.rs)
- `c2pa-android` (Apache-2.0, pushed 2026-11-05) is a Kotlin/JNI wrapper over c2pa-rs (MIT/Apache-2.0). It offers `StrongBoxSigner` and `KeyStoreSigner` plus remote and HSM signers, needs min SDK 28, and has a CameraX example app. [F] licence; [V] features. [c2pa-android docs](https://opensource.contentauthenticity.org/docs/c2pa-android), [GitHub contentauth/c2pa-android](https://github.com/contentauth/c2pa-android), [c2pa-rs](https://github.com/contentauth/c2pa-rs)
- Pixel 10 Camera:
  - It reached C2PA Assurance Level 2.
  - Signing keys are generated in StrongBox on the Titan M2 chip.
  - Google's C2PA CAs verify the app through Android Key Attestation (package name plus signing certificate) without learning the user's identity.
  - An on-device offline TSA signs timestamps at shutter time.

  [V] [Google Security Blog, Sept 2025](https://security.googleblog.com/2025/09/pixel-android-trusted-images-c2pa-content-credentials.html), [The Hacker News](https://thehackernews.com/2025/09/google-pixel-10-adds-c2pa-support-to.html)
- Galaxy S25 adds C2PA only to images edited with Galaxy AI tools; unedited photos carry none. [P] [PetaPixel 2025-02-13](https://petapixel.com/2025/02/13/samsungs-image-authenticity-approach-is-backward-and-its-ais-fault), [Android Authority](https://www.androidauthority.com/galaxy-s25-content-credentials-3523256)

**Hardware-backed device keys**
- Knox Vault (Galaxy S21 and later) backs the StrongBox Keymaster. Each device's Samsung Attestation Key is stored in Knox Vault and signed by Samsung's root. [V] [Samsung Knox Vault whitepaper](https://docs.samsungknox.com/admin/fundamentals/whitepaper/samsung-knox-mobile-security/system-security/knox-vault/)
- Android Key Attestation reports whether a key is hardware-backed, with security level Software, TrustedEnvironment or StrongBox. [F] [AOSP key attestation](https://source.android.com/docs/security/keystore/attestation)
- Android 17 caps Keystore keys at 50,000 per app for non-system apps targeting API 37. [F] [Android 17 behaviour changes](https://developer.android.com/about/versions/17/behavior-changes-all)

**Bodycam chain of custody**
- Axon Evidence computes and stores a SHA-2 hash when a bodycam recording arrives, and shows it in the audit trail; copies are verified by matching hashes (2020 data-integrity paper). [V via a public agency packet] [Fort Pierce PCAC packet 2020](https://public.destinyhosted.com/fortpdocs/2020/CCCONFER/20200713_1686/11411_PCAC_Body_Camera_Ordinance_Recommendation.pdf), [South Bend record](https://docs.southbendin.gov/WebLink/0/doc/171584/Page15.aspx)
- Axon describes a permanent activity log (uploads, views, edits, shares) that survives file deletion and calls it "tamper-proof", which is a marketing term. [V] [Axon resource page](https://www.axon.com/resources/how-axon-evidence-and-body-worn-camera-systems-work)

**Korean admissibility of digital recordings**
- Supreme Court 2013. 7. 26. 2013도2511:
  - Printouts from storage media need identity with the original and integrity from seizure to output.
  - Original-to-copy identity is a question of whether the data is the same, and equal hash values (in testimony or expert opinion) are a "유력한 방법" (a strong method) to establish it.
  - Content offered for its truth falls under the hearsay rule (형사소송법 §313①).

  [P] [nepla wiki on electronic records](https://www.nepla.ai/wiki/형사/형사소송/전자기록의-증거능력-1zp8jvww8j43), [LawTalk column](https://www.lawtalk.co.kr/posts/179012)
- 형사소송법 §313② was later amended to allow authenticity to be proven by objective means such as digital forensics. [P] [same nepla page](https://www.nepla.ai/wiki/형사/형사소송/전자기록의-증거능력-1zp8jvww8j43)
- Supreme Court 2012도7461:
  - Recording files are easily edited, so a copy must be shown to be copied without artificial alteration.
  - Direct comparison such as hash values is the principle.
  - If the original cannot be produced, courts may weigh testimony from those who made, transferred or kept the recording, forensic results and case history.

  [P] [LawTalk on 2012도7461](https://www.lawtalk.co.kr/posts/105292), [Shin & Kim newsletter](https://www.shinkim.com/kor/media/newsletter/2773)
- Supreme Court 2025. 2. 27. 2022도1864 reversed a lower court that had excluded recordings only because the original was missing. Commentators criticise it because the hashes did not match in that case. [P] [LawTalk on 2022도1864](https://www.lawtalk.co.kr/posts/109404), [lawwin commentary](https://www.lawwin.co.kr/seoul/knowledgedetail?index=7624), [JCCT 2022 paper](https://koreascience.kr/article/JAKO202234257614862.pdf)

### Inferences
Rec. [E] Integrity design:

1. **On the device**
   - Each closed audio segment and photo is hashed with SHA-256.
   - Each event record carries `prev_hash` and `record_hash` over a canonical encoding (JCS JSON or CBOR).
   - Every N events or minutes, the device signs a checkpoint `{device_id, seq, head_hash, boot_ns, utc_est}` with an EC P-256 key in StrongBox (Knox Vault on Samsung).
   - The attestation certificate chain is uploaded and verified at device enrolment.
   - Use one key per device, not per record, given Keystore limits.
2. **On the server**
   - Verify chains and signatures at ingest, record `received_at`, and append event hashes plus checkpoint hashes to a Tessera log.
   - Publish a signed log checkpoint (and optionally get an RFC 3161 timestamp from an on-prem TSA). This gives an independent "existed no later than" time, which matters because an offline phone cannot obtain trusted timestamps until it syncs.
3. **Originals**
   - Never transcode or overwrite them. Derived files (normalised audio, redacted versions, exports) reference the original hash.
   - Deletion is a signed tombstone event (retention-driven, or a data-subject request), so the log stays consistent.
4. **Chain-of-custody view**
   - Per item: created by which device and user, the hash, when it was uploaded, who viewed, exported or shared it, and export packages with a manifest of hashes. This mirrors bodycam evidence portals.
5. **Optional C2PA**
   - Sign photos (and optionally M4A/WAV segments) with `c2pa-android` `KeyStoreSigner` and a customer-appliance CA.
   - Viewers will show "unknown signer" unless the customer trusts that CA. C2PA here is a portability bonus, not the core integrity mechanism.

- [H] Hash at creation, a preserved original, a device-signed chain and an access audit line up with what Korean courts weigh (identity and integrity, hash comparison, the testimony of custodians). Admissibility still depends on lawful collection (see §7: 통신비밀보호법 §4 excludes illegal interception) and on hearsay rules. Counsel is needed on evidentiary use, especially for safety-accident investigations.

### Gaps
- The original texts of 2013도2511, 2012도7461 and 2022도1864 were not read; only secondary summaries were.
- On-prem RFC 3161 TSA software options were not researched.
- Current Axon technical documentation (as opposed to the 2020 paper) was not found.
- Whether the C2PA conformance programme admits self-hosted or private CAs was not checked.

## 6. Security and deployment patterns (device encryption, mTLS, private network, SSO, audit, appliance, enterprise reviews, 망분리)

### Takeaway
Device baseline:
- SQLCipher through expo-sqlite's `useSQLCipher` config plugin or op-sqlite's `sqlcipher` build flag, with the key wrapped by an Android Keystore or StrongBox key.
- App-private encrypted media files.
- A hardware-attested device identity (StrongBox/Knox Vault) used for mTLS or signed tokens.

Network: either a self-hosted WireGuard mesh (Headscale, BSD-3) or the customer's MDM-managed always-on or per-app VPN (Android Enterprise, Knox).

Server: a docker-compose appliance with OIDC SSO (Keycloak, Apache-2.0, or the customer's IdP), audit logs, SBOM, signed images and an air-gapped install.

Korean deployment risk: many plants and fabs enforce MDM that blocks the camera and recording at the gate. The app must be allow-listed or run on managed company devices. That is a sales and deployment requirement, not just a technical one.

### Cited Findings
**Encryption at rest**
- `expo-sqlite` has a built-in config-plugin option `useSQLCipher`, with per-platform overrides. It is applied at build time and needs a new binary. [F] [Expo SQLite docs](https://docs.expo.dev/versions/latest/sdk/sqlite/)
- op-sqlite's `sqlcipher` flag in `package.json` links OpenSSL and compiles op-sqlite against SQLCipher; a JavaScript reload is not enough.
  - If the native build lacks SQLCipher, op-sqlite "accepts the key and ignores it", so the database is written unencrypted with no error. Stream's SDK refuses to open in that case.
  - Store the key in Keystore or Keychain and rotate a key-encryption key rather than re-keying the database.

  [V] [Stream Chat React Native docs](https://getstream.io/chat/docs/sdk/react-native/v10/state/offline-support/encrypting-the-offline-database/), [@powersync/op-sqlite](https://www.npmjs.com/package/@powersync/op-sqlite)
- op-sqlite is MIT and active (pushed 2026-11-03). [F] [GitHub OP-Engineering/op-sqlite](https://github.com/OP-Engineering/op-sqlite)
- Knox Vault backs StrongBox; key attestation reports the StrongBox level; Android 17 caps per-app Keystore keys. [V/F] (see §5 sources)

**Private network**
- Headscale is BSD-3-Clause and very active (about 45k stars, pushed 2026-11-05). [F] [GitHub juanfont/headscale](https://github.com/juanfont/headscale)
- It supports OIDC SSO, pre-auth keys, ACLs and MagicDNS, implements one tailnet per instance, and has no official web UI. The official Tailscale clients, including Android, can point at a custom control server. [P] [Infralovers 2026-05-22](https://www.infralovers.com/blog/2026-05-22-headscale-self-hosted-tailscale-alternative/), [DEV comparison](https://dev.to/selfhostingsh/headscale-vs-tailscale-self-hosted-control-plane-1h1f)
- One Android issue (routes not created with Headscale, #1913) is closed. [F] [Headscale issue 1913](https://github.com/juanfont/headscale/issues/1913)
- Android Enterprise always-on VPN needs a VPN profile plus a connectivity profile (Intune). Per-app VPN routes selected managed apps. [V] [Microsoft Intune docs](https://learn.microsoft.com/en-us/mem/intune/configuration/vpn-settings-android-enterprise)
- Knox SDK VPN lets admins assign multiple VPN profiles to chosen enterprise apps. [V] [Samsung Knox SDK VPN](https://docs.samsungknox.com/dev/knox-sdk/features/vpn-providers/overview/)

**Server components**
- Keycloak is Apache-2.0 and active. [F] [GitHub keycloak/keycloak](https://github.com/keycloak/keycloak)
- The PowerSync service ships as a Docker image with a Compose dev stack (precedent for appliance packaging). [V] [PowerSync self-hosting](https://docs.powersync.com/self-hosting/getting-started)

**What enterprise security reviews ask for**
- Standard vendor questionnaires are built around multi-tenant SaaS and do not say which questions apply to self-hosted products. [P] [Teleport blog](https://goteleport.com/blog/saas-vs-on-prem-security/)
- Typical asks are SOC 2 or ISO 27001 (check what the audit scope covers), an SBOM, recent pen tests, SSO, MFA, RBAC, audit logs, encryption at rest and in transit, and incident response. [P] [isitpatched guide](https://isitpatched.com/guides/sbom-vs-questionnaire), [Valuecase checklist](https://www.valuecase.com/articles/customer-onboarding-software-security-checklist)
- ISO 27001:2022 supplier controls are A.5.19–A.5.22. [P] (same sources)
- Self-hosted ("box") software "places much more of a burden on the end user", and SBOMs help them monitor components. [P] [NTIA SBOM comment, Google 2021](https://www.ntia.gov/files/ntia/publications/google_-_2021.06.17.pdf)

**ISMS-P (Korea)**
- In April 2026 the Ministry of Science and ICT and PIPC announced that ISMS-P would become mandatory for major public systems, telcos, identity-verification agencies and large personal-information handlers. The post-certification follow-up measures are slated for the second half of 2026, and mandatory certification and the stricter criteria from 2027. [P] [Newsis 2026-04-09](https://www.newsis.com/view/NISX20260409_0003584993), [Daum/News 2026-04-10](https://v.daum.net/v/20260410082534799)
- The draft enforcement-decree criteria cited in a BSA filing require all of the following: prior-year revenue of at least 1 trillion won, ICT-service revenue of at least 10 billion won, and an average of at least 30 million domestic data subjects per day. [P] [BSA filing 2026-07-14](https://www.bsa.org/files/policy-filings/kr07142026bsakrpipa.pdf), [Digital Daily 2026-06-02](https://www.ddaily.co.kr/page/view/2026060209483580759)

**Network separation (망분리)**
- N2SF (국가망보안체계, the national network security framework) replaces blanket physical network separation in the public sector with data classes: C (classified), S (sensitive) and O (open). The NIS published a draft in January 2025 and version 1.0 in September 2025. KISA is supporting six information-service models in 2026. [P] [Digital Daily 2025-01-23](https://www.ddaily.co.kr/page/view/2025012316455942967), [Byline Network 2026-03](https://byline.network/2026/03/16-630/)

**Phone controls on Korean plant sites**
- A Samsung Semiconductor partner MDM app blocks the camera in secured zones through a device profile. [V] [App Store listing](https://apps.apple.com/us/app/%EC%82%BC%EC%84%B1%EB%B0%98%EB%8F%84%EC%B2%B4-%ED%98%91%EB%A0%A5%EC%82%ACmdm/id6451467400)
- An LG Electronics MDM plan restricts phone functions after the employee passes the gate. [P] [Pressian](https://pressian.com/pages/articles/106598)
- Common MDM requirements are blocking camera, recording and USB, often unlocked by GPS, NFC or a BLE beacon. [P] [KoreaScience 2017](https://koreascience.kr/article/JAKO201711656578258.pdf), [KoreaScience 2023](https://koreascience.kr/article/JAKO202302357620581.pdf)

### Inferences
- Rec. [E] Device security:
  - Make SQLCipher mandatory and add a startup self-check: open the database file raw and assert it is not plaintext. This guards against the silent-plaintext failure.
  - The database key is random, wrapped by a Keystore AES key (StrongBox if available), and the wrapping key requires the device to be unlocked.
  - Media segments are encrypted per file with streaming AEAD (for example Tink). [H] Verify the Jetpack Security status before use.
  - Use the app-private directory with no `MediaStore` exposure. Enable remote wipe through MDM or server-side token revocation.
- Rec. [E] Device identity and transport:
  - At enrolment (QR code from the admin console), generate a StrongBox key and send the attestation chain. The appliance CA issues a client certificate. All API, tus and sync traffic uses mTLS plus OIDC user tokens (device and user are separate identities).
  - Pin the appliance CA. Revoke lost devices at the CA and the IdP.
- Rec. [E] Network options, in order of customer preference:
  - (a) The customer's MDM per-app or always-on VPN. Typical for large enterprises with Knox or Intune.
  - (b) A Headscale-controlled WireGuard mesh shipped in the appliance, using the Tailscale Android client. Fits SMEs without a VPN.
  - (c) Site Wi-Fi to an on-prem endpoint only, with offline buffering covering off-site time.
  - Design for all three. The app must never assume connectivity.
- Rec. [E] Appliance (`docker compose`):
  - Reverse proxy (Caddy or Traefik, mTLS).
  - API and sync service.
  - Postgres.
  - tusd plus object store (local FS or SeaweedFS).
  - ASR/LLM GPU worker (another researcher's scope).
  - Keycloak, or federate to the customer's IdP via OIDC/SAML.
  - Optional Headscale.
  - Tessera log.
  - chrony configured as server and client toward the customer's time source.
  - Backup job (restic to customer storage).
  - Prometheus metrics and an OTLP or syslog audit export for the customer's SIEM.

  Ship it as an offline bundle: image tarballs, cosign signatures, an SBOM (CycloneDX/SPDX), an offline licence file and zero outbound calls by default.
- [E] What an on-prem vendor typically must provide for a review:
  - A security whitepaper and architecture diagram.
  - SBOM and vulnerability-disclosure and patch SLAs.
  - Pen-test summaries.
  - A secure-SDLC description.
  - Data-flow and retention documentation.
  - SSO, RBAC and audit-log features.
  - Hardening guides, and support access only by customer-controlled escalation.
  - For larger Korean deals, alignment with ISMS-P controls, although the vendor is usually not the certified entity for an on-prem product.
- [H] MDM conflict: this app's core function (always-available microphone, camera and GPS) is exactly what Korean fabs and plants block. Two deployment patterns:
  - Company-owned Android Enterprise "fully managed" devices, with the app allow-listed as the only recorder.
  - An MDM vendor policy exception tied to zones.

  Either needs customer security sign-off, so plan sales collateral for this.

### Gaps
- Keycloak with React Native OIDC (expo-auth-session or react-native-app-auth with PKCE) was not verified.
- Whether Jetpack Security Crypto is deprecated was not verified.
- The final ISMS-P decree text and effective dates were not verified.
- N2SF mobile-device rules in the 1.0 guideline were not found.
- Which MDMs (Knox Manage, Intune, Korean vendors) can allow-list microphone use per app in secured zones was not researched.
- Headscale's current Android compatibility matrix was not found.

## 7. Recording and privacy law (Korea, US, EU) and consent/notice UX

### Takeaway
**Korea.** Under 통신비밀보호법 (the Protection of Communications Secrets Act):
- A participant recording their own conversation is generally lawful, but it carries civil-liability risk.
- Recording or listening by device to others' non-public conversations is a crime (§14, §16: 1–10 years imprisonment) and makes the recording inadmissible.

So "always-on" capture is dangerous when the wearer is not part of the conversation. Further duties:
- Voice is personal information. Speaker identification is biometric, which makes it sensitive information requiring separate consent.
- Employee-monitoring devices need 노사협의회 (labour-management council) consultation (근로자참여법 §20①14).
- Business-purpose mobile video devices in public places must signal recording by light, sound or signs (개인정보보호법 §25-2, since 2023-09-15).
- Location needs consent under 위치정보법 (the Location Information Act) §15.

**US.** Consent rules vary by state; at least 9 states clearly require all parties to consent. Illinois BIPA covers voiceprints and requires written notice and a written release.

**EU.** Consent from employees is rarely valid. Legitimate interest plus a DPIA plus works-council involvement is the norm. The AI Act bans inferring emotions in the workplace. Speaker identification and diarisation tied to identity are GDPR Article 9 biometrics.

Counsel is needed in every jurisdiction before launch.

### Cited Findings
**Korea: 통신비밀보호법**
- §14 prohibits recording, or listening by electronic or mechanical means to, non-public conversations between others. §3① covers third parties not participating in the conversation. Violators, and those who disclose the content, face 1–10 years' imprisonment and up to 5 years' suspension of qualifications (§16). [P] [korea.legal §14](https://korea.legal/wiki/%ed%86%b5%ec%8b%a0%eb%b9%84%eb%b0%80%eb%b3%b4%ed%98%b8%eb%b2%95-%ec%a0%9c14%ec%a1%b0/), [LawTalk](https://www.lawtalk.co.kr/posts/94570)
- Supreme Court 2016. 5. 12. 2013도15616 held §14① violations punishable under §16①. A 2022 ruling found guilt for secretly recording others' conversation within earshot and passing it to a third party. 2022. 8. 31. 2020도1007 limits prohibited "listening" to listening by electronic or mechanical means. [P] [nepla 2013도15616](https://www.nepla.ai/case/%EB%8C%80%EB%B2%95%EC%9B%90/2013%EB%8F%8415616), [Lawtimes](https://www.lawtimes.co.kr/news/articleView.html?idxno=182425), [LawTalk](https://www.lawtalk.co.kr/posts/94570)
- A recording of a phone call by a non-participant is interception under §3① and inadmissible under §4 (2021다236999, as cited). [P] [LawTalk](https://www.lawtalk.co.kr/posts/94570)
- Participant recording: commentators distinguish recording by a participant (not a §3 interception) from recording by a third party. The search did not surface a primary ruling in this session. [P] [LawTalk](https://www.lawtalk.co.kr/posts/94570) A participant who records and passes the recording to third parties may face civil (tort) liability. [P] [Lawtimes](https://www.lawtimes.co.kr/news/articleView.html?idxno=182425)
- In August 2022 (21st National Assembly), Rep. Yoon Sang-hyun's bill would have banned recording without all participants' consent, with up to 10 years' imprisonment and a public-interest exemption. It was reported as pending at the Legislation and Judiciary Committee. [P] [Asia Economy 2022-08-28](https://view.asiae.co.kr/article/2022082810175877385), [Segye 2022-08-22](https://www.segye.com/newsView/20220822516779)

**Korea: 개인정보보호법 (Personal Information Protection Act)**
- §25-2 (mobile video devices, promulgated 2023-03-14, effective 2023-09-15):
  - It is the legal basis for business-purpose filming in public places with mobile devices such as autonomous vehicles, robots, drones and bodycams.
  - Filming people is allowed only on §15① grounds, or where the filming is clearly indicated and the person does not object, or in decree-specified cases.
  - Filming into bathrooms, changing rooms and similar spaces is banned except for rescue.
  - Filming must be indicated "by lights, sounds, signs or other means" per 시행령 (Enforcement Decree) §27-2. Drones may use a portal notice instead.

  [P] [itwiki §25-2](https://itwiki.kr/w/%EA%B0%9C%EC%9D%B8%EC%A0%95%EB%B3%B4_%EB%B3%B4%ED%98%B8%EB%B2%95_%EC%A0%9C25%EC%A1%B0%EC%9D%982), [Seoul Metropolitan Gov. notice](https://news.seoul.go.kr/gov/archives/554433), [Boannews](https://m.boannews.com/html/detail.html?idx=118898), [itwiki 시행령 §27](https://itwiki.kr/w/%EA%B0%9C%EC%9D%B8%EC%A0%95%EB%B3%B4_%EB%B3%B4%ED%98%B8%EB%B2%95_%EC%8B%9C%ED%96%89%EB%A0%B9_%EC%A0%9C27%EC%A1%B0)
- Whether §25-2 applies to police bodycams was debated. [P] [Nocut News](https://www.nocutnews.co.kr/news/5944678)
- Biometrics: PIPC's biometric guideline (September 2021) distinguishes 생체정보 (biometric data in general) from 생체인식정보 (biometric data used to recognise a person). The feature information of the latter is 민감정보 (sensitive information) under the enforcement decree. [P] [Lawtimes](https://www.lawtimes.co.kr/news/articleViewAmp.html?idxno=172836), [Boannews series](https://m.boannews.com/html/detail.html?idx=103846)
- With speaker recognition (for example an AI speaker), voice becomes biometric sensitive information. That needs separate consent, and in principle the raw voice should be deleted after features are extracted. [P] [nepla on voice data](https://www.nepla.ai/wiki/it-정보-방송통신/개인정보-위치정보-신용정보/녹음된-목소리를-ai-학습용으로-활용할-수-있을까-6349gpgz29zx)

**Korea: workplace monitoring**
- 근로자참여법 (the Act on Worker Participation and Cooperation) §20①14 lists "installation of worker-monitoring equipment in the workplace" as a matter the 노사협의회 (labour-management council) must consult on. Councils are required at workplaces of 30 or more. The Supreme Court reads "monitoring equipment" by effect, even when monitoring workers is not the main purpose. In Tata Daewoo (2023. 6. 29., 2018도1917), CCTV installed without consent or council consultation was found potentially unlawful. [P] [Shin & Kim newsletter](https://www.shinkim.com/kor/media/newsletter/2201)
- PIPC and the Ministry of Employment and Labor revised their worker personal-information guideline in January 2023:
  - Before introducing CCTV or biometric devices, employers must explain the purpose and processing to workers and hear their views.
  - Companies with a council must consult it.
  - Collection must be minimised, for example by adjusting camera angles.

  [P] [Byline Network 2023-01-31](https://byline.network/2023/01/0131_02/)
- AI tools: whether one counts as "monitoring equipment" depends on its specific functions and operation. [P] [Shin & Kim](https://www.shinkim.com/kor/media/newsletter/2270)

**Korea: 위치정보법 (Location Information Act)**
- §15 requires anyone collecting another person's location to obtain consent. Employers collecting workers' location are mostly not location-information or LBS business operators themselves. [P] [nepla on location-based attendance](https://www.nepla.ai/wiki/it-정보-방송통신/개인정보-위치정보-신용정보/개인-위치정보를-활용한-근태-관리-사생활-침해일까-ov59rpxm0n06)
- The 2022-04-20 amendment changed personal-location-information businesses from licence to registration and added inspections and penalties. [P] [Shin & Kim](https://www.shinkim.com/kor/media/newsletter/1789)
- Reporting was abolished for LBS businesses that do not handle personal location information, with protective rules still applied. The date is unclear in the source. [P] [Bizhankook](https://bizhankook.com/articles/4984.html)
- The current statute version is shown as effective 2025-10-01. [P] [nepla statute page](https://www.nepla.ai/law/%EC%9C%84%EC%B9%98%EC%A0%95%EB%B3%B4%EC%9D%98%20%EB%B3%B4%ED%98%B8%20%EB%B0%8F%20%EC%9D%B4%EC%9A%A9%20%EB%93%B1%EC%97%90%20%EA%B4%80%ED%95%9C%20%EB%B2%95%EB%A5%A0)

**US**
- Nine states clearly require all-party consent: California, Florida, Illinois, Maryland, Massachusetts, Montana, New Hampshire, Pennsylvania and Washington. Counts range from 11 to 15 because of split states:
  - Nevada: all-party for phone calls, per its Supreme Court.
  - Oregon: all-party in person, one-party for phone calls.
  - Connecticut: civil liability possible.

  Washington treats a recorded announcement as consent. When participants are in different states, the strictest rule generally applies. [P] [Layer3 Labs guide, updated 2026-08-13](https://www.layer3labs.io/guides/two-party-consent-states), [Scribbl 2026](https://scribbl.co/post/do-you-have-to-tell-people-youre-recording), [Kilpatrick Townsend 2024](https://ktslaw.com/blog/globalprivacy-and-cybersecuritylaw/2024/7/wiretap-laws-in-the-united-states)
- BIPA:
  - "Biometric identifier" includes "voiceprint". [F] [740 ILCS 14/10](https://lig.ilga.gov/legislation/ilcs/documents/074000140K10.htm)
  - P.A. 103-0769 (2024) defines a written release to include an electronic signature, and for employment a release executed as a condition of employment. It limits damages for §15(b)/(d) violations to one recovery per person. [F] [Public Act 103-0769](https://ilga.gov/legislation/publicacts/103/103-0769.htm); [P] [Thompson Hine](https://www.thompsonhine.com/insights/illinois-legislature-amends-bipa-to-limit-damages-and-expand-consent-options/)
  - §15(a) requires a public retention and destruction schedule. §15(b) requires written notice of purpose and duration plus a written release before collection. Voiceprint claims are still being filed against software companies. [P] [court filing](https://storage.courtlistener.com/recap/gov.uscourts.ilnd.456418/gov.uscourts.ilnd.456418.1.0.pdf)

**EU**
- GDPR in employment:
  - Consent is rarely valid because of the power imbalance (Recital 43, Article 4(11)). Legitimate interest needs a documented balancing test.
  - Germany uses Article 88 via §26 BDSG. Works councils have co-determination over technical systems able to monitor conduct or performance (BetrVG §87(1) no. 6).
  - Secret recording is "never legally permissible" in Germany, and §201 StGB applies separately.

  [P] [SecurePrivacy](https://secureprivacy.ai/blog/employee-monitoring-gdpr-guide), [Baker McKenzie handbook](https://resourcehub.bakermckenzie.com/en/resources/global-data-and-cyber-handbook/emea/germany/topics/data-processing-in-the-employment-context), [Sally.io 2026](https://www.sally.io/blog/recording-meetings-in-germany-data-protection)
- EDPB Guidelines 02/2021 on virtual voice assistants (v2.0, adopted 2021-07-07):
  - They cover biometric identification as a processing purpose. Voice-based authentication involves biometric data.
  - Designers should filter out background speech and other people's voices.
  - A DPIA is "very likely" required.

  [F] [EDPB VVA guidelines v2.0](https://www.edpb.europa.eu/system/files/2021-07/edpb_guidelines_202102_on_vva_v2.0_adopted_en.pdf); [P] [CMS summary](https://cms.law/en/hun/legal-updates/edpb-guidelines-on-virtual-voice-assistants)
- AI Act Article 5(1)(f):
  - It bans AI that infers emotions in workplaces and education, except for medical or safety reasons.
  - Employers are covered as deployers, and "workplace" includes recruitment.
  - Detecting physical states such as fatigue is generally outside the ban.
  - Commentators dispute whether the Commission guidelines widen the exceptions, for example to sales-coaching call analysis.

  [P] [FPF](https://fpf.org/blog/red-lines-under-eu-ai-act-unpacking-the-prohibition-of-emotion-recognition-in-the-workplace-and-education-institutions/), [Lewis Silkin 2025-02-17](https://www.lewissilkin.com/insights/2025/02/17/understanding-the-eu-ai-acts-prohibited-practices-key-workplace-and-advertising-102k011), [Technology's Legal Edge 2025-04](https://www.technologyslegaledge.com/2025/04/eu-ai-act-spotlight-on-emotional-recognition-systems-in-the-workplace/)
- AI Act Recital 54 excludes from high-risk remote biometric identification any system whose sole purpose is to confirm that a person is who they claim to be (verification, including authentication). The Commission's AI Act Service Desk gives voiceprint verification for access as a verification example. [F] [AI Act Service Desk](https://ai-act-service-desk.ec.europa.eu/fr/node/461); [P] [Mishcon Recital 54](https://www.mishcon.com/eu-uk-ai-navigator/recital/no-54)
- Digital Omnibus on AI, reported as Regulation (EU) 2026/1744:
  - Published in the Official Journal on 24 July 2026 and in force from 27 July 2026.
  - Annex III stand-alone high-risk obligations (employment among them) move to no later than 2 December 2027, and Annex I to 2 August 2028.

  [P, verify on EUR-Lex] [NatLawReview](https://natlawreview.com/article/eu-digital-omnibus-ai-enters-force), [euaiact.com](https://www.euaiact.com/digital-omnibus-ai), [CSA research note](https://labs.cloudsecurityalliance.org/research/csa-research-note-eu-ai-act-high-risk-deadline-omnibus-)

### Inferences
- [H] Korean design rule. The safest posture under 통신비밀보호법 is to capture only conversations the wearer takes part in:
  - Push-to-talk or a hands-free session explicitly started by the wearer.
  - Voice activity detection with silence timeouts.
  - Auto-pause when the wearer leaves the session (for example earbuds removed, or phone pocketed with no wearer speech for N minutes).
  - No unattended "leave it running on the table" mode.
  - No Axon-style rolling pre-event audio buffer by default. Notably, Axon itself excludes audio from its pre-event buffer by default (§8).

  A third-party conversation captured while the wearer is absent is the criminal-risk scenario. Counsel is needed.
- [H] TBM and meeting recordings: treat them as recordings with all participants informed. Make an audible announcement at start, put the attendees on the record (TBM sign-in), and log a consent event. This satisfies the stricter US all-party states (Washington explicitly accepts an announcement) and Korean civil-liability concerns, and is good practice under the GDPR.
- [H] Speaker labels. Within-recording diarisation ("speaker 1/2") without enrolment arguably avoids biometric identification. Matching voices to enrolled employees (voiceprints) creates:
  - Korean sensitive information, needing separate consent and deletion of the raw voice after feature extraction where applicable.
  - Illinois BIPA duties: written notice, a release and a retention schedule.
  - GDPR Article 9 biometric processing.

  Make voice enrolment an opt-in, separately consented feature, off by default, and store templates on the appliance only. Counsel is needed.
- [H] Emotion and stress inference from voice (for example "stressed operator" alerts) must not ship in EU workplaces under Article 5(1)(f). Fatigue or physical-state detection for safety may fall outside the ban, but it is contested. Keep any such feature out of v1 globally to avoid jurisdiction-specific builds.
- [H] Workplace deployment checklist for Korean customers:
  - 노사협의회 consultation record (30+ employees).
  - Privacy notice and processing policy covering voice, audio, photos and GPS.
  - Consent or a legal basis for location (위치정보법 §15).
  - Wearable or bodycam signalling if video is captured in public places (§25-2: light, sound, signage).
  - Retention schedule.
  - Access controls and audit.
  - Data-subject request handling.

  The app vendor should provide templates for these, which is also a sales enabler.
- [H] Vendor status under 위치정보법: shipping on-prem software where the customer processes its own employees' location probably does not make the vendor an LBS business. A vendor-operated private cloud might. Counsel is needed.
- Rec. [E] Consent and notice UX patterns:
  1. Per-session start announcement: an earcon plus the spoken phrase "recording for <TBM/safety log>" in Korean and English, configurable.
  2. A persistent visible indicator on the device, plus the optional bodycam LED.
  3. Site signage templates.
  4. A participants list and consent capture for TBM and meetings.
  5. A one-tap pause or mute ("bystander mode") that logs a pause event.
  6. A recurring reminder tone, configurable, as Axon agencies use every 2 minutes.
  7. Per-user visibility of what was recorded about them, and a retention countdown.
  8. A hard "no speaker-ID or emotion" default, with an explicit admin opt-in and per-person consent for speaker ID.

### Gaps
- Original statute texts on law.go.kr were not retrieved, so §25-2 and 시행령 §27-2 should be checked verbatim.
- Whether §25⑤'s ban on audio recording for fixed devices applies to mobile devices through §25-2④ (which applies §25⑥–⑧) is unclear and needs counsel.
- Whether the 22nd National Assembly (from May 2024) has a new party-recording ban bill was not found. [H] The 2022 Yoon bill presumably lapsed when the 21st Assembly ended.
- Federal ECPA one-party consent (18 U.S.C. §2511(2)(d)) was not re-verified, and neither were other state biometric laws (Texas CUBI, Washington).
- The exact application date of AI Act Article 5 (understood as 2 February 2025) and the Digital Omnibus details were not verified on EUR-Lex.
- No newer PIPC worker or biometric guidance after 2023 was found.

## 8. Trust UX for always-recording or capture apps (indicators, no-data-loss, crash recovery, hands-free start)

### Takeaway
Trust failures in capture products are silent:
- In July 2026 Pixel Recorder users reported recordings that "appeared" to be made but were never saved.
- On Plaud, vibration without the red light means it is not recording.
- On Otter, outage guidance is to record elsewhere.

The app must therefore prove three states, continuously and separately: recording now (live level, partial transcript, elapsed time, cue tones), safely on the phone (segment closed, hash written, read-back verified), and on the server (server-acknowledged hash, per item). It should also detect and announce faults: silence, a microphone route change, low storage or battery, or a clock not synced.

Hands-free start options that are compatible with Android's while-in-use rules:
- Notification action.
- Home-screen widget.
- Samsung side-button double press, which opens the app or one of its features.
- An assistant or voice-interaction role.

A plain earbud media button, by contrast, is constrained.

### Cited Findings
**Bodycams (Axon Body 4)**
- Pre-event buffer configurable 0–120 s, default 30 s, with no audio in the buffer by default (an admin can enable it). The buffer does not run when the camera is off, asleep or docked. A separate "Video Recall" offers an 18-hour buffer. [V] [Axon Body 4 operation](https://www.axon.com/help/axon-body-4/cameras-and-sensors/body/operation.htm), [LCSO helpdesk](https://helpdesk.lcso.org/support/solutions/articles/17000183714-ab4-general-knowledge)
- Indicators:
  - LED blinking green while buffering, blinking red while recording.
  - Two short tones at recording start, and a long tone on stop.
  - A reminder of two tones and two vibrations every 2 minutes (agency-configurable).
  - Stealth mode disables lights, audio and haptics.

  [V] [Axon icons, LEDs and sounds](https://www.axon.com/help/axon-body-4/cameras-and-sensors/body/icons-leds-sounds.htm), [LCSO display notifications](https://helpdesk.lcso.org/support/solutions/articles/17000183698-ab4-display-notifications)

**Voice recorders and recorder apps**
- Plaud NotePin:
  - A long press gives a gentle vibration, then a strong vibration, then the red light. A vibration without the red light means recording did not start.
  - A yellow light means storage is full. Recordings stay on the device until synced, and a full device won't record or may stop.

  [V] [Plaud: Start recording](https://support.plaud.ai/hc/en-us/articles/50841183397273-Start-recording), [Plaud: storage full](https://support.plaud.ai/hc/en-us/articles/59018767068313-Plaud-NotePin-S-storage-is-full)
- Deleting from the device before sync can lose data, so check playback in the app first. [P] [Third-party troubleshooting guide](https://book.st-hakky.com/en/purpose/plaud-note-connection-troubleshooting)
- Google Recorder (reported 2026-07-07):
  - Recordings were "failing to appear in the Recorder app and in affected phones' internal storage". One user said the app "isn't actually creating recordings when it appears to be".
  - At least six users reported it, cache clearing did not help, and Google had not responded.

  [P] [Android Authority](https://www.androidauthority.com/google-recorder-not-recording-3684852/), [Gadget Hacks](https://android.gadgethacks.com/news/pixel-recorder-not-saving-recordings-bug-causes-silent-data-loss/)
- Otter: during a manual-recording outage, the status page advised recording audio separately and importing it later. [V, via status mirror] [isdown Otter incident](https://isdown.app/status/otter-ai/incidents/559991-manual-ad-hoc-recording-not-working)
- Just Press Record: one-tap recording. The Apple Watch app records without the phone and syncs later. Storage can be local-only or iCloud Drive. Lock-screen widgets and a watch-complication record button are available. [V] [App Store](https://apps.apple.com/app/id1033342465), [press kit](https://www.openplanetsoftware.com/just-press-record/press-kit.html), [AppleVis](https://www.applevis.com/apps/watch/utilities/just-press-record)

**Android privacy indicators**
- From Android 12, a green indicator appears in a fixed position whenever an app uses the camera or microphone. Apps cannot cover it, and tapping it shows which app is using the sensor. [F] [AOSP privacy indicators](https://source.android.com/devices/tech/config/privacy-indicators)

**Hands-free start**
- Samsung side button: double press can "Open app". On One UI 7 and later it can also launch an app's key feature (Samsung's examples include Voice Recorder). [V] [Samsung US support](https://www.samsung.com/us/support/answer/ANS00084203/), [SamMobile 2025-02-17](https://www.sammobile.com/news/galaxy-s25-side-button-options-one-ui-7/)
- These cases still grant microphone access to a foreground service started from the background ("while-in-use" exemptions):
  - Started by a system component.
  - Started from interaction with an app widget or a notification.
  - Started by a `PendingIntent` from a visible app.
  - Started by a device-owner DPC.
  - Started by an app providing `VoiceInteractionService`.

  [F] [Android FGS background-start restrictions](https://developer.android.com/develop/background-work/services/fgs/restrictions-bg-start)
- Android 17 lists "media key events from an external device" among explicit-intent interactions that grant while-in-use access. [F] [Android 17 background audio hardening](https://developer.android.com/about/versions/17/changes/bg-audio)
- On API 31+, the media button receiver throws if the app is in the background. A service started into the foreground by the receiver must start playback, "or the system will crash the service". [F] [Media3 MediaButtonReceiver](https://developer.android.com/reference/androidx/media3/session/MediaButtonReceiver)
- Quick Settings tile: one project (strongSwan) hit "Background activity launch blocked!" on Android 14 when launching from a tile, and worked around it with the overlay permission. [P] [strongSwan commit](https://git.sharpetronics.com/sharpetronics/strongswan/commit/51f746161d9da2383d698d95dd2b10f69dee9970)

### Inferences
Rec. [E] Trust patterns to build:

1. **Three-state model, always visible** in the app header and the persistent foreground-service notification: "Recording" (elapsed time, live level meter), then "Saved on phone" (last segment closed N s ago, items pending), then "Synced" (server-acknowledged up to item X / time T). Render these with text and distinct shapes as well as colour; colour alone fails in sunlight and for colour-blind users.
2. **Proof of life.** The live level meter and rolling partial transcript appear in the app and as compact notification text. A "heard you" haptic or earcon fires on each finalised utterance (optional).
3. **Start and stop cues.** Distinct earcon and haptic patterns, with a different pattern for "failed to start". This avoids Plaud's ambiguity. An optional periodic reminder (Axon-style), muted by default.
4. **Write-ahead capture.**
   - Encode into small segment files (for example fragmented MP4/AAC or Opus/Ogg pages, flushed every 1–2 s with fsync) and write each segment's metadata row to SQLite in WAL mode before and after.
   - After a crash, the service rescans incomplete segments and finalises them, keeping a playable prefix. The user sees "Recovered 2 min of audio from interrupted session".
5. **Read-back verification.** After a segment closes, reopen the file, check its duration and hash, and only then mark it "saved". This guards against Pixel Recorder-style silent failures.
6. **No deletion before server acknowledgement.** Local files are deleted only after the server echoes the same SHA-256 and the retention policy allows it. Show the per-item server receipt time in the detail view.
7. **Health monitors with spoken or haptic alerts:**
   - No speech or very low level for N minutes ("mic covered or earbud disconnected?").
   - Input route changed (earbud mic to phone mic).
   - Storage remaining under X hours of audio.
   - Battery below the threshold for the expected shift end.
   - Clock sync stale (uncertainty above the target).
   - Upload backlog older than Y hours.
   - Thermal throttling.
8. **Start-of-shift self-test.** Record 2 s, confirm the level and the route, confirm server reachability and the clock offset, and show a green checklist. This is the aviation-checklist idea of a deliberate verification step before relying on the system. [H] No aviation source was gathered.
9. **Hands-free start, by priority:**
   - (a) A notification action and a home or lock-screen widget (both while-in-use exempt).
   - (b) Samsung side-button double press opening the app, or a deep-link "start" activity.
   - (c) A voice wake phrase while a session is already armed.
   - (d) Evaluate the `VoiceInteractionService`/assistant role, which is exempt but takes over the user's assistant setting.
   - (e) Earbud button via `MediaSession` only while a session foreground service is already running (for example to mark a moment or start a new log entry), not as a cold start.
   - (f) A Quick Settings tile that launches a visible activity rather than starting the service directly.
10. **Bodycam-style video, if added later.** Follow Axon's defaults: no audio in any pre-buffer, a visible LED, and tones on start and stop. Korean §25-2 also requires light, sound or signage notice.

### Gaps
- No primary design write-ups were found from Otter, Plaud or Google on their crash-recovery mechanisms.
- No published user research on trust in capture apps was found (the search budget was exhausted).
- Whether Galaxy Buds touch gestures can be remapped to a third-party app action (beyond media keys) was not verified.
- Android's assistant role requirements and Play policy for non-assistant apps were not researched.

## 9. Android platform constraints (microphone FGS rules, background start, Samsung app killing, indicators, background location, battery)

### Takeaway
Start the combined `microphone|location` foreground service only from a visible activity or an exempt user interaction (notification, widget). From Android 14, a microphone foreground service created from the background throws a `SecurityException`, and none can start from `BOOT_COMPLETED`. Android 15 caps dataSync and mediaProcessing services at 6 h/24 h. Android 16 puts jobs running alongside a foreground service under quota. Android 17 (stable on Pixel since 2026-06-17) silently mutes background audio playback and blocks audio focus unless the app has a properly started foreground service. Samsung is rated among the worst for killing apps, but claims since One UI 6.0 that compliant Android 14+ foreground services "work as intended". No credible measurement was found for battery life under continuous recording plus on-device ASR. Measure it on the S25 early.

### Cited Findings
**Foreground-service types and while-in-use rules**
- From Android 14 every foreground service must declare a type. The `microphone` type needs `FOREGROUND_SERVICE_MICROPHONE` plus the `RECORD_AUDIO` runtime grant. `RECORD_AUDIO` is while-in-use, so a microphone service cannot be created while the app is in the background, nor launched from `BOOT_COMPLETED`, apart from the exemptions. The `location` type is similar unless `ACCESS_BACKGROUND_LOCATION` is granted. Play Console requires a declaration of the foreground-service types used. [F] [Android FGS types](https://developer.android.com/develop/background-work/services/fgs/service-types)
- Android 14+ checks permissions when the service is created. A microphone or location service created from the background "throws a `SecurityException`". `checkSelfPermission()` still returns GRANTED, which is misleading. [F] [Android FGS background-start restrictions](https://developer.android.com/develop/background-work/services/fgs/restrictions-bg-start)
- General background-start exemptions include:
  - A user-visible transition, or an FCM high-priority message.
  - Interaction with a notification, widget or bubble, or an exact alarm for a user action.
  - Geofence or activity-transition events, or `BOOT_COMPLETED` (restricted from Android 14/15).
  - Battery optimisation turned off for the app.
  - `SYSTEM_ALERT_WINDOW` (on Android 15+, also a visible overlay).
  - Companion-device permissions, or a device or profile owner.

  [F] [same page](https://developer.android.com/develop/background-work/services/fgs/restrictions-bg-start)

**Version-specific limits**
- Android 15: dataSync and mediaProcessing services are capped at 6 h/24 h, with `onTimeout`. dataSync, mediaPlayback, mediaProjection and phoneCall services cannot start from `BOOT_COMPLETED`. [F] [FGS timeout](https://developer.android.com/develop/background-work/services/fgs/timeout), [FGS types](https://developer.android.com/develop/background-work/services/fgs/service-types)
- Android 16: job runtime quotas now apply to jobs running alongside a foreground service, and to jobs started while the app was visible. `setImportantWhileForeground` is ignored. A 16 KB page-size compatibility mode was added. [F] [Android 16 behaviour changes](https://developer.android.com/about/versions/16/behavior-changes-all)
- Android 17 (API 37):
  - Background audio playback, focus and volume calls need a visible activity or a foreground service that is not of the short-service type. Apps targeting 37 need a foreground service with while-in-use capability.
  - Otherwise playback is silenced without error, and focus returns `AUDIOFOCUS_REQUEST_FAILED`.
  - Memory limits are based on device RAM, with exit reason `MemoryLimiter:AnonSwap`.
  - The per-app Keystore key cap is 50,000.
  - Cross-profile loopback traffic is blocked by default.

  [F] [Android 17 behaviour changes](https://developer.android.com/about/versions/17/behavior-changes-all), [background audio hardening](https://developer.android.com/about/versions/17/changes/bg-audio)
- Android 17 stable began rolling out to Pixel 6 and later on 2026-06-17. Non-Pixel phones depend on the manufacturer. One aggregator reports One UI 9 (Android 17) reaching the Galaxy S26 (low confidence). [P] [TechRepublic](https://techrepublic.com/article/news-android-17-pixel-rollout/), [Business Today 2026-06-17](https://www.businesstoday.in/technology/news/story/google-starts-rolling-out-android-17-to-pixel-phones-check-eligibility-and-whats-new-537393-2026-06-17)

**Samsung app killing (dontkillmyapp)**
- Samsung scores 5, the worst tier:
  - "Put unused apps to sleep" can apply after as little as 3 days and re-sleeps apps.
  - Adaptive battery is "much more eager than in stock Android".
  - Wake locks in foreground services have been restricted since Android 11.
- A 07/2024 update cites a 2023 Google/Samsung statement that from One UI 6.0, foreground services of apps targeting Android 14 "will be guaranteed to work as intended" if built to the new policy.
- The user workarounds listed (no battery optimisation, never-sleeping list, background usage allowed) can be reverted by OS updates.
- "No known solution on dev end."

[P] [dontkillmyapp.com/samsung](https://dontkillmyapp.com/samsung)

**Privacy indicators**
- A green microphone or camera indicator is always shown when either is in use (Android 12+). [F] [AOSP privacy indicators](https://source.android.com/devices/tech/config/privacy-indicators)

**Battery under continuous ASR**
- An NAACL 2025 industry paper (Li et al.) measured streaming ASR (Emformer/Conformer transducers) on a Pixel 5 and reported up to 47% lower energy with a weight-configuration method. It gives no battery-hours figure. [P] [ACL Anthology 2025.naacl-industry.50](https://preview.aclanthology.org/setup/2025.naacl-industry.50)
- A blog estimates 3,000–10,000 mJ per on-device transcription, but says these "are not direct measurements". [P, low reliability] [liveinthefuture.org](https://liveinthefuture.org/stories/asr-sota-on-device-vs-cloud)

### Inferences
- Rec. [E] Service lifecycle:
  - One `microphone|location` foreground service (plus `mediaPlayback` if spoken prompts or cues play), started only from:
    - (a) the visible app,
    - (b) a notification action,
    - (c) a widget, or
    - (d) a deep-link activity opened by the Samsung side button.
  - Never auto-start recording after a reboot. After a reboot, post a "Resume logging?" notification whose action starts the service with while-in-use access.
  - This also satisfies Android 17 audio hardening, because the foreground service is started with while-in-use access, so earcons and TTS keep working with the screen locked. This builds on, and does not re-derive, technical-decisions §7.
- Rec. [E] Samsung:
  - Onboarding detects Samsung and walks the user through "Battery: Unrestricted" and "Never sleeping apps".
  - Show a persistent warning if it is not set. Detect process deaths via `ApplicationExitInfo` and surface them in the health panel.
  - For managed fleets, have MDM or Knox set battery-optimisation exemptions centrally. [H] Knox policy APIs were not verified this session.
- Rec. [E] Memory (Android 17 limits): keep the ASR model and audio buffers in native memory and within budget. Log `ApplicationExitInfo` reasons to catch `MemoryLimiter` kills, which would look like "recording stopped by itself".
- Rec. [E] Location: use a while-in-use location type inside the session service. Request `ACCESS_BACKGROUND_LOCATION` only if the product needs GPS when no session is running, which is probably unnecessary. Use a geofence (an exempt trigger) only to prompt "Arrived at site — start log?", not to start recording automatically.
- [E] Battery rough envelope, to be measured:
  - Assumptions: a Galaxy S25-class battery of about 15 Wh (about 4,000 mAh × 3.85 V; capacity not re-verified this session), screen off, microphone capture with VAD at about 0.1–0.2 W, and streaming ASR only on detected speech (30–50% duty) on 1–2 big cores at about 0.5–1.5 W while active.
  - Add GPS at 1 Hz (about 0.1–0.3 W), a Bluetooth SCO link (about 0.05–0.15 W) and periodic uploads.
  - That gives roughly 0.4–1.0 W average, or about 15–35 h on a full battery. An 8–10 h shift looks feasible, with GPS duty cycling and ASR on speech only as the main levers.
  - Validate with `dumpsys batterystats` or Battery Historian, and an on-device power rail if available, in the first prototype week.

### Gaps
- No published measurement of hours of continuous recording plus on-device ASR on a Galaxy S25 (or any recent phone) was found.
- Whether Samsung's One UI 7/8/9 still honours the One UI 6.0 foreground-service guarantee was not confirmed.
- Android 17's own foreground-service type changes beyond audio could not be confirmed. Third-party claims of new types such as `dataProcessing` were found but are unverified.
- Whether the S25 has received One UI 9 (Android 17) by 2026-11-05 was not verified.
