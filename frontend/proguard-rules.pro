# Proguard rules for React Native/Expo app optimization

# Keep React Native classes
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }

# Keep Expo classes
-keep class expo.** { *; }
-keep class host.exp.exponent.** { *; }

# Keep native modules
-keep class com.plaid.** { *; }
-keep class com.reactnativecommunity.** { *; }

# Keep chart library
-keep class com.github.** { *; }

# Remove unused code
-dontwarn **
-ignorewarnings

# Optimize
-optimizations !code/simplification/arithmetic,!code/simplification/cast,!field/*,!class/merging/*
-optimizationpasses 5
-allowaccessmodification

# Remove logging
-assumenosideeffects class android.util.Log {
    public static *** d(...);
    public static *** v(...);
}

# Keep essential Android classes
-keep class android.support.v4.** { *; }
-keep class androidx.** { *; }

# Remove unused resources
-keep class **.R$* {
    public static <fields>;
} 