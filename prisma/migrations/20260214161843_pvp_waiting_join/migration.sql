-- AlterEnum
ALTER TYPE "BattleStatus" ADD VALUE 'WAITING';

-- DropForeignKey
ALTER TABLE "Battle" DROP CONSTRAINT "Battle_opponentCharacterId_fkey";

-- AlterTable
ALTER TABLE "Battle" ALTER COLUMN "opponentCharacterId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Battle" ADD CONSTRAINT "Battle_opponentCharacterId_fkey" FOREIGN KEY ("opponentCharacterId") REFERENCES "Character"("id") ON DELETE SET NULL ON UPDATE CASCADE;
