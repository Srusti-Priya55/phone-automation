// export const androidRealCaps = {
//   platformName: 'Android',
//   'appium:automationName': 'UiAutomator2',
//   'appium:deviceName': process.env.DEVICE_NAME || 'Android Device',

//   // If you have multiple devices connected, set the UDID:
//   //   ANDROID_UDID=<your-udid> npm run menu
//   ...(process.env.ANDROID_UDID
//     ? { 'appium:udid': process.env.ANDROID_UDID }
//     : {}),

//   'appium:noReset': true,
//   'appium:newCommandTimeout': 240
// };

// config/android.real.cap.ts

export const androidRealCaps1 = {
  platformName: 'Android',
  'appium:automationName': 'UiAutomator2',
  'appium:deviceName': 'device1',
  'appium:udid': 'RZCW20H58SZ',
  'appium:noReset': true,
  'appium:newCommandTimeout': 300,
};

export const androidRealCaps2 = {
  platformName: 'Android',
  'appium:automationName': 'UiAutomator2',
  'appium:deviceName': 'device2',
  'appium:udid': 'RFCNC1119KV',
  'appium:noReset': true,
  'appium:newCommandTimeout': 300,
};
