// // config/android.real.cap.ts
// // 1) Find your UDID with `adb devices` and paste it below.
// const UDID = "RZCW20H58SZ";  // e.g. RZCWC0W... from `adb devices`

// export const androidRealCaps = {
//   platformName: "Android",
//   "appium:automationName": "UiAutomator2",
//   "appium:deviceName": "Android-Real",
//   "appium:udid": UDID,
//   "appium:noReset": true,
//   "appium:newCommandTimeout": 180
// };
// config/android.real.cap.ts
export const androidRealCaps = {
  platformName: 'Android',
  'appium:automationName': 'UiAutomator2',
  'appium:deviceName': process.env.DEVICE_NAME || 'Android Device',

  // If you have multiple devices connected, set the UDID:
  //   ANDROID_UDID=<your-udid> npm run menu
  ...(process.env.ANDROID_UDID
    ? { 'appium:udid': process.env.ANDROID_UDID }
    : {}),

  'appium:noReset': true,
  'appium:newCommandTimeout': 240
};
