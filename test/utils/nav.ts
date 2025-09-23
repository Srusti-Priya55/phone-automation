import { driver, $ } from '@wdio/globals'

export async function navigateHome() {
  try {
    const homeBtn = await $('~Home')
    if (await homeBtn.isDisplayed()) {
      await homeBtn.click()
    } else {
      await driver.back()
    }
    await driver.pause(2000)
  } catch (err) {
    console.warn('Could not navigate home:', err)
  }
}
