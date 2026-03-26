-- DropForeignKey
ALTER TABLE "Trade" DROP CONSTRAINT "Trade_userId_fkey";

-- AlterTable
ALTER TABLE "Trade" ALTER COLUMN "userId" SET DATA TYPE TEXT;
