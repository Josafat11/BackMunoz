BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[Sales] (
    [id] INT NOT NULL IDENTITY(1,1),
    [productId] INT NOT NULL,
    [quantity] INT NOT NULL CONSTRAINT [Sales_quantity_df] DEFAULT 1,
    [salePrice] FLOAT(53) NOT NULL,
    [total] FLOAT(53) NOT NULL,
    [saleDate] DATETIME2 NOT NULL CONSTRAINT [Sales_saleDate_df] DEFAULT CURRENT_TIMESTAMP,
    [customerId] INT,
    CONSTRAINT [Sales_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- AddForeignKey
ALTER TABLE [dbo].[Sales] ADD CONSTRAINT [Sales_productId_fkey] FOREIGN KEY ([productId]) REFERENCES [dbo].[Productos]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
