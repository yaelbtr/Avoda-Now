/** מזהה דפדפן פנימי (WebView) של אפליקציות כמו פייסבוק, אינסטגרם וכו' */
export function isInAppBrowser(): boolean {
  const ua = navigator.userAgent;
  return /FBAN|FBAV|FB_IAB|FBIOS|Instagram|Twitter|musical_ly|Snapchat|Line\/|MicroMessenger/i.test(ua);
}
