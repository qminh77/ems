import { sql } from "drizzle-orm";
import { db } from "./db";

export async function ensureAdminCpSchema() {
  await db.execute(sql`
    ALTER TABLE "users"
    ADD COLUMN IF NOT EXISTS "is_admin" boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS "can_create_events" boolean NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS "is_active" boolean NOT NULL DEFAULT true
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "system_settings" (
      "id" integer PRIMARY KEY DEFAULT 1,
      "system_name" varchar(150) NOT NULL DEFAULT 'EMS Platform',
      "system_description" text NOT NULL DEFAULT 'Nen tang quan ly su kien tap trung',
      "contact_email" varchar(255) NOT NULL DEFAULT 'support@example.com',
      "contact_phone" varchar(30) NOT NULL DEFAULT '',
      "logo_url" text,
      "footer_text" text NOT NULL DEFAULT '(c) EMS Platform',
      "registration_enabled" boolean NOT NULL DEFAULT true,
      "created_at" timestamp DEFAULT now(),
      "updated_at" timestamp DEFAULT now()
    )
  `);

  await db.execute(sql`
    INSERT INTO "system_settings" (
      "id",
      "system_name",
      "system_description",
      "contact_email",
      "contact_phone",
      "logo_url",
      "footer_text",
      "registration_enabled"
    )
    VALUES (
      1,
      'EMS Platform',
      'Nen tang quan ly su kien tap trung',
      'support@example.com',
      '',
      NULL,
      '(c) EMS Platform',
      true
    )
    ON CONFLICT ("id") DO NOTHING
  `);
}
