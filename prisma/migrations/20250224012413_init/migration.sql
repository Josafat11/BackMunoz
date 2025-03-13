BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[User] (
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
    [verified] BIT NOT NULL CONSTRAINT [User_verified_df] DEFAULT 0,
    [role] NVARCHAR(1000) NOT NULL CONSTRAINT [User_role_df] DEFAULT 'normal',
    [failedLoginAttempts] INT NOT NULL CONSTRAINT [User_failedLoginAttempts_df] DEFAULT 0,
    [lockedUntil] DATETIME2,
    [blocked] BIT NOT NULL CONSTRAINT [User_blocked_df] DEFAULT 0,
    [lockCount] INT NOT NULL CONSTRAINT [User_lockCount_df] DEFAULT 0,
    [lastLogin] DATETIME2,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [User_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [User_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [User_email_key] UNIQUE NONCLUSTERED ([email])
);

-- CreateTable
CREATE TABLE [dbo].[LoginHistory] (
    [id] INT NOT NULL IDENTITY(1,1),
    [loginDate] DATETIME2 NOT NULL CONSTRAINT [LoginHistory_loginDate_df] DEFAULT CURRENT_TIMESTAMP,
    [userId] INT NOT NULL,
    CONSTRAINT [LoginHistory_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- AddForeignKey
ALTER TABLE [dbo].[LoginHistory] ADD CONSTRAINT [LoginHistory_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
