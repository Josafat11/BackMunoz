/*
  Warnings:

  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.

*/
BEGIN TRY

BEGIN TRAN;

-- DropForeignKey
ALTER TABLE [dbo].[LoginHistory] DROP CONSTRAINT [LoginHistory_userId_fkey];

-- DropTable
DROP TABLE [dbo].[User];

-- CreateTable
CREATE TABLE [dbo].[Usuarios] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] NVARCHAR(1000) NOT NULL,
    [lastname] NVARCHAR(1000) NOT NULL,
    [email] NVARCHAR(1000) NOT NULL,
    [telefono] NVARCHAR(1000) NOT NULL,
    [fechadenacimiento] DATETIME2 NOT NULL,
    [user] NVARCHAR(1000) NOT NULL,
    [preguntaSecreta] NVARCHAR(1000) NOT NULL,
    [respuestaSecreta] NVARCHAR(1000) NOT NULL,
    [password] NVARCHAR(1000) NOT NULL,
    [verified] BIT NOT NULL CONSTRAINT [Usuarios_verified_df] DEFAULT 0,
    [role] NVARCHAR(1000) NOT NULL CONSTRAINT [Usuarios_role_df] DEFAULT 'normal',
    [failedLoginAttempts] INT NOT NULL CONSTRAINT [Usuarios_failedLoginAttempts_df] DEFAULT 0,
    [lockedUntil] DATETIME2,
    [blocked] BIT NOT NULL CONSTRAINT [Usuarios_blocked_df] DEFAULT 0,
    [lockCount] INT NOT NULL CONSTRAINT [Usuarios_lockCount_df] DEFAULT 0,
    [lastLogin] DATETIME2,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Usuarios_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Usuarios_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Usuarios_email_key] UNIQUE NONCLUSTERED ([email])
);

-- AddForeignKey
ALTER TABLE [dbo].[LoginHistory] ADD CONSTRAINT [LoginHistory_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[Usuarios]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
