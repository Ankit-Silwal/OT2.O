/*
  Warnings:

  - Added the required column `Binance` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `Bitcoin` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `Ethereum` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "Binance" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "Bitcoin" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "Ethereum" DOUBLE PRECISION NOT NULL;
