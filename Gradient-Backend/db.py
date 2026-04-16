import duckdb
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "db" / "database.duckdb"

DB_PATH.parent.mkdir(parents=True, exist_ok=True)

conn = duckdb.connect(str(DB_PATH))

def _ensure_column(table: str, column: str, definition: str) -> None:
    exists = conn.execute(
        """
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = ? AND column_name = ?
        """,
        [table, column],
    ).fetchone()
    if not exists:
        conn.execute(f"ALTER TABLE {table} ADD COLUMN {column} {definition}")

def init_db():
    print("[DB] Initializing database...")
    
    conn.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        email TEXT NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'manager' CHECK (role IN ('admin', 'manager'))
    )
    """)

    conn.execute("""
    CREATE TABLE IF NOT EXISTS processed_emails (
        gmail_id TEXT PRIMARY KEY,
        processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    conn.execute("""
    CREATE TABLE IF NOT EXISTS gmail_messages (
        gmail_id TEXT PRIMARY KEY,
        status TEXT,
        first_name TEXT,
        last_name TEXT,
        full_name TEXT,
        email TEXT,
        subject TEXT,
        received_at TEXT,
        company TEXT,
        body TEXT,
        phone TEXT,
        website TEXT,
        company_name TEXT,
        company_info TEXT,
        person_role TEXT,
        person_links TEXT,
        person_location TEXT,
        person_experience TEXT,
        person_summary TEXT,
        person_insights TEXT,
        company_insights TEXT,
        is_priority BOOLEAN DEFAULT FALSE,
        pending_review BOOLEAN DEFAULT FALSE,
        preprocessing_status TEXT DEFAULT 'idle',
        preprocessed_replies TEXT,
        preprocessed_at TIMESTAMP,
        assigned_to INTEGER,
        assigned_at TIMESTAMP,
        synced_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (assigned_to) REFERENCES users (id)
    )
    """)

    _ensure_column("gmail_messages", "is_priority", "BOOLEAN DEFAULT FALSE")
    _ensure_column("gmail_messages", "pending_review", "BOOLEAN DEFAULT FALSE")
    _ensure_column("gmail_messages", "preprocessing_status", "TEXT DEFAULT 'idle'")
    _ensure_column("gmail_messages", "preprocessed_replies", "TEXT")
    _ensure_column("gmail_messages", "preprocessed_at", "TIMESTAMP")

    # Створюємо таблицю lead_status_history з rejection_reason всередині
    conn.execute("""
    CREATE TABLE IF NOT EXISTS lead_status_history (
        id TEXT PRIMARY KEY,
        gmail_id TEXT NOT NULL,
        changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        lead_name TEXT,
        status TEXT NOT NULL,
        assignee TEXT,
        rejection_reason TEXT,
        FOREIGN KEY (gmail_id) REFERENCES gmail_messages (gmail_id)
    )
    """)
    
    print("[DB] lead_status_history table created with rejection_reason column")

    conn.execute("""
    CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
    )
    """)

    conn.execute(
        """
        INSERT INTO app_settings (key, value)
        VALUES 
            ('reply_style', 'semi_official'),
            ('auto_sync_enabled', 'true'),
            ('sync_interval_minutes', '5')
        ON CONFLICT (key) DO NOTHING
        """
    )

    conn.commit()
    print("[DB] Database initialization completed successfully!")

# Initialize database immediately
init_db()
