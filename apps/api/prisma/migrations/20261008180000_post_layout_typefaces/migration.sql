-- CreateEnum
CREATE TYPE "PostLayout" AS ENUM ('TEXT_FIRST', 'MEDIA_FIRST');

-- CreateEnum
CREATE TYPE "Typeface" AS ENUM ('SANS', 'SERIF', 'MONO');

-- AlterEnum
ALTER TYPE "Theme" ADD VALUE 'OTHER';

-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "bodyTypeface" "Typeface" NOT NULL DEFAULT 'SERIF',
ADD COLUMN     "layout" "PostLayout" NOT NULL DEFAULT 'TEXT_FIRST',
ADD COLUMN     "summaryTypeface" "Typeface" NOT NULL DEFAULT 'SANS',
ADD COLUMN     "titleTypeface" "Typeface" NOT NULL DEFAULT 'SERIF';
