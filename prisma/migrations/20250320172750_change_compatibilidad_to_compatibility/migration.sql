/*
  Warnings:

  - You are about to drop the `Compatibilidad` table. If the table is not empty, all the data it contains will be lost.

*/
BEGIN TRY

BEGIN TRAN;

-- DropForeignKey
ALTER TABLE [dbo].[Compatibilidad] DROP CONSTRAINT [Compatibilidad_productId_fkey];

-- DropTable
DROP TABLE [dbo].[Compatibilidad];

-- CreateTable
CREATE TABLE [dbo].[Compatibility] (
    [id] INT NOT NULL IDENTITY(1,1),
    [make] NVARCHAR(1000),
    [model] NVARCHAR(1000),
    [year] INT,
    [engineType] NVARCHAR(1000),
    [productId] INT NOT NULL,
    CONSTRAINT [Compatibility_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- AddForeignKey
ALTER TABLE [dbo].[Compatibility] ADD CONSTRAINT [Compatibility_productId_fkey] FOREIGN KEY ([productId]) REFERENCES [dbo].[Productos]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
