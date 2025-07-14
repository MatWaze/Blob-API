-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_EmailVerified" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nonce" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT NOT NULL,
    CONSTRAINT "EmailVerified_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_EmailVerified" ("id", "isVerified", "nonce", "userId") SELECT "id", "isVerified", "nonce", "userId" FROM "EmailVerified";
DROP TABLE "EmailVerified";
ALTER TABLE "new_EmailVerified" RENAME TO "EmailVerified";
CREATE UNIQUE INDEX "EmailVerified_userId_key" ON "EmailVerified"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
