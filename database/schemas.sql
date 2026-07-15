-- 1. Utiliser la bonne base de données
USE WhitelistDB;
GO

-- 2. Créer la table de l'historique des imports
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ImportHistory' AND xtype='U')
BEGIN
    CREATE TABLE ImportHistory (
        id INT IDENTITY(1,1) PRIMARY KEY,
        filename NVARCHAR(255) NULL,
        service_no INT DEFAULT 0,
        imported_by NVARCHAR(100) DEFAULT 'system',
        imported_at DATETIME2 DEFAULT GETDATE(),
        status NVARCHAR(50) DEFAULT 'completed',
        records_count INT DEFAULT 0
    );
END;
GO

-- 3. Créer la table de la Whitelist (les numéros autorisés)
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Whitelist' AND xtype='U')
BEGIN
    CREATE TABLE Whitelist (
        id INT IDENTITY(1,1) PRIMARY KEY,
        phone_number NVARCHAR(20) NOT NULL UNIQUE,
        status NVARCHAR(50) DEFAULT 'whitelisted',
        created_at DATETIME2 DEFAULT GETDATE()
    );
    
    -- Création d'un index non-clustered sur le numéro de téléphone pour accélérer les vérifications de l'API
    CREATE INDEX IX_Whitelist_PhoneNumber ON Whitelist(phone_number);
END;
GO

-- 4. Créer la table des Logs d'Audit (historique des modifications unitaires)
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='AuditLogs' AND xtype='U')
BEGIN
    CREATE TABLE AuditLogs (
        id INT IDENTITY(1,1) PRIMARY KEY,
        action_type NVARCHAR(50) NOT NULL,
        phone_number NVARCHAR(20) NOT NULL,
        performed_by NVARCHAR(100) DEFAULT 'system',
        performed_at DATETIME2 DEFAULT GETDATE(),
        details NVARCHAR(MAX) NULL
    );
END;
GO