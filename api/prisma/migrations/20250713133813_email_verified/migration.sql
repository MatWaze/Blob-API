/*
  Warnings:

  - The primary key for the `User` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `is_deleted` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `wallet_address` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `withdraw_amount` on the `User` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "EmailVerified" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nonce" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT NOT NULL,
    CONSTRAINT "EmailVerified_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Participation" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" TEXT NOT NULL,
    "tournamentId" INTEGER NOT NULL,
    "placementId" INTEGER,
    CONSTRAINT "Participation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Participation_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Participation_placementId_fkey" FOREIGN KEY ("placementId") REFERENCES "Placement" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Participation" ("id", "placementId", "tournamentId", "userId") SELECT "id", "placementId", "tournamentId", "userId" FROM "Participation";
DROP TABLE "Participation";
ALTER TABLE "new_Participation" RENAME TO "Participation";
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "walletAddress" TEXT,
    "withdrawAmount" DECIMAL DEFAULT 0.0,
    "isDeleted" BOOLEAN DEFAULT false
);
INSERT INTO "new_User" ("email", "id", "password", "username") SELECT "email", "id", "password", "username" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "EmailVerified_userId_key" ON "EmailVerified"("userId");
