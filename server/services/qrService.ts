import { storage } from "../storage.js";

function generateUniqueQRCode(): string {
  const randomNumber = Math.floor(Math.random() * 10_000_000_000)
    .toString()
    .padStart(10, "0");
  return `CK_${randomNumber}`;
}

export async function ensureUniqueQRCode(): Promise<string> {
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const qrCode = generateUniqueQRCode();
    const existing = await storage.getAttendeeByQrCode(qrCode);
    if (!existing) {
      return qrCode;
    }
    attempts += 1;
  }

  return `CK_${Date.now()}`;
}
