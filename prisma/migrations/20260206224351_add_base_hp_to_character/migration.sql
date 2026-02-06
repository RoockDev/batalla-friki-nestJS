/*
  Warnings:

  - Added the required column `baseHp` to the `Character` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Character" ADD COLUMN     "baseHp" INTEGER NOT NULL;
