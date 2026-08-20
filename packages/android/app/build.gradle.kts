plugins {
  id("com.android.application")
  id("org.jetbrains.kotlin.android")
}

android {
  namespace = "com.feurinc.betterx.android"
  compileSdk = 34

  defaultConfig {
    applicationId = "com.feurinc.betterx.android"
    minSdk = 26
    targetSdk = 34
    versionCode = 30000
    versionName = "3.0.0"
  }

  buildFeatures {
    buildConfig = true
  }

  compileOptions {
    sourceCompatibility = JavaVersion.VERSION_17
    targetCompatibility = JavaVersion.VERSION_17
  }

  kotlinOptions {
    jvmTarget = "17"
  }

  packaging {
    resources {
      excludes += "/META-INF/{AL2.0,LGPL2.1}"
    }
  }
}

dependencies {
  implementation("androidx.activity:activity-ktx:1.9.2")
  implementation("androidx.appcompat:appcompat:1.7.0")
  implementation("androidx.core:core-ktx:1.13.1")
  implementation("androidx.webkit:webkit:1.12.1")
}

tasks.register<Exec>("buildWeb") {
  onlyIf { !project.hasProperty("skipBetterXWebBuild") }
  workingDir = rootProject.projectDir
  commandLine("bun", "run", "build:web")
}

tasks.named("preBuild") {
  dependsOn("buildWeb")
}
