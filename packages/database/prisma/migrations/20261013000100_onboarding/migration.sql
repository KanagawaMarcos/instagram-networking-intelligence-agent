CREATE TABLE "ApplicationSetting" (
  "userId" TEXT NOT NULL,
  "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
  "onboardingMode" TEXT,
  "connectedAccount" JSONB,
  "completedAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ApplicationSetting_pkey" PRIMARY KEY ("userId")
);

ALTER TABLE "ApplicationSetting" ADD CONSTRAINT "ApplicationSetting_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
