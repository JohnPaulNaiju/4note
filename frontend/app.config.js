import 'dotenv/config';

const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;
const AUTH_DOMAIN = process.env.AUTH_DOMAIN;
const PROJECT_ID = process.env.PROJECT_ID;
const STORAGE_BUCKET = process.env.STORAGE_BUCKET;
const MESSAGING_SENDER_ID = process.env.MESSAGING_SENDER_ID;
const APP_ID = process.env.APP_ID;
const MEASUREMENT_ID = process.env.MEASUREMENT_ID;
const EMOJI_API_KEY = process.env.EMOJI_API_KEY;
const PEXEL_API_KEY = process.env.PEXEL_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GOOGLE_SERVICES_JSON = process.env.GOOGLE_SERVICES_JSON;
const GOOGLE_SERVICES_INFO = process.env.GOOGLE_SERVICES_INFO;

//=== Increment these in every new release ===//
const buildNumber = 1;                       //
const version = '1.0.0';                    //
//=========================================//

export default {
    expo: {
        name: "4note", 
        slug: "4note", 
        scheme: "4note", 
        owner: "4note", 
        version: version, 
        orientation: "portrait", 
        description: "AI note taking application", 
        userInterfaceStyle: "light", 
        platforms: ["ios", "android"], 
        assetBundlePatterns: ["**/*"], 
        runtimeVersion: { policy: "sdkVersion" }, 
        newArchEnabled: true, 
        icon: "./assets/icon.png", 
        ios: { 
            supportsTablet: true, 
            usesIcloudStorage: true, 
            backgroundColor: '#FFFFFF', 
            icon: "./assets/icon.png", 
            buildNumber: `"${buildNumber}"`, 
            googleServicesFile: GOOGLE_SERVICES_INFO, 
            associatedDomains: ["applinks:4note.app"], 
            infoPlist: { UIBackgroundModes: ["audio"] }, 
            config: { "usesNonExemptEncryption": false }, 
            bundleIdentifier: "com.fournotelabs.fournote", 
            entitlements: { "com.apple.developer.networking.wifi-info": true }, 
        }, 
        android: { 
            versionCode: buildNumber, 
            backgroundColor: '#FFFFFF', 
            softwareKeyboardLayoutMode: "resize", 
            package: "com.fournotelabs.fournote", 
            googleServicesFile: GOOGLE_SERVICES_JSON, 
            permissions: [ 
                "android.permission.RECORD_AUDIO", 
                "android.permission.FOREGROUND_SERVICE", 
                "android.permission.READ_MEDIA_IMAGES", 
                "android.permission.READ_MEDIA_VIDEO", 
            ], 
            adaptiveIcon: { 
                backgroundColor: "#FFFFFF", 
                monochromeImage: "./assets/monochrome.png", 
                foregroundImage: "./assets/adaptive-icon.png", 
            }, 
            intentFilters: [ 
                { 
                    action: "VIEW", 
                    autoVerify: true, 
                    data: [ 
                        { 
                            scheme: "https", 
                            host: "4note.app", 
                            pathPrefix: "/", 
                        }, 
                        { 
                            scheme: "http", 
                            host: "4note.app", 
                            pathPrefix: "/", 
                        } 
                    ], 
                    category: ["BROWSABLE", "DEFAULT"] 
                } 
            ] 
        }, 
        plugins: [ 
            [ 
                "expo-document-picker", 
                { 
                    iCloudContainerEnvironment: "Production", 
                } 
            ], 
            [ 
                "expo-media-library", 
                { 
                    photosPermission: "Allow 4note to access your gallery to add photos to your notes.", 
                    savePhotosPermission: "Allow 4note to save photos to your device.", 
                    isAccessMediaLocationEnabled: false, 
                }
            ], 
            [ 
                "expo-font", 
                { 
                    fonts: [ 
                        "./assets/font/Gilroy-Bold.ttf", 
                        "./assets/font/Gilroy-Regular.ttf", 
                        "./assets/font/Gilroy-SemiBold.ttf", 
                    ] 
                } 
            ], 
            [ 
                "expo-build-properties", 
                { 
                    android: { 
                        allowBackup: false, 
                        targetSdkVersion: 35, 
                        compileSdkVersion: 35, 
                        buildToolsVersion: "35.0.0", 
                        enableProguardInReleaseBuilds: true, 
                        enableShrinkResourcesInReleaseBuilds: true, 
                        extraProguardRules: "-keep public class com.horcrux.svg.** {*;}", 
                    }, 
                    ios: { 
                        deploymentTarget: "15.1", 
                        useFrameworks: "static", 
                    } 
                } 
            ],
            [
                "expo-splash-screen",
                {
                    backgroundColor: "#F6F6F6",
                    image: "./assets/splash.png",
                    dark: {
                        image: "./assets/splash.png",
                        backgroundColor: "#191A1F"
                    },
                    imageWidth: 200
                }
            ], 
            [
                "expo-audio",
                {
                    microphonePermission: "Allow 4note to access your microphone"
                }
            ]
        ], 
        extra: { 
            FIREBASE_API_KEY: FIREBASE_API_KEY, 
            AUTH_DOMAIN: AUTH_DOMAIN, 
            PROJECT_ID: PROJECT_ID, 
            STORAGE_BUCKET: STORAGE_BUCKET, 
            MESSAGING_SENDER_ID: MESSAGING_SENDER_ID, 
            APP_ID: APP_ID, 
            MEASUREMENT_ID: MEASUREMENT_ID, 
            EMOJI_API_KEY: EMOJI_API_KEY, 
            PEXEL_API_KEY: PEXEL_API_KEY, 
            GEMINI_API_KEY: GEMINI_API_KEY, 
            eas: { 
                projectId: "78925678-228f-410e-96c0-fead1d52a69f", 
            }, 
        } 
    } 
};