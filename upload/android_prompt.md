# Android Companion App — AutoFinDocs Scanner

> **Full prompt for building the Android companion app for the AutoFinDocs Intelligent Document Finance Platform.**

---

You are an expert Android developer. Build a **companion Android app** for the **AutoFinDocs — Intelligent Document Finance Platform** web backend.

## Context

There is an existing FastAPI backend (deployed on Render) that handles document classification, field extraction (via LLM), storage, approval workflows, CRM, analytics, and GST compliance. The **Android app's job is simple scanning + OCR on-device**, then sending the extracted text to the backend API. The heavy AI/business logic stays on the server.

**Backend API Base URL**: Configurable (e.g., `https://autofinocs-api.onrender.com/api/v1`)

**Architecture Principle**: Phone does OCR → Server does brains. The app is a thin scanning client, NOT a full ERP.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Language** | Kotlin 2.0+ |
| **Min SDK** | 30 (Android 11) |
| **Target SDK** | 34 (Android 14) |
| **Compile SDK** | 35 |
| **UI** | Jetpack Compose + Material 3 (Material You) |
| **Architecture** | MVVM + Clean Architecture |
| **OCR** | Google ML Kit Text Recognition V2 (on-device, FREE) |
| **Camera** | CameraX 1.4+ |
| **Document Scanner** | Google ML Kit Document Scanner API (auto-crop, perspective fix) |
| **Networking** | Retrofit2 2.11+ + OkHttp 4.12+ + Moshi |
| **Auth** | JWT stored in EncryptedSharedPreferences (AndroidX Security) |
| **DI** | Hilt 2.51+ |
| **Local DB** | Room 2.6+ (offline upload queue) |
| **Background Sync** | WorkManager 2.9+ (auto-upload when online) |
| **Push Notifications** | Firebase Cloud Messaging (FCM) |
| **Image Processing** | ML Kit Document Scanner (built-in crop + enhance) |
| **Navigation** | Jetpack Navigation Compose |
| **Serialization** | Kotlinx Serialization / Moshi |
| **Build** | Gradle Kotlin DSL + Version Catalog (libs.versions.toml) |

---

## Supported Android Versions

| Version | API Level | Key Considerations |
|---|---|---|
| **Android 11** | 30 | Scoped storage enforced. Use `MediaStore` / `FileProvider`. Package visibility filtering active. |
| **Android 12** | 31–32 | Splash screen API mandatory. Approximate location option. Bluetooth permissions change. |
| **Android 13** | 33 | `POST_NOTIFICATIONS` runtime permission required for FCM. Photo picker (`PickVisualMedia`) available. Granular media permissions (`READ_MEDIA_IMAGES` instead of `READ_EXTERNAL_STORAGE`). |
| **Android 14** | 34 | Foreground service type required in manifest (`dataSync`). Predictive back gesture support. Selected photos access (partial media access). |

---

## Core Features

### 1. Authentication
- Login screen with email + password
- API call: `POST /api/v1/auth/login` → receives JWT `access_token`
- Store token in `EncryptedSharedPreferences` (AndroidX Security Crypto)
- Auto-refresh token before expiry via `POST /api/v1/auth/refresh`
- Optional: Biometric unlock using `BiometricPrompt` (fingerprint / face) to unlock stored session
- Logout clears token, Room cache, and navigates to login
- Handle 401 responses globally via OkHttp `Authenticator`

### 2. Document Scanning (Primary Feature — Hero Flow)
- **Camera capture**: CameraX viewfinder with tap-to-focus, flash toggle, and capture button
- **ML Kit Document Scanner**: Use `GmsDocumentScanning` API for:
  - Automatic edge detection and document border cropping
  - Perspective correction (dewarp skewed captures)
  - Auto brightness/contrast enhancement
  - Multi-page scanning (scan 2nd page, 3rd page, etc.)
  - Returns clean, cropped JPEG images
- **Gallery import**: Use Android 13+ `PickVisualMedia` contract for image selection. Fallback to `ACTION_GET_CONTENT` for Android 11–12.
- **PDF import**: Pick PDF via `ACTION_OPEN_DOCUMENT` (mime: `application/pdf`), read via `ContentResolver`
- **Preview before sending**: Show processed image(s), allow retake or discard
- **Batch scanning**: Scan multiple documents in sequence, queue all for upload

### 3. On-Device OCR (Google ML Kit Text Recognition V2)
- Dependency: `com.google.mlkit:text-recognition:16.x` (bundled model, works offline)
- Run on the processed/cropped image — NOT the raw camera capture
- Extract:
  - Full text (`Text.textBlocks → lines → elements`)
  - Per-block confidence scores
  - Bounding box coordinates (for potential highlight overlay)
  - Overall average confidence
- Support **English** (default) + **Hindi/Devanagari** (`com.google.mlkit:text-recognition-devanagari:16.x`)
- Display extracted text to user in a scrollable preview for quick verification
- **All OCR runs 100% on-device** — zero cloud calls for text recognition
- Handle edge cases: blurry images (warn user), rotated text, multi-column layouts

### 4. Upload to Backend
After OCR, send to `POST /api/v1/documents/upload` as **multipart/form-data**:

```
Parts:
  - file: MultipartBody.Part (original image/PDF, JPEG compressed to ~80% quality)
  - ocr_text: RequestBody (extracted text string)
  - ocr_confidence: RequestBody (float, e.g., "0.94")
  - source: RequestBody ("android")
  - device_info: RequestBody ("Pixel 7, Android 14, API 34")
  - page_count: RequestBody (integer, for multi-page docs)
```

- Show upload progress bar (use OkHttp `RequestBody` with progress callback)
- On success: show green checkmark toast, add to local document list
- On failure: save to Room `pending_uploads` table for retry
- **Offline handling**: If no network, save to Room immediately, show "Queued" badge

### 5. Offline Queue & Auto-Sync
- **Room entity**: `PendingUpload(id, imagePath, ocrText, confidence, source, deviceInfo, createdAt, retryCount, status)`
- **WorkManager**: `PeriodicWorkRequest` every 15 minutes OR `OneTimeWorkRequest` with network constraint
  - On Android 14: declare foreground service type `dataSync` in manifest
  - `<service android:name=".sync.SyncWorker" android:foregroundServiceType="dataSync" />`
- **Retry policy**: Exponential backoff, max 5 retries, then mark as `FAILED` (user can manually retry)
- **Sync indicator**: Show persistent icon in home screen when items are queued
- Use `NetworkMonitor` (ConnectivityManager + `NetworkCallback`) to detect online/offline

### 6. Document List (Simple View)
- Fetch from `GET /api/v1/documents?page=1&page_size=20`
- Display in `LazyColumn`:
  - Thumbnail (loaded from Supabase Storage public URL via Coil)
  - File name
  - Document type badge (Invoice, Receipt, PO, etc.) — color-coded
  - Status badge: UPLOADED (gray), PROCESSING (blue), EXTRACTED (green), APPROVED (green check), REJECTED (red)
  - Uploaded date (relative: "2 hours ago")
- Pull-to-refresh via `pullToRefresh` modifier
- Infinite scroll pagination
- Tap → navigate to detail screen
- Cache in Room for offline viewing

### 7. Document Detail
- Fetch from `GET /api/v1/documents/{id}`
- Show:
  - Document image (zoomable via `Modifier.transformable`)
  - Status with full pipeline progress indicator
  - Extracted fields (if invoice): vendor name, GSTIN, invoice number, date, total amount, tax breakdown
  - Line items table (scrollable)
  - OCR text (expandable section)
  - Approval status and comments
- Share button: share document image/PDF via `Intent.ACTION_SEND`

### 8. Quick Approval
- Fetch from `GET /api/v1/approvals/pending`
- Card-based UI with:
  - Vendor name, invoice number, amount (large, bold)
  - Fraud risk badge (LOW = green, MEDIUM = yellow, HIGH = red)
  - Document type
- Actions:
  - Swipe right → approve (`POST /api/v1/approvals/{id}/approve`)
  - Swipe left → reject (`POST /api/v1/approvals/{id}/reject`)
  - Tap card → expand: comment field + approve/reject buttons + escalate option
- Haptic feedback on swipe actions
- Confirmation dialog before approve/reject

### 9. Push Notifications (FCM)
- Register FCM token on login: `POST /api/v1/devices/register` body: `{"fcm_token": "...", "device_name": "..."}`
- Handle notification types:
  - `DOCUMENT_PROCESSED` → "Invoice #1234 processed successfully" → tap opens detail
  - `APPROVAL_REQUIRED` → "New invoice ₹45,000 needs your approval" → tap opens approval
  - `DOCUMENT_FLAGGED` → "Invoice flagged for potential fraud" → tap opens detail
- Android 13+: Request `POST_NOTIFICATIONS` permission at runtime (show rationale dialog first)
- Notification channels: `documents`, `approvals`, `alerts`

### 10. Settings
- **Server URL**: Editable text field (for switching between dev/staging/prod)
- **Profile**: Name, email, role (read-only from API)
- **Sync status**: Pending uploads count, last sync time, force sync button
- **Appearance**: Dark/Light/System theme toggle
- **Scanner settings**: Default quality (high/medium), auto-flash toggle
- **About**: App version, build number, open-source licenses
- **Logout**: Clear all data and return to login

---

## Screens & Navigation

```
NavGraph:
├── LoginScreen (startDestination when not authenticated)
├── MainNavHost (startDestination when authenticated)
│   ├── HomeScreen (Dashboard)
│   ├── ScannerFlow (nested nav graph)
│   │   ├── CameraCaptureScreen
│   │   ├── PreviewScreen (crop + OCR result)
│   │   └── UploadConfirmScreen
│   ├── DocumentListScreen
│   │   └── DocumentDetailScreen
│   ├── ApprovalListScreen
│   │   └── ApprovalDetailScreen
│   └── SettingsScreen
```

Bottom navigation: **Home** | **Scan** (center, prominent FAB) | **Documents** | **Approvals** | **Settings**

---

## UI Design Requirements

- **Material 3 / Material You** with dynamic color theming from wallpaper (Android 12+), fallback to brand colors on Android 11
- **Color scheme**:
  - Primary: Indigo `#6366f1`
  - Secondary: Violet `#8b5cf6`
  - Surface: `#0f172a` (dark), `#f8fafc` (light)
  - Error: `#ef4444`
  - Success: `#22c55e`
- **Dark mode**: Full support, follow system setting by default. Match web dashboard's dark theme (`#0f172a` background, `#1e293b` cards)
- **Large FAB** for "Scan" — this is the hero action, always visible, center of bottom nav
- **Clean, minimal UI** — the app is for scanning, not a full ERP
- **Haptic feedback**: On camera capture, swipe approve/reject, successful upload
- **Animations**:
  - Shared element transitions (list → detail)
  - Lottie animation for upload success checkmark
  - Shimmer/skeleton loading for lists and images
  - Smooth page transitions (fade + slide)
- **Typography**: Use `GoogleFont("Inter")` or `GoogleFont("Outfit")` via Compose Google Fonts
- **Adaptive layouts**: Handle different screen sizes (phones 5"–7"). No tablet layout needed.
- **Edge-to-edge**: Use `enableEdgeToEdge()` with proper insets handling

---

## Folder Structure

```
app/
├── build.gradle.kts
├── src/main/
│   ├── AndroidManifest.xml
│   ├── java/com/autofinocs/
│   │   ├── AutoFinDocsApp.kt              # Application class (@HiltAndroidApp)
│   │   │
│   │   ├── di/                            # Hilt dependency injection
│   │   │   ├── AppModule.kt               # Singletons (prefs, DB)
│   │   │   ├── NetworkModule.kt           # Retrofit, OkHttp, Moshi
│   │   │   └── DatabaseModule.kt          # Room database
│   │   │
│   │   ├── data/
│   │   │   ├── remote/
│   │   │   │   ├── api/
│   │   │   │   │   ├── AuthApi.kt         # @POST login, refresh
│   │   │   │   │   ├── DocumentApi.kt     # @POST upload, @GET list/detail
│   │   │   │   │   ├── ApprovalApi.kt     # @GET pending, @POST approve/reject
│   │   │   │   │   └── DeviceApi.kt       # @POST register FCM token
│   │   │   │   ├── dto/                   # Network response/request DTOs
│   │   │   │   │   ├── LoginRequest.kt
│   │   │   │   │   ├── LoginResponse.kt
│   │   │   │   │   ├── DocumentResponse.kt
│   │   │   │   │   ├── ApprovalResponse.kt
│   │   │   │   │   └── ApiWrapper.kt      # {"status":"success","data":...}
│   │   │   │   └── interceptor/
│   │   │   │       ├── AuthInterceptor.kt     # Attach Bearer token
│   │   │   │       └── TokenAuthenticator.kt  # Auto-refresh on 401
│   │   │   │
│   │   │   ├── local/
│   │   │   │   ├── db/
│   │   │   │   │   ├── AppDatabase.kt         # @Database
│   │   │   │   │   ├── dao/
│   │   │   │   │   │   ├── PendingUploadDao.kt
│   │   │   │   │   │   └── CachedDocumentDao.kt
│   │   │   │   │   └── entity/
│   │   │   │   │       ├── PendingUploadEntity.kt
│   │   │   │   │       └── CachedDocumentEntity.kt
│   │   │   │   └── prefs/
│   │   │   │       └── SecurePrefs.kt         # EncryptedSharedPreferences wrapper
│   │   │   │
│   │   │   └── repository/
│   │   │       ├── AuthRepositoryImpl.kt
│   │   │       ├── DocumentRepositoryImpl.kt
│   │   │       └── SyncRepositoryImpl.kt
│   │   │
│   │   ├── domain/
│   │   │   ├── model/                     # Domain models (clean, no annotations)
│   │   │   │   ├── User.kt
│   │   │   │   ├── Document.kt
│   │   │   │   ├── Approval.kt
│   │   │   │   ├── ScanResult.kt
│   │   │   │   └── UploadStatus.kt
│   │   │   ├── repository/               # Repository interfaces
│   │   │   │   ├── AuthRepository.kt
│   │   │   │   ├── DocumentRepository.kt
│   │   │   │   └── SyncRepository.kt
│   │   │   └── usecase/
│   │   │       ├── LoginUseCase.kt
│   │   │       ├── ScanDocumentUseCase.kt
│   │   │       ├── UploadDocumentUseCase.kt
│   │   │       ├── GetDocumentsUseCase.kt
│   │   │       ├── ApproveDocumentUseCase.kt
│   │   │       └── SyncPendingUploadsUseCase.kt
│   │   │
│   │   ├── presentation/
│   │   │   ├── MainActivity.kt            # @AndroidEntryPoint, single activity
│   │   │   ├── navigation/
│   │   │   │   ├── NavGraph.kt
│   │   │   │   ├── Screen.kt             # Sealed class/enum for routes
│   │   │   │   └── BottomNavBar.kt
│   │   │   ├── theme/
│   │   │   │   ├── Color.kt
│   │   │   │   ├── Theme.kt              # Dynamic color on 12+, brand fallback on 11
│   │   │   │   ├── Type.kt               # Inter/Outfit font
│   │   │   │   └── Shape.kt
│   │   │   ├── screens/
│   │   │   │   ├── login/
│   │   │   │   │   ├── LoginScreen.kt
│   │   │   │   │   └── LoginViewModel.kt
│   │   │   │   ├── home/
│   │   │   │   │   ├── HomeScreen.kt
│   │   │   │   │   └── HomeViewModel.kt
│   │   │   │   ├── scanner/
│   │   │   │   │   ├── ScannerScreen.kt       # CameraX + ML Kit Document Scanner
│   │   │   │   │   ├── ScannerViewModel.kt
│   │   │   │   │   └── PreviewScreen.kt       # OCR result + confirm upload
│   │   │   │   ├── documents/
│   │   │   │   │   ├── DocumentListScreen.kt
│   │   │   │   │   ├── DocumentListViewModel.kt
│   │   │   │   │   ├── DocumentDetailScreen.kt
│   │   │   │   │   └── DocumentDetailViewModel.kt
│   │   │   │   ├── approvals/
│   │   │   │   │   ├── ApprovalListScreen.kt
│   │   │   │   │   ├── ApprovalListViewModel.kt
│   │   │   │   │   └── ApprovalDetailScreen.kt
│   │   │   │   └── settings/
│   │   │   │       ├── SettingsScreen.kt
│   │   │   │       └── SettingsViewModel.kt
│   │   │   └── components/               # Reusable composables
│   │   │       ├── DocumentCard.kt
│   │   │       ├── ApprovalCard.kt
│   │   │       ├── StatusBadge.kt
│   │   │       ├── MetricCard.kt
│   │   │       ├── LoadingShimmer.kt
│   │   │       ├── ErrorState.kt
│   │   │       ├── EmptyState.kt
│   │   │       └── UploadProgressBar.kt
│   │   │
│   │   ├── service/
│   │   │   ├── FCMService.kt             # FirebaseMessagingService
│   │   │   └── SyncWorker.kt             # WorkManager worker for background upload
│   │   │
│   │   └── util/
│   │       ├── OCRProcessor.kt           # ML Kit Text Recognition wrapper
│   │       ├── ImageProcessor.kt         # Compress, rotate, resize
│   │       ├── NetworkMonitor.kt         # ConnectivityManager + NetworkCallback
│   │       ├── DateUtils.kt
│   │       ├── FileUtils.kt             # ContentResolver helpers, URI to File
│   │       ├── PermissionUtils.kt       # Runtime permission helpers
│   │       └── Constants.kt
│   │
│   └── res/
│       ├── values/
│       │   ├── strings.xml
│       │   ├── colors.xml
│       │   └── themes.xml
│       ├── values-night/
│       │   └── themes.xml
│       ├── drawable/                     # Icons, splash, placeholders
│       ├── xml/
│       │   ├── file_paths.xml            # FileProvider paths
│       │   ├── backup_rules.xml          # Android 12+ backup rules
│       │   └── data_extraction_rules.xml
│       └── raw/
│           └── upload_success.json       # Lottie animation

gradle/
└── libs.versions.toml                    # Version catalog
build.gradle.kts                          # Project-level
settings.gradle.kts
```

---

## API Contract (Backend Endpoints the App Uses)

| Method | Endpoint | Request | Response |
|---|---|---|---|
| `POST` | `/api/v1/auth/login` | `{"email":"...","password":"..."}` | `{"status":"success","data":{"access_token":"...","token_type":"bearer"}}` |
| `POST` | `/api/v1/auth/refresh` | `{"token":"..."}` | Same as login |
| `GET` | `/api/v1/auth/me` | Bearer token | `{"status":"success","data":{"id":"...","email":"...","role":"...","full_name":"..."}}` |
| `POST` | `/api/v1/documents/upload` | Multipart: `file` + `ocr_text` + `ocr_confidence` + `source` + `device_info` | `{"status":"success","data":{"id":"...","file_name":"...","status":"UPLOADED"}}` |
| `GET` | `/api/v1/documents?page=1&page_size=20` | Bearer token | `{"status":"success","data":{"items":[...],"total":100,"page":1}}` |
| `GET` | `/api/v1/documents/{id}` | Bearer token | `{"status":"success","data":{...full document + invoice + line_items...}}` |
| `GET` | `/api/v1/approvals/pending` | Bearer token | `{"status":"success","data":{"items":[...],"total":5}}` |
| `POST` | `/api/v1/approvals/{id}/approve` | `{"comments":"Looks good"}` | `{"status":"success","data":{"id":"...","status":"APPROVED"}}` |
| `POST` | `/api/v1/approvals/{id}/reject` | `{"comments":"Amount mismatch"}` | `{"status":"success","data":{"id":"...","status":"REJECTED"}}` |
| `POST` | `/api/v1/devices/register` | `{"fcm_token":"...","device_name":"...","os_version":"..."}` | `{"status":"success"}` |

---

## AndroidManifest.xml — Key Declarations

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <!-- Permissions -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />              <!-- Android 13+ -->
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"
        android:maxSdkVersion="32" />                                                     <!-- Android 11-12 only -->
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />              <!-- Android 13+ -->
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_DATA_SYNC" />    <!-- Android 14+ -->
    <uses-permission android:name="android.permission.USE_BIOMETRIC" />

    <uses-feature android:name="android.hardware.camera" android:required="false" />

    <application
        android:name=".AutoFinDocsApp"
        android:enableOnBackInvokedCallback="true"
        android:dataExtractionRules="@xml/data_extraction_rules"
        android:fullBackupContent="@xml/backup_rules"
        ... >

        <activity
            android:name=".presentation.MainActivity"
            android:exported="true"
            android:theme="@style/Theme.AutoFinDocs.Splash">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <!-- Background sync worker (Android 14 needs foregroundServiceType) -->
        <service
            android:name=".service.SyncWorker"
            android:foregroundServiceType="dataSync"
            android:exported="false" />

        <!-- FCM -->
        <service
            android:name=".service.FCMService"
            android:exported="false">
            <intent-filter>
                <action android:name="com.google.firebase.MESSAGING_EVENT" />
            </intent-filter>
        </service>

        <!-- FileProvider for camera captures -->
        <provider
            android:name="androidx.core.content.FileProvider"
            android:authorities="${applicationId}.fileprovider"
            android:exported="false"
            android:grantUriPermissions="true">
            <meta-data
                android:name="android.support.FILE_PROVIDER_PATHS"
                android:resource="@xml/file_paths" />
        </provider>

    </application>
</manifest>
```

---

## Runtime Permissions Strategy

```kotlin
// PermissionUtils.kt — handle version-specific permissions

fun getRequiredPermissions(): List<String> {
    val permissions = mutableListOf(Manifest.permission.CAMERA)

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {  // Android 13+
        permissions.add(Manifest.permission.READ_MEDIA_IMAGES)
        permissions.add(Manifest.permission.POST_NOTIFICATIONS)
    } else {  // Android 11-12
        permissions.add(Manifest.permission.READ_EXTERNAL_STORAGE)
    }

    return permissions
}

// Request flow:
// 1. Check permission → if granted, proceed
// 2. If shouldShowRationale → show explanation dialog → then request
// 3. If permanently denied → show settings redirect dialog
```

---

## Key Implementation Notes

1. **OCR is 100% on-device** — never upload images to Google Cloud for OCR. Use `com.google.mlkit:text-recognition:16.x` (bundled model). Works fully offline.
2. **The app is a thin client** — no business logic (classification, extraction, matching, approval rules). Just scan → OCR → send text + file to backend.
3. **Backend skips its own OCR** when `source == "android"` and `ocr_text` is provided. The server jumps straight to classify → extract → store.
4. **Image quality matters** — use ML Kit Document Scanner for auto-crop and perspective correction. Better image = better OCR = better LLM extraction on server. Compress to JPEG 80% quality for upload (balance quality vs size).
5. **Offline-first** — always save to Room first, then sync. The user might scan 10 invoices in a warehouse with no signal. Use WorkManager with `NetworkType.CONNECTED` constraint.
6. **Keep APK size under 30 MB** — ML Kit bundled model adds ~10 MB. Use R8/ProGuard for release builds. Use `resConfigs "en", "hi"` to strip unused locale resources.
7. **Scoped storage (Android 11+)** — no `MANAGE_EXTERNAL_STORAGE`. Use `FileProvider` for camera captures. Use `MediaStore` or `PickVisualMedia` for gallery access. Use `ACTION_OPEN_DOCUMENT` for PDF import.
8. **Photo picker (Android 13+)** — use `PickVisualMedia` contract. Falls back to `ACTION_GET_CONTENT` on Android 11–12 automatically via `ActivityResultContracts`.
9. **Predictive back gesture (Android 14)** — set `android:enableOnBackInvokedCallback="true"` in manifest. Use `PredictiveBackHandler` in Compose where needed.
10. **POST_NOTIFICATIONS (Android 13+)** — request this permission on first launch after login. Show a rationale dialog explaining why notifications help ("Get notified when your documents are processed"). If denied, app still works — just no push notifications.
11. **Foreground service type (Android 14+)** — declare `android:foregroundServiceType="dataSync"` on the SyncWorker service in manifest. WorkManager handles the foreground notification automatically.
12. **Splash Screen API (Android 12+)** — use `androidx.core.splashscreen:splashscreen` library for consistent splash behavior across Android 11–14. Define splash theme in `themes.xml`.
13. **Security** — never log tokens. Use `EncryptedSharedPreferences` for all sensitive data. Enable certificate pinning in OkHttp for production. Set `android:networkSecurityConfig` to disallow cleartext in production.
14. **Error handling** — wrap all API calls in `Result<T>`. Show user-friendly error messages via Snackbar. Retry transient failures (network timeout, 500). Don't retry 4xx errors.

---

## Build Order (Recommended for Subagents)

```
Step 1: Project setup (Gradle, version catalog, Hilt, themes)
Step 2: Data layer (Room, Retrofit, SecurePrefs, DTOs)
Step 3: Domain layer (models, repository interfaces, use cases)
Step 4: Auth flow (LoginScreen + API + token management)
Step 5: Scanner flow (CameraX + ML Kit Document Scanner + OCR)
Step 6: Preview + Upload (OCR result display + multipart upload)
Step 7: Offline queue (Room PendingUpload + WorkManager SyncWorker)
Step 8: Document list + detail screens
Step 9: Approval list + swipe actions
Step 10: Home dashboard + bottom nav + FCM + settings
Step 11: Polish (animations, dark mode, error states, edge-to-edge)
Step 12: Testing (unit tests for use cases, UI tests for scanner flow)
```

---

## Testing Strategy

| Type | Tool | Coverage |
|---|---|---|
| **Unit tests** | JUnit 5 + MockK + Turbine (Flow) | Use cases, repositories, ViewModels |
| **Integration tests** | Hilt testing + MockWebServer | API calls, Room DAOs |
| **UI tests** | Compose UI testing | Login flow, scanner flow, approval swipe |
| **Screenshot tests** | Paparazzi or Roborazzi | Component visual regression |

---

## Deliverables Checklist

- [ ] Login with JWT + biometric unlock
- [ ] Camera scan with auto-crop + perspective correction (ML Kit Document Scanner)
- [ ] On-device OCR (ML Kit, English + Hindi)
- [ ] Preview OCR result before upload
- [ ] Multipart upload with progress bar
- [ ] Offline queue with auto-sync (WorkManager)
- [ ] Document list with pagination + pull-to-refresh
- [ ] Document detail with extracted fields
- [ ] Approval queue with swipe approve/reject
- [ ] FCM push notifications (3 channels)
- [ ] Dark/Light theme (Material You on 12+)
- [ ] Settings screen with server URL config
- [ ] Handles Android 11, 12, 13, 14 permission models correctly
- [ ] APK size < 30 MB
- [ ] All screens have loading, error, and empty states
