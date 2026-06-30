plugins {
    alias(libs.plugins.android.application)
    id("com.google.gms.google-services") // Kích hoạt Firebase
}

dependencies {
    // 1. Phục hồi lại các thư viện giao diện gốc của Android
    implementation(libs.androidx.appcompat)
    implementation(libs.material)
    implementation(libs.androidx.constraintlayout)

    // 2. Thư viện Firebase của bạn
    implementation(platform("com.google.firebase:firebase-bom:33.1.0"))
    implementation("com.google.firebase:firebase-database")
}
android {
    namespace = "com.example.smartroom"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.example.smartroom"
        minSdk = 24
        targetSdk = 34
        versionCode = 1
        versionName = "1.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_1_8
        targetCompatibility = JavaVersion.VERSION_1_8
    }
}