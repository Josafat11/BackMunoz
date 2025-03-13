BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[Productos] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] VARCHAR(100) NOT NULL,
    [description] VARCHAR(500) NOT NULL,
    [price] FLOAT(53) NOT NULL CONSTRAINT [Productos_price_df] DEFAULT 0,
    [stock] INT NOT NULL CONSTRAINT [Productos_stock_df] DEFAULT 0,
    [partNumber] NVARCHAR(1000) NOT NULL,
    [category] NVARCHAR(1000) NOT NULL,
    [brand] NVARCHAR(1000) NOT NULL,
    [discount] FLOAT(53) CONSTRAINT [Productos_discount_df] DEFAULT 0,
    [supplierId] INT NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Productos_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Productos_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Productos_partNumber_key] UNIQUE NONCLUSTERED ([partNumber])
);

-- CreateTable
CREATE TABLE [dbo].[Imagenes] (
    [id] INT NOT NULL IDENTITY(1,1),
    [url] NVARCHAR(1000) NOT NULL,
    [productId] INT NOT NULL,
    CONSTRAINT [Imagenes_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Compatibilidad] (
    [id] INT NOT NULL IDENTITY(1,1),
    [make] NVARCHAR(1000) NOT NULL,
    [model] NVARCHAR(1000) NOT NULL,
    [year] INT NOT NULL,
    [engineType] NVARCHAR(1000),
    [productId] INT NOT NULL,
    CONSTRAINT [Compatibilidad_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Proveedores] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [Proveedores_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Logos] (
    [id] INT NOT NULL IDENTITY(1,1),
    [url] NVARCHAR(1000) NOT NULL,
    [fechaSubida] DATETIME2 NOT NULL CONSTRAINT [Logos_fechaSubida_df] DEFAULT CURRENT_TIMESTAMP,
    [autor] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Logos_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Logos_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[TerminosYCondiciones] (
    [id] INT NOT NULL IDENTITY(1,1),
    [title] NVARCHAR(1000) NOT NULL,
    [content] NVARCHAR(1000) NOT NULL,
    [effectiveDate] DATETIME2 NOT NULL,
    [isCurrent] BIT NOT NULL CONSTRAINT [TerminosYCondiciones_isCurrent_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [TerminosYCondiciones_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [TerminosYCondiciones_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[PoliticasDePrivacidad] (
    [id] INT NOT NULL IDENTITY(1,1),
    [title] NVARCHAR(1000) NOT NULL,
    [content] NVARCHAR(1000) NOT NULL,
    [effectiveDate] DATETIME2 NOT NULL,
    [isCurrent] BIT NOT NULL CONSTRAINT [PoliticasDePrivacidad_isCurrent_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [PoliticasDePrivacidad_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [PoliticasDePrivacidad_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[DeslindeDeResponsabilidad] (
    [id] INT NOT NULL IDENTITY(1,1),
    [title] NVARCHAR(1000) NOT NULL,
    [content] NVARCHAR(1000) NOT NULL,
    [effectiveDate] DATETIME2 NOT NULL,
    [isCurrent] BIT NOT NULL CONSTRAINT [DeslindeDeResponsabilidad_isCurrent_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [DeslindeDeResponsabilidad_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [DeslindeDeResponsabilidad_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- AddForeignKey
ALTER TABLE [dbo].[Productos] ADD CONSTRAINT [Productos_supplierId_fkey] FOREIGN KEY ([supplierId]) REFERENCES [dbo].[Proveedores]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Imagenes] ADD CONSTRAINT [Imagenes_productId_fkey] FOREIGN KEY ([productId]) REFERENCES [dbo].[Productos]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Compatibilidad] ADD CONSTRAINT [Compatibilidad_productId_fkey] FOREIGN KEY ([productId]) REFERENCES [dbo].[Productos]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
