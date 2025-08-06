-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "walletAddress" TEXT,
    "withdrawAmount" DECIMAL DEFAULT 0.0,
    "isDeleted" BOOLEAN DEFAULT false,
    "authMethod" TEXT
);
INSERT INTO "new_User" ("email", "id", "isDeleted", "password", "username", "walletAddress", "withdrawAmount") SELECT "email", "id", "isDeleted", "password", "username", "walletAddress", "withdrawAmount" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
