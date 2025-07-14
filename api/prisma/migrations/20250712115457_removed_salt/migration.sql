/*
  Warnings:

  - You are about to drop the column `salt` on the `User` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "wallet_address" TEXT,
    "withdraw_amount" DECIMAL DEFAULT 0.0,
    "is_deleted" BOOLEAN DEFAULT false
);
INSERT INTO "new_User" ("email", "id", "is_deleted", "password", "username", "wallet_address", "withdraw_amount") SELECT "email", "id", "is_deleted", "password", "username", "wallet_address", "withdraw_amount" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
