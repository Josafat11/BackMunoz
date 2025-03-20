/*
  Warnings:

  - You are about to drop the column `supplierId` on the `Productos` table. All the data in the column will be lost.
  - You are about to drop the `Proveedores` table. If the table is not empty, all the data it contains will be lost.

*/
BEGIN TRY

BEGIN TRAN;

-- DropForeignKey
ALTER TABLE [dbo].[Productos] DROP CONSTRAINT [Productos_supplierId_fkey];

-- AlterTable
ALTER TABLE [dbo].[Productos] DROP COLUMN [supplierId];

-- DropTable
DROP TABLE [dbo].[Proveedores];

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
