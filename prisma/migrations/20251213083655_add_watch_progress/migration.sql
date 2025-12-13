-- CreateTable
CREATE TABLE "CourseWatchProgress" (
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "watchedSeconds" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseWatchProgress_pkey" PRIMARY KEY ("userId","courseId")
);

-- CreateIndex
CREATE INDEX "CourseWatchProgress_courseId_idx" ON "CourseWatchProgress"("courseId");

-- CreateIndex
CREATE INDEX "CourseWatchProgress_userId_idx" ON "CourseWatchProgress"("userId");

-- AddForeignKey
ALTER TABLE "CourseWatchProgress" ADD CONSTRAINT "CourseWatchProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseWatchProgress" ADD CONSTRAINT "CourseWatchProgress_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
