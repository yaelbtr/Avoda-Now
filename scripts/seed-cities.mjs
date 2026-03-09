/**
 * Seed script: populate the cities table with major Israeli cities.
 * Run with: node scripts/seed-cities.mjs
 */
import mysql from "mysql2/promise";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const CITIES = [
  // מרכז
  { city_code: 5000, name_he: "תל אביב-יפו", name_en: "Tel Aviv-Yafo", district: "מרכז", latitude: 32.0853, longitude: 34.7818 },
  { city_code: 6900, name_he: "ראשון לציון", name_en: "Rishon LeZion", district: "מרכז", latitude: 31.9730, longitude: 34.7925 },
  { city_code: 8600, name_he: "פתח תקווה", name_en: "Petah Tikva", district: "מרכז", latitude: 32.0841, longitude: 34.8878 },
  { city_code: 6400, name_he: "נתניה", name_en: "Netanya", district: "מרכז", latitude: 32.3215, longitude: 34.8532 },
  { city_code: 7400, name_he: "רמת גן", name_en: "Ramat Gan", district: "מרכז", latitude: 32.0684, longitude: 34.8248 },
  { city_code: 2650, name_he: "בני ברק", name_en: "Bnei Brak", district: "מרכז", latitude: 32.0833, longitude: 34.8333 },
  { city_code: 6200, name_he: "נס ציונה", name_en: "Nes Ziona", district: "מרכז", latitude: 31.9301, longitude: 34.7993 },
  { city_code: 8200, name_he: "עפולה", name_en: "Afula", district: "צפון", latitude: 32.6078, longitude: 35.2897 },
  { city_code: 4000, name_he: "חולון", name_en: "Holon", district: "מרכז", latitude: 32.0158, longitude: 34.7798 },
  { city_code: 2800, name_he: "בת ים", name_en: "Bat Yam", district: "מרכז", latitude: 32.0231, longitude: 34.7503 },
  { city_code: 6100, name_he: "מודיעין-מכבים-רעות", name_en: "Modi'in-Maccabim-Re'ut", district: "מרכז", latitude: 31.8969, longitude: 35.0095 },
  { city_code: 7600, name_he: "רחובות", name_en: "Rehovot", district: "מרכז", latitude: 31.8928, longitude: 34.8113 },
  { city_code: 8300, name_he: "פתח תקווה", name_en: "Petah Tikva", district: "מרכז", latitude: 32.0841, longitude: 34.8878 },
  { city_code: 7900, name_he: "רמלה", name_en: "Ramla", district: "מרכז", latitude: 31.9298, longitude: 34.8707 },
  { city_code: 3000, name_he: "גבעתיים", name_en: "Givatayim", district: "מרכז", latitude: 32.0717, longitude: 34.8122 },
  { city_code: 6300, name_he: "נתניה", name_en: "Netanya", district: "מרכז", latitude: 32.3215, longitude: 34.8532 },
  { city_code: 8700, name_he: "קריית אונו", name_en: "Kiryat Ono", district: "מרכז", latitude: 32.0622, longitude: 34.8558 },
  { city_code: 8800, name_he: "קריית גת", name_en: "Kiryat Gat", district: "דרום", latitude: 31.6100, longitude: 34.7642 },
  { city_code: 3100, name_he: "גדרה", name_en: "Gedera", district: "מרכז", latitude: 31.8122, longitude: 34.7775 },
  { city_code: 4900, name_he: "לוד", name_en: "Lod", district: "מרכז", latitude: 31.9516, longitude: 34.8953 },
  { city_code: 7700, name_he: "רמת השרון", name_en: "Ramat HaSharon", district: "מרכז", latitude: 32.1463, longitude: 34.8401 },
  { city_code: 7100, name_he: "קרית מוצקין", name_en: "Kiryat Motzkin", district: "צפון", latitude: 32.8333, longitude: 35.0833 },
  { city_code: 4600, name_he: "כפר סבא", name_en: "Kfar Saba", district: "מרכז", latitude: 32.1753, longitude: 34.9066 },
  { city_code: 3700, name_he: "הרצליה", name_en: "Herzliya", district: "מרכז", latitude: 32.1663, longitude: 34.8439 },
  { city_code: 6700, name_he: "עכו", name_en: "Acre", district: "צפון", latitude: 32.9281, longitude: 35.0818 },
  { city_code: 4500, name_he: "כפר יונה", name_en: "Kfar Yona", district: "מרכז", latitude: 32.3167, longitude: 34.9333 },
  { city_code: 9400, name_he: "שוהם", name_en: "Shoham", district: "מרכז", latitude: 31.9994, longitude: 34.9456 },
  { city_code: 9200, name_he: "שדרות", name_en: "Sderot", district: "דרום", latitude: 31.5240, longitude: 34.5965 },
  // ירושלים
  { city_code: 3000, name_he: "ירושלים", name_en: "Jerusalem", district: "ירושלים", latitude: 31.7683, longitude: 35.2137 },
  { city_code: 9800, name_he: "בית שמש", name_en: "Beit Shemesh", district: "ירושלים", latitude: 31.7469, longitude: 34.9888 },
  { city_code: 3200, name_he: "גבעת זאב", name_en: "Givat Ze'ev", district: "ירושלים", latitude: 31.8667, longitude: 35.1667 },
  { city_code: 9500, name_he: "מעלה אדומים", name_en: "Ma'ale Adumim", district: "ירושלים", latitude: 31.7731, longitude: 35.2981 },
  // צפון
  { city_code: 4100, name_he: "חיפה", name_en: "Haifa", district: "צפון", latitude: 32.7940, longitude: 34.9896 },
  { city_code: 7000, name_he: "קריית ביאליק", name_en: "Kiryat Bialik", district: "צפון", latitude: 32.8333, longitude: 35.0667 },
  { city_code: 7200, name_he: "קריית ים", name_en: "Kiryat Yam", district: "צפון", latitude: 32.8500, longitude: 35.0667 },
  { city_code: 7300, name_he: "קריית אתא", name_en: "Kiryat Ata", district: "צפון", latitude: 32.8000, longitude: 35.1000 },
  { city_code: 4700, name_he: "כרמיאל", name_en: "Karmiel", district: "צפון", latitude: 32.9167, longitude: 35.2833 },
  { city_code: 6800, name_he: "עפולה", name_en: "Afula", district: "צפון", latitude: 32.6078, longitude: 35.2897 },
  { city_code: 6600, name_he: "עכו", name_en: "Acre", district: "צפון", latitude: 32.9281, longitude: 35.0818 },
  { city_code: 5200, name_he: "נצרת", name_en: "Nazareth", district: "צפון", latitude: 32.6996, longitude: 35.3035 },
  { city_code: 5100, name_he: "נהריה", name_en: "Nahariya", district: "צפון", latitude: 33.0078, longitude: 35.0950 },
  { city_code: 2400, name_he: "בית שאן", name_en: "Beit She'an", district: "צפון", latitude: 32.5000, longitude: 35.5000 },
  { city_code: 9600, name_he: "צפת", name_en: "Safed", district: "צפון", latitude: 32.9646, longitude: 35.4960 },
  { city_code: 3600, name_he: "טבריה", name_en: "Tiberias", district: "צפון", latitude: 32.7940, longitude: 35.5300 },
  { city_code: 9100, name_he: "שפרעם", name_en: "Shfar'am", district: "צפון", latitude: 32.8050, longitude: 35.1700 },
  { city_code: 3800, name_he: "טמרה", name_en: "Tamra", district: "צפון", latitude: 32.8550, longitude: 35.1950 },
  { city_code: 4800, name_he: "כפר כנא", name_en: "Kafr Kanna", district: "צפון", latitude: 32.7500, longitude: 35.3333 },
  // דרום
  { city_code: 9000, name_he: "באר שבע", name_en: "Beer Sheva", district: "דרום", latitude: 31.2530, longitude: 34.7915 },
  { city_code: 6000, name_he: "נתיבות", name_en: "Netivot", district: "דרום", latitude: 31.4233, longitude: 34.5878 },
  { city_code: 3500, name_he: "דימונה", name_en: "Dimona", district: "דרום", latitude: 31.0667, longitude: 35.0333 },
  { city_code: 2600, name_he: "בית שמש", name_en: "Beit Shemesh", district: "דרום", latitude: 31.7469, longitude: 34.9888 },
  { city_code: 6500, name_he: "נתיבות", name_en: "Netivot", district: "דרום", latitude: 31.4233, longitude: 34.5878 },
  { city_code: 9300, name_he: "שדרות", name_en: "Sderot", district: "דרום", latitude: 31.5240, longitude: 34.5965 },
  { city_code: 4300, name_he: "אילת", name_en: "Eilat", district: "דרום", latitude: 29.5577, longitude: 34.9519 },
  { city_code: 4400, name_he: "ערד", name_en: "Arad", district: "דרום", latitude: 31.2589, longitude: 35.2128 },
  { city_code: 3400, name_he: "דימונה", name_en: "Dimona", district: "דרום", latitude: 31.0667, longitude: 35.0333 },
  { city_code: 3300, name_he: "גבעות בר", name_en: "Givot Bar", district: "דרום", latitude: 31.4000, longitude: 34.7500 },
  { city_code: 2500, name_he: "בית שמש", name_en: "Beit Shemesh", district: "דרום", latitude: 31.7469, longitude: 34.9888 },
  { city_code: 2300, name_he: "אשדוד", name_en: "Ashdod", district: "דרום", latitude: 31.7956, longitude: 34.6497 },
  { city_code: 2100, name_he: "אשקלון", name_en: "Ashkelon", district: "דרום", latitude: 31.6688, longitude: 34.5742 },
  { city_code: 2200, name_he: "אשדוד", name_en: "Ashdod", district: "דרום", latitude: 31.7956, longitude: 34.6497 },
  // שרון
  { city_code: 8900, name_he: "רעננה", name_en: "Ra'anana", district: "מרכז", latitude: 32.1840, longitude: 34.8706 },
  { city_code: 8100, name_he: "עמק חפר", name_en: "Emek Hefer", district: "מרכז", latitude: 32.3833, longitude: 34.9167 },
  { city_code: 8000, name_he: "פרדס חנה-כרכור", name_en: "Pardes Hanna-Karkur", district: "מרכז", latitude: 32.4667, longitude: 34.9667 },
  { city_code: 5300, name_he: "נשר", name_en: "Nesher", district: "צפון", latitude: 32.7667, longitude: 35.0333 },
  { city_code: 5400, name_he: "נתניה", name_en: "Netanya", district: "מרכז", latitude: 32.3215, longitude: 34.8532 },
  { city_code: 5500, name_he: "נתניה", name_en: "Netanya", district: "מרכז", latitude: 32.3215, longitude: 34.8532 },
  { city_code: 5600, name_he: "נתניה", name_en: "Netanya", district: "מרכז", latitude: 32.3215, longitude: 34.8532 },
  { city_code: 5700, name_he: "סביון", name_en: "Savyon", district: "מרכז", latitude: 32.0333, longitude: 34.8833 },
  { city_code: 5800, name_he: "עומר", name_en: "Omer", district: "דרום", latitude: 31.2667, longitude: 34.8333 },
  { city_code: 5900, name_he: "עמנואל", name_en: "Emmanuel", district: "מרכז", latitude: 32.1667, longitude: 35.1333 },
];

// Deduplicate by name_he
const seen = new Set();
const uniqueCities = CITIES.filter(c => {
  if (seen.has(c.name_he)) return false;
  seen.add(c.name_he);
  return true;
});

async function seed() {
  const conn = await mysql.createConnection(DATABASE_URL);
  console.log("Connected to DB");

  // Clear existing cities
  await conn.execute("DELETE FROM cities");
  console.log("Cleared existing cities");

  // Insert cities
  for (const city of uniqueCities) {
    await conn.execute(
      `INSERT INTO cities (city_code, name_he, name_en, district, latitude, longitude, is_active)
       VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
      [city.city_code, city.name_he, city.name_en, city.district, city.latitude, city.longitude]
    );
  }

  console.log(`Inserted ${uniqueCities.length} cities`);
  await conn.end();
}

seed().catch(err => {
  console.error("Seed failed:", err);
  process.exit(1);
});
