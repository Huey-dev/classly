/*
  Warnings:

  - A unique constraint covering the columns `[name,userId]` on the table `Classroom` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Classroom_name_userId_key" ON "Classroom"("name", "userId");
