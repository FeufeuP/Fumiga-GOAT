plugins {
    id("com.android.application")
}

val releaseStore = System.getenv("FUMIGA_KEYSTORE")?.takeIf(String::isNotBlank)

android {
    namespace = "com.feufeup.fumigagoat"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.feufeup.fumigagoat"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"

        // One sideload APK for 32-bit and 64-bit ARM Android phones. GeckoView's
        // x86 emulator libraries are omitted to keep the public download smaller.
        ndk {
            abiFilters += listOf("arm64-v8a", "armeabi-v7a")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    signingConfigs {
        if (releaseStore != null) {
            create("release") {
                storeType = "PKCS12"
                storeFile = file(releaseStore)
                storePassword = System.getenv("FUMIGA_KEYSTORE_PASSWORD")
                keyAlias = System.getenv("FUMIGA_KEY_ALIAS")
                keyPassword = System.getenv("FUMIGA_KEY_PASSWORD")
            }
        }
    }

    buildTypes {
        getByName("release") {
            isMinifyEnabled = false
            if (releaseStore != null) {
                signingConfig = signingConfigs.getByName("release")
            }
        }
    }
}

dependencies {
    // Bundles Mozilla's Gecko engine in the APK: no dependency on the device's WebView.
    // Pin the latest stable release whose AndroidX dependencies fit compileSdk 36; newer 154+
    // releases currently require preview compileSdk 37. Revisit when API 37 is broadly available.
    // GeckoView's WebAuthn bridge pulls Play Services FIDO transitively; this game does not use
    // WebAuthn, so exclude it to keep the APK independent of Google Play Services.
    implementation("org.mozilla.geckoview:geckoview:153.0.20260810162159") {
        exclude(group = "com.google.android.gms", module = "play-services-fido")
    }
}
