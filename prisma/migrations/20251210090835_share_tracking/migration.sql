-- CreateTable
CREATE TABLE "CourseShareStats" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "instructorId" TEXT NOT NULL,
    "totalClicks" INTEGER NOT NULL DEFAULT 0,
    "totalEnrollments" INTEGER NOT NULL DEFAULT 0,
    "conversionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseShareStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseShareClick" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "instructorId" TEXT NOT NULL,
    "ipHash" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CourseShareClick_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseStudents" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "refInstructorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CourseStudents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CourseShareStats_instructorId_idx" ON "CourseShareStats"("instructorId");

-- CreateIndex
CREATE UNIQUE INDEX "CourseShareStats_courseId_instructorId_key" ON "CourseShareStats"("courseId", "instructorId");

-- CreateIndex
CREATE INDEX "CourseShareClick_courseId_instructorId_createdAt_idx" ON "CourseShareClick"("courseId", "instructorId", "createdAt");

-- CreateIndex
CREATE INDEX "CourseShareClick_courseId_instructorId_ipHash_idx" ON "CourseShareClick"("courseId", "instructorId", "ipHash");

-- CreateIndex
CREATE INDEX "CourseStudents_refInstructorId_idx" ON "CourseStudents"("refInstructorId");

-- CreateIndex
CREATE INDEX "CourseStudents_courseId_idx" ON "CourseStudents"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "CourseStudents_courseId_studentId_key" ON "CourseStudents"("courseId", "studentId");

-- AddForeignKey
ALTER TABLE "CourseShareStats" ADD CONSTRAINT "CourseShareStats_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseShareStats" ADD CONSTRAINT "CourseShareStats_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseShareClick" ADD CONSTRAINT "CourseShareClick_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseShareClick" ADD CONSTRAINT "CourseShareClick_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseStudents" ADD CONSTRAINT "CourseStudents_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseStudents" ADD CONSTRAINT "CourseStudents_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseStudents" ADD CONSTRAINT "CourseStudents_refInstructorId_fkey" FOREIGN KEY ("refInstructorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
