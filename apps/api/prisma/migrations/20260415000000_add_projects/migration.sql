-- CreateTable projects
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey projects → companies
ALTER TABLE "projects" ADD CONSTRAINT "projects_company_id_fkey"
    FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey projects → users
ALTER TABLE "projects" ADD CONSTRAINT "projects_created_by_id_fkey"
    FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "projects_company_id_name_idx" ON "projects"("company_id", "name");

-- AddColumn project_id to requisitions (nullable for backwards compat)
ALTER TABLE "requisitions" ADD COLUMN "project_id" TEXT;

-- AddForeignKey requisitions → projects
ALTER TABLE "requisitions" ADD CONSTRAINT "requisitions_project_id_fkey"
    FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
