import duckdb
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "db" / "database.duckdb"

DB_PATH.parent.mkdir(parents=True, exist_ok=True)

conn = duckdb.connect(DB_PATH)

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

    # Створюємо таблицю ПЕРЕД тим, як перевіряти колонки
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
    
    print("[DB] lead_status_history table created")

    # Видаляємо _ensure_column для rejection_reason, оскільки вона вже є в CREATE TABLE
    # _ensure_column("lead_status_history", "rejection_reason", "TEXT")
    print("[DB] rejection_reason column already exists in table definition")

    conn.execute("""
    CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
    )
    """)

    conn.execute(
        """
        INSERT INTO app_settings (key, value)
        SELECT * FROM (VALUES
            ('reply_top_block', ?),
            ('reply_bottom_block', ?),
            ('reply_style_official', ?),
            ('reply_style_semi_official', ?),
            ('reply_prompt_follow_up', ?),
            ('reply_prompt_recap', ?),
            ('reply_prompt_quick', ?)
        ) AS defaults(key, value)
        WHERE NOT EXISTS (
            SELECT 1 FROM app_settings WHERE app_settings.key = defaults.key
        )
        """,
        [
            "",
            "",
            "Tone: Official. Write formally, concise, confident, and business-like. Avoid slang or overly casual phrasing.",
            "Tone: Semi-official. Write friendly and professional, slightly warm, but still business appropriate.",
            "Act as a Business Development Manager. Draft a concise follow-up email after an intro call. Use only factual details provided. Keep within 140 words and write in English. The structure must cover: greeting with [NAME]; gratitude referencing [TOPIC DISCUSSED]; phrase 'As promised, I'm sharing [LINK_TO_MATERIAL]'; next steps mentioning [NEXT_CONTACT_DATE]; professional signature placeholder [YOUR_NAME].",
            "Act as a Sales Expert. Prepare a recap & proposal email after a qualification call. Use only supplied information. Keep within 140 words and write in English. The structure must cover: greeting with [CLIENT_NAME]; paragraph recognising pains [CLIENT_PAIN_POINTS]; section describing our solution [SOLUTION_OVERVIEW]; bullet list for three proofs each with [PROJECT_NAME] and [RESULT]; closing call-to-action suggesting [NEXT_STEP].",
            "Act as a Sales Assistant. Write a very short, friendly reply (max 60 words). Keep it clear, warm, and action-oriented. Use only facts from the provided context and do not invent details.",
        ],
    )

init_db()
