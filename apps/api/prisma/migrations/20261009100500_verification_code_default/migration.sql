-- AlterTable
ALTER TABLE "EditorProfile" ALTER COLUMN "verificationCode" SET DEFAULT ('PHEME-'::text || upper(substr(md5((random())::text), 1, 6)));
