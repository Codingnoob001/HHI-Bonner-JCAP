import os
import pandas as pd
import sqlite3
import time
import logging
from dotenv import load_dotenv

logging.basicConfig(
    filename='patient_data_import.log',
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

# Constants for performance tuning
BATCH_SIZE = 100
MAX_RETRY_ATTEMPTS = 3
RETRY_DELAY_BASE = 0.5
BIRTHDATE_BATCH_SIZE = 50


load_dotenv()
EXCEL_FILES = os.getenv("EXCEL_FILES", "").split(",")
DB_FILE = os.getenv("DB_FILE", "../database/patient_records.db")


def execute_with_retry(cursor, query, params=None, is_many=False, max_attempts=MAX_RETRY_ATTEMPTS):
    for attempt in range(max_attempts):
        try:
            if is_many:
                return cursor.executemany(query, params)
            else:
                return cursor.execute(query, params if params is not None else [])
        except sqlite3.OperationalError as e:
            if "database is locked" in str(e) and attempt < max_attempts - 1:
                delay = RETRY_DELAY_BASE * (2 ** attempt)  # Exponential backoff
                logging.warning(f"Database locked, retrying in {delay:.2f}s (attempt {attempt + 1}/{max_attempts})")
                time.sleep(delay)
                continue
            raise


def migrate_database():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    try:
        # Start a transaction
        cursor.execute("BEGIN TRANSACTION")

        # Add visit_time column if it doesn't exist
        cursor.execute("PRAGMA table_info(patient_visits)")
        columns = [column[1] for column in cursor.fetchall()]

        if 'visit_time' not in columns:
            print("Adding visit_time column to patient_visits table...")
            cursor.execute("ALTER TABLE patient_visits ADD COLUMN visit_time TEXT;")
            cursor.execute("UPDATE patient_visits SET visit_time = '12:00' WHERE visit_time IS NULL;")
        else:
            print("visit_time column already exists in patient_visits table")

        # Add height column if it doesn't exist
        cursor.execute("PRAGMA table_info(patients)")
        columns = [column[1] for column in cursor.fetchall()]

        if 'height' not in columns:
            print("Adding height column to patients table...")
            cursor.execute("ALTER TABLE patients ADD COLUMN height FLOAT;")

            # Populate height data from patient_visits
            cursor.execute("""
                    UPDATE patients
                    SET height = (
                        SELECT height
                        FROM patient_visits
                        WHERE patient_visits.client_id = patients.client_id
                        AND height IS NOT NULL
                        ORDER BY visit_date
                        LIMIT 1
                    )
                """)

            # Check how many patients got height values
            cursor.execute("SELECT COUNT(*) FROM patients WHERE height IS NOT NULL")
            patients_with_height = cursor.fetchone()[0]

            cursor.execute("SELECT COUNT(*) FROM patients")
            total_patients = cursor.fetchone()[0]

            print(
                f"Height data migrated: {patients_with_height} out of {total_patients} patients updated with height values")
        else:
            print("height column already exists in patients table")
        # Add visit_id column if it doesn't exist
        cursor.execute("PRAGMA table_info(patients_goals)")
        columns = [column[1] for column in cursor.fetchall()]

        if 'visit_id' not in columns:
            print("Adding visit_id column to patients_goals table...")
            cursor.execute("ALTER TABLE patients_goals ADD COLUMN visit_id INTEGER;")
        else:
            print("visit_id column already exists in patients_goals table")

        # Create index if it doesn't exist
        cursor.execute("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_patient_visits_date_time'")
        if not cursor.fetchone():
            print("Creating index on patient_visits(visit_date, visit_time)...")
            cursor.execute(
                "CREATE INDEX idx_patient_visits_date_time ON patient_visits(visit_date, visit_time)")
        else:
            print("Index idx_patient_visits_date_time already exists")

        # Link existing goals to visits with better error handling
        print("Linking existing goals to visits...")
        cursor.execute("""
            UPDATE patients_goals
            SET visit_id = (
                SELECT id 
                FROM patient_visits 
                WHERE patient_visits.client_id = patients_goals.client_id 
                AND patient_visits.visit_date = patients_goals.visit_date
                LIMIT 1
            )
            WHERE visit_id IS NULL
        """)

        # Verify if the linking worked
        cursor.execute("SELECT COUNT(*) FROM patients_goals WHERE visit_id IS NULL")
        unlinked_count = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM patients_goals")
        total_count = cursor.fetchone()[0]

        if unlinked_count > 0:
            print(f"Warning: {unlinked_count} out of {total_count} goals could not be linked to visits")
        else:
            print(f"Success: All {total_count} goals linked to corresponding visits")

        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='activity_log'")
        if not cursor.fetchone():
            print("Creating activity_log table...")
            cursor.execute('''
                    CREATE TABLE IF NOT EXISTS activity_log (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        activity_type TEXT NOT NULL,
                        entity_type TEXT NOT NULL,
                        entity_id TEXT NOT NULL,
                        entity_name TEXT,
                        timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
                        additional_info TEXT
                    )
                    ''')
        else:
            print("activity_log table already exists")

        # Commit the transaction
        conn.commit()
        print("Migration completed successfully!")
    except Exception as e:
        conn.rollback()
        print(f"ERROR during migration: {str(e)}")
    finally:
        conn.close()


conn = sqlite3.connect(DB_FILE)
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

execute_with_retry(cursor, "PRAGMA journal_mode=WAL")
execute_with_retry(cursor, "PRAGMA synchronous=NORMAL")

# Create tables if they don't exist
execute_with_retry(cursor, '''
CREATE TABLE IF NOT EXISTS patients (
    client_id TEXT PRIMARY KEY,
    first_name TEXT,
    last_name TEXT,
    gender TEXT,
    age INTEGER,
    race TEXT,
    primary_lang TEXT,
    insurance TEXT,
    phone TEXT,
    zipcode TEXT,
    first_visit_date TEXT,
    birthdate TEXT,
    height FLOAT

);
''')

execute_with_retry(cursor, '''
CREATE TABLE IF NOT EXISTS activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    activity_type TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    entity_name TEXT,
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
    additional_info TEXT
);
''')

execute_with_retry(cursor, '''
CREATE TABLE IF NOT EXISTS patient_visits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id TEXT,
    visit_date TEXT,
    event_type TEXT,
    referral_source TEXT,
    follow_up TEXT,
    hra TEXT,
    edu TEXT,
    case_management TEXT,
    systolic INTEGER,
    diastolic INTEGER,
    cholesterol INTEGER,
    fasting TEXT,
    glucose INTEGER,
    height FLOAT,
    weight FLOAT,
    bmi FLOAT,
    a1c FLOAT,
    acquired_by TEXT,
    FOREIGN KEY (client_id) REFERENCES patients(client_id)
);
''')

goals_mapping = {
    "INCREASED DAILY FRUIT/ VEGETABLE PORTIONS": "increased_fruit_veg",
    "INCREASE DAILY WATER INTAKE": "increased_water",
    "INCREASED WEEKLY EXERCISE": "increased_exercise",
    "CUT TV VIEWING TO < 2 HOURS/ DAY": "cut_tv_viewing",
    "EAT BREAKFAST DAILY": "eat_breakfast",
    "LIMIT DAILY ALCOHOL CONSUMPTION WOMAN =1, MAN=2": "limit_alcohol",
    "DO NOT EAT AT LEAST 3 HOURS BEFORE GOING TO BED": "no_late_eating",
    "EATS MORE WHOLE WHEAT/ GRAINS DAILY": "more_whole_grains",
    "EATS LESS FRIED FOODS OR MEATS": "less_fried_foods",
    "DRINKS LOW FAT OR SKIM MILK": "low_fat_milk",
    "LOWERED SALT INTAKE": "lower_salt",
    "RECEIVE AN ANNUAL CHECK-UP": "annual_checkup",
    "QUIT SMOKING": "quit_smoking"
}

execute_with_retry(cursor, f'''
CREATE TABLE IF NOT EXISTS patients_goals (
    client_id TEXT,
    visit_date TEXT,
    {", ".join([f"{goal} INTEGER" for goal in goals_mapping.values()])},
    PRIMARY KEY (client_id, visit_date),
    FOREIGN KEY (client_id) REFERENCES patients(client_id)
);
''')

conn.commit()

# Run the database migration before processing any files
print("\nStarting database migration to add visit_time and link goals to visits...")
migrate_database()
print("Migration completed. Beginning to process files...")

def extract_birthdate(client_id):
    if client_id and len(client_id) >= 8:
        birthdate_part = client_id[-6:]
        if birthdate_part.isdigit():
            month = birthdate_part[0:2]
            day = birthdate_part[2:4]
            year = birthdate_part[4:6]
            return f"{month}/{day}/{year}"
    return None


execute_with_retry(cursor, "SELECT client_id, birthdate FROM patients WHERE birthdate IS NOT NULL")
existing_birthdates = {row["client_id"]: row["birthdate"] for row in cursor.fetchall()}
logging.info(f"Loaded {len(existing_birthdates)} existing birthdates from database")

birthdate_batch = []


def process_birthdate(client_id):
    global birthdate_batch
    if client_id in existing_birthdates:
        return
    birthdate = extract_birthdate(client_id)
    if birthdate:
        birthdate_batch.append((birthdate, client_id))
        existing_birthdates[client_id] = birthdate
        if len(birthdate_batch) >= BIRTHDATE_BATCH_SIZE:
            flush_birthdate_batch()


def flush_birthdate_batch():
    global birthdate_batch
    if not birthdate_batch:
        return
    try:
        execute_with_retry(cursor,
                           "UPDATE patients SET birthdate = ? WHERE client_id = ?",
                           birthdate_batch,
                           is_many=True)
        logging.info(f"Updated {len(birthdate_batch)} patient birthdates")
        birthdate_batch = []
    except Exception as e:
        logging.error(f"Error updating birthdates: {str(e)}")

conn.commit()

file_count = len(EXCEL_FILES)
for file_index, excel_file in enumerate(EXCEL_FILES):
    logging.info(f"Processing file {file_index + 1}/{file_count}: {excel_file}")
    print(f"Processing {excel_file}... ({file_index + 1}/{file_count})")

    try:
        # Begin transaction for this file
        execute_with_retry(cursor, "BEGIN TRANSACTION")

        # Read and process Excel file
        xls = pd.ExcelFile(excel_file)
        client_list_df = pd.read_excel(xls, sheet_name="CLIENT LIST")
        client_list_df.columns = client_list_df.columns.str.replace(r'\s+', ' ', regex=True).str.strip()

        # Map original column names to our DB field names
        column_mapping = {
            "CLIENT ID": "client_id",
            "FIRST NAME": "first_name",
            "LAST NAME": "last_name",
            "MALE/ FEMALE": "gender",
            "AGE": "age",
            "RACE": "race",
            "Primary Language": "primary_lang",
            "Insurance": "insurance",
            "PHONE": "phone",
            "ZIPCODE": "zipcode",
            "EVENT TYPE": "event_type",
            "How did you find program": "referral_source",
            "First Screen Date": "first_screen_date",
            "Follow-Up": "follow_up",
            "DATE": "visit_date",
            "AQUIRED BY": "acquired_by",
            "HRA": "hra",
            "EDU": "edu",
            "Case Management": "case_management"
        }

        old_health_metrics = {
            "SYSTOLIC": "systolic",
            "DIASTOLIC": "diastolic",
            "Cholesterol": "cholesterol",
            "FASTING": "fasting",
            "GLUCOSE": "glucose",
            "HEIGHT (in)": "height",
            "WEIGHT": "weight",
            "BMI": "bmi",
            "A1C": "a1c"
        }

        new_health_metrics = {
            "NEW SYSTOLIC": "systolic",
            "NEW DIASTOLIC": "diastolic",
            "NEW CHOLESTEROL": "cholesterol",
            "FASTING.1": "fasting",
            "NEW GLUCOSE": "glucose",
            "NEW WEIGHT": "weight",
            "NEW BMI": "bmi",
            "A1C.1": "a1c"
        }

        # Process goals
        for goal, col_name in goals_mapping.items():
            if goal in client_list_df.columns:
                client_list_df[col_name] = client_list_df[goal].apply(
                    lambda x: 1 if str(x).strip().upper() == "X" else 0)
            else:
                client_list_df[col_name] = 0

        # Clean up and transform the dataframe
        all_columns = list(column_mapping.keys()) + list(old_health_metrics.keys()) + list(
            new_health_metrics.keys()) + list(goals_mapping.values())
        client_list_df = client_list_df[all_columns].rename(columns={**column_mapping, **old_health_metrics})
        client_list_df = client_list_df.dropna(subset=["client_id"])
        client_list_df["gender"] = client_list_df["gender"].str.strip().replace({"M": "Male", "F": "Female"})
        client_list_df["follow_up"] = client_list_df["follow_up"].astype(str).replace({"nan": None, "NaN": None})
        client_list_df["fasting"] = client_list_df["fasting"].astype(str).replace({"nan": None, "NaN": None})

        # Convert numeric fields
        integer_fields = ["age", "systolic", "diastolic", "cholesterol", "glucose"]
        float_fields = ["height", "weight", "bmi", "a1c"]
        for field in integer_fields:
            client_list_df[field] = pd.to_numeric(client_list_df[field], errors='coerce').where(
                pd.notna(client_list_df[field]), None)
        for field in float_fields:
            client_list_df[field] = pd.to_numeric(client_list_df[field], errors='coerce').round(1).where(
                pd.notna(client_list_df[field]), None)

        # Clean string fields
        client_list_df["phone"] = client_list_df["phone"].astype(str).str.replace(r'\.0$', '', regex=True).replace(
            {"nan": None, "NaN": None})
        client_list_df["zipcode"] = client_list_df["zipcode"].astype(str).str.replace(r'\.0$', '', regex=True).replace(
            {"nan": None, "NaN": None})

        # Format dates
        for date_col in ["visit_date", "first_screen_date"]:
            client_list_df[date_col] = pd.to_datetime(client_list_df[date_col], errors='coerce').dt.strftime('%Y-%m-%d')
            client_list_df[date_col] = client_list_df[date_col].where(pd.notna(client_list_df[date_col]), None)

        # Convert to dictionary records
        patient_records = client_list_df.where(pd.notna(client_list_df), None).to_dict(orient="records")
        total_records = len(patient_records)
        logging.info(f"Found {total_records} patient records in {excel_file}")

        # Initialize batch containers
        patient_batch = []
        patient_visit_first_screen_batch = []
        patient_visit_current_batch = []
        goals_batch = []

        # Process each patient record
        for i, row in enumerate(patient_records):
            client_id = row["client_id"]
            process_birthdate(client_id)

            # Handle case where Date is empty but First Screen Date exists
            # This indicates a first visit where the same values may be entered in both regular and "NEW" fields
            if row["first_screen_date"] and (row["visit_date"] is None or pd.isna(row["visit_date"])):
                # If this is a first visit (no visit_date), use first_screen_date as the visit_date
                row["visit_date"] = row["first_screen_date"]

            # Update birthdate if needed
            if client_id not in existing_birthdates:
                birthdate = extract_birthdate(client_id)
                if birthdate:
                    execute_with_retry(cursor, "UPDATE patients SET birthdate = ? WHERE client_id = ?",
                                       (birthdate, client_id))
                    existing_birthdates[client_id] = birthdate

            # Add patient data to batch
            patient_data = tuple(row.get(col) for col in ["client_id", "first_name", "last_name", "gender", "age",
                                                          "race", "primary_lang", "insurance", "phone", "zipcode",
                                                          "first_screen_date"]) + (row.get("height"),)
            patient_batch.append(patient_data)

            # Add goals data to batch if visit_date exists
            if row["visit_date"]:
                goals_data = (row["client_id"], row["visit_date"]) + tuple(
                    row.get(col) for col in goals_mapping.values())
                goals_batch.append(goals_data)

            # 1. CREATE/UPDATE RECORD FOR FIRST SCREEN DATE (with original health metrics ONLY)
            if row["first_screen_date"]:
                # For first screen date, we only include health metrics - no event data
                first_screen_visit_data = [
                    client_id, row["first_screen_date"],
                    None, None, None,  # event_type, referral_source, follow_up set to None
                    None, None, None,  # hra, edu, case_management set to None
                    row.get("systolic"), row.get("diastolic"), row.get("cholesterol"),
                    row.get("fasting"), row.get("glucose"), row.get("height"), row.get("weight"),
                    row.get("bmi"), row.get("a1c"), None  # acquired_by set to None
                ]
                patient_visit_first_screen_batch.append(tuple(first_screen_visit_data))

            # 2. CREATE RECORD FOR CURRENT VISIT DATE (with NEW health metrics AND event data)
            if row["visit_date"]:
                # Extract new health metrics from the row
                has_new_metrics = False
                new_systolic = pd.to_numeric(row.get("NEW SYSTOLIC"), errors='coerce')
                new_diastolic = pd.to_numeric(row.get("NEW DIASTOLIC"), errors='coerce')
                new_cholesterol = pd.to_numeric(row.get("NEW CHOLESTEROL"), errors='coerce')
                new_fasting = row.get("FASTING.1")
                new_glucose = pd.to_numeric(row.get("NEW GLUCOSE"), errors='coerce')
                new_weight = pd.to_numeric(row.get("NEW WEIGHT"), errors='coerce')
                new_bmi = pd.to_numeric(row.get("NEW BMI"), errors='coerce')
                new_a1c = pd.to_numeric(row.get("A1C.1"), errors='coerce')

                # For first visits where visit_date equals first_screen_date:
                # If NEW fields are empty but regular fields have data, use regular field values
                first_visit = row["visit_date"] == row["first_screen_date"]

                if first_visit:
                    if pd.isna(new_systolic) and not pd.isna(row.get("systolic")):
                        new_systolic = row.get("systolic")
                    if pd.isna(new_diastolic) and not pd.isna(row.get("diastolic")):
                        new_diastolic = row.get("diastolic")
                    if pd.isna(new_cholesterol) and not pd.isna(row.get("cholesterol")):
                        new_cholesterol = row.get("cholesterol")
                    if (not new_fasting or new_fasting == "nan") and row.get("fasting") and row.get("fasting") != "nan":
                        new_fasting = row.get("fasting")
                    if pd.isna(new_glucose) and not pd.isna(row.get("glucose")):
                        new_glucose = row.get("glucose")
                    if pd.isna(new_weight) and not pd.isna(row.get("weight")):
                        new_weight = row.get("weight")
                    if pd.isna(new_bmi) and not pd.isna(row.get("bmi")):
                        new_bmi = row.get("bmi")
                    if pd.isna(new_a1c) and not pd.isna(row.get("a1c")):
                        new_a1c = row.get("a1c")

                # Check if we have any new metrics
                if (pd.notna(new_systolic) or pd.notna(new_diastolic) or pd.notna(new_cholesterol) or
                        (new_fasting and new_fasting != "nan") or pd.notna(new_glucose) or
                        pd.notna(new_weight) or pd.notna(new_bmi) or pd.notna(new_a1c)):
                    has_new_metrics = True

                # Format numeric values
                if pd.notna(new_systolic): new_systolic = int(new_systolic)
                if pd.notna(new_diastolic): new_diastolic = int(new_diastolic)
                if pd.notna(new_cholesterol): new_cholesterol = int(new_cholesterol)
                if pd.notna(new_glucose): new_glucose = int(new_glucose)
                if pd.notna(new_weight): new_weight = round(float(new_weight), 1)
                if pd.notna(new_bmi): new_bmi = round(float(new_bmi), 1)
                if pd.notna(new_a1c): new_a1c = round(float(new_a1c), 1)

                # For current visit date, include BOTH event data AND new health metrics
                current_visit_data = [
                    client_id, row["visit_date"],
                    row.get("event_type"), row.get("referral_source"), row.get("follow_up"),
                    row.get("hra"), row.get("edu"), row.get("case_management"),
                    new_systolic if pd.notna(new_systolic) else None,
                    new_diastolic if pd.notna(new_diastolic) else None,
                    new_cholesterol if pd.notna(new_cholesterol) else None,
                    new_fasting if new_fasting and new_fasting != "nan" else None,
                    new_glucose if pd.notna(new_glucose) else None,
                    row.get("height"),  # Height assumed to be the same as first visit
                    new_weight if pd.notna(new_weight) else None,
                    new_bmi if pd.notna(new_bmi) else None,
                    new_a1c if pd.notna(new_a1c) else None,
                    row.get("acquired_by")
                ]

                # Only add to batch if:
                # 1. It's different from first_screen_date, OR
                # 2. We have new health metrics, OR
                # 3. We have event data
                has_event_data = any(current_visit_data[2:8])  # Check if any event data fields are non-None

                if row["visit_date"] != row["first_screen_date"] or has_new_metrics or has_event_data:
                    patient_visit_current_batch.append(tuple(current_visit_data))

            # Process batches when they reach the batch size or at the end of records
            if len(patient_batch) >= BATCH_SIZE or i == total_records - 1:
                if patient_batch:
                    # Insert/update patients
                    execute_with_retry(cursor, '''
                        INSERT INTO patients (client_id, first_name, last_name, gender, age, race, primary_lang, 
                                            insurance, phone, zipcode, first_visit_date, height)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        ON CONFLICT(client_id) DO UPDATE SET
                            first_name = excluded.first_name,
                            last_name = excluded.last_name,
                            gender = excluded.gender,
                            age = excluded.age,
                            race = excluded.race,
                            primary_lang = excluded.primary_lang,
                            insurance = excluded.insurance,
                            phone = excluded.phone,
                            zipcode = excluded.zipcode,
                            first_visit_date = COALESCE(patients.first_visit_date, excluded.first_visit_date),
                            height = COALESCE(patients.height, excluded.height);
                    ''', patient_batch, is_many=True)
                    patient_batch = []

                if goals_batch:
                    # Insert/update goals
                    execute_with_retry(cursor, f'''
                        INSERT INTO patients_goals (client_id, visit_date, {", ".join(goals_mapping.values())})
                        VALUES (?, ?, {", ".join(["?" for _ in goals_mapping])})
                        ON CONFLICT(client_id, visit_date) DO UPDATE SET
                        {", ".join([f"{goal} = excluded.{goal}" for goal in goals_mapping.values()])};
                    ''', goals_batch, is_many=True)
                    goals_batch = []

                # Process first screen visit records in batch
                if patient_visit_first_screen_batch:
                    # First, find which of these records already exist
                    client_visit_pairs = [(record[0], record[1]) for record in patient_visit_first_screen_batch]
                    existing_visits = {}

                    # Check in smaller chunks to avoid too many parameters
                    for chunk_start in range(0, len(client_visit_pairs), 100):
                        chunk = client_visit_pairs[chunk_start:chunk_start + 100]
                        placeholders = ", ".join(["(?, ?)"] * len(chunk))
                        params = [param for pair in chunk for param in pair]

                        query = f'''
                            SELECT client_id, visit_date 
                            FROM patient_visits 
                            WHERE (client_id, visit_date) IN ({placeholders})
                        '''
                        execute_with_retry(cursor, query, params)
                        for row in cursor.fetchall():
                            existing_visits[(row["client_id"], row["visit_date"])] = True

                    # Separate records into new inserts and updates
                    records_to_insert = []

                    for record in patient_visit_first_screen_batch:
                        client_id, visit_date = record[0], record[1]
                        if (client_id, visit_date) not in existing_visits:
                            records_to_insert.append(record)
                        else:
                            # For existing records, update only health metrics fields
                            health_fields = ["systolic", "diastolic", "cholesterol", "fasting",
                                             "glucose", "height", "weight", "bmi", "a1c"]
                            update_fields = []
                            update_values = []

                            for i, field in enumerate(health_fields):
                                if record[i + 8] is not None:  # +8 to skip the event data fields
                                    update_fields.append(f"{field} = ?")
                                    update_values.append(record[i + 8])

                            if update_fields:
                                update_values.extend([client_id, visit_date])
                                execute_with_retry(cursor, f'''
                                    UPDATE patient_visits 
                                    SET {', '.join(update_fields)} 
                                    WHERE client_id = ? AND visit_date = ?
                                ''', update_values)

                    # Batch insert new records
                    if records_to_insert:
                        execute_with_retry(cursor, '''
                            INSERT INTO patient_visits (
                                client_id, visit_date, event_type, referral_source, follow_up,
                                hra, edu, case_management,
                                systolic, diastolic, cholesterol, fasting, glucose, height, weight, bmi, a1c,
                                acquired_by, visit_time
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '12:00')
                        ''', records_to_insert, is_many=True)

                    patient_visit_first_screen_batch = []

                # Process current visit records in batch
                if patient_visit_current_batch:
                    # First, find which of these records already exist
                    client_visit_pairs = [(record[0], record[1]) for record in patient_visit_current_batch]
                    existing_visits = {}

                    # Check in smaller chunks to avoid too many parameters
                    for chunk_start in range(0, len(client_visit_pairs), 100):
                        chunk = client_visit_pairs[chunk_start:chunk_start + 100]
                        placeholders = ", ".join(["(?, ?)"] * len(chunk))
                        params = [param for pair in chunk for param in pair]

                        query = f'''
                            SELECT client_id, visit_date 
                            FROM patient_visits 
                            WHERE (client_id, visit_date) IN ({placeholders})
                        '''
                        execute_with_retry(cursor, query, params)
                        for row in cursor.fetchall():
                            existing_visits[(row["client_id"], row["visit_date"])] = True

                    # Separate records into new inserts and updates
                    records_to_insert = []

                    for record in patient_visit_current_batch:
                        client_id, visit_date = record[0], record[1]
                        if (client_id, visit_date) not in existing_visits:
                            records_to_insert.append(record)
                        else:
                            # For existing records, update all non-null fields
                            field_names = ["event_type", "referral_source", "follow_up", "hra", "edu",
                                           "case_management", "systolic", "diastolic", "cholesterol",
                                           "fasting", "glucose", "height", "weight", "bmi", "a1c", "acquired_by"]
                            update_fields = []
                            update_values = []

                            for i, field in enumerate(field_names):
                                # i+2 because first two elements in record are client_id and visit_date
                                if record[i + 2] is not None:
                                    update_fields.append(f"{field} = ?")
                                    update_values.append(record[i + 2])

                            if update_fields:
                                update_values.extend([client_id, visit_date])
                                execute_with_retry(cursor, f'''
                                    UPDATE patient_visits 
                                    SET {', '.join(update_fields)} 
                                    WHERE client_id = ? AND visit_date = ?
                                ''', update_values)

                    # Batch insert new records
                    if records_to_insert:
                        execute_with_retry(cursor, '''
                            INSERT INTO patient_visits (
                                client_id, visit_date, event_type, referral_source, follow_up,
                                hra, edu, case_management,
                                systolic, diastolic, cholesterol, fasting, glucose, height, weight, bmi, a1c,
                                acquired_by, visit_time
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '12:00')
                        ''', records_to_insert, is_many=True)

                    patient_visit_current_batch = []

            # Periodically commit to avoid too large transactions
            if i % (BATCH_SIZE * 10) == 0 and i > 0:
                conn.commit()
                logging.info(f"Processed {i}/{total_records} records in {excel_file}")

        flush_birthdate_batch()
        conn.commit()
        logging.info(f"Successfully processed file: {excel_file}")

    except Exception as e:
        # Roll back the transaction on error
        conn.rollback()
        error_msg = f"Error processing file {excel_file}: {str(e)}"
        logging.error(error_msg)
        print(f"{error_msg}")
        # Continue with the next file instead of aborting the entire process
        continue

conn.close()


def link_goals_to_visits(conn):
    cursor = conn.cursor()
    try:
        # Detailed logging for troubleshooting
        logging.info("Starting goals to visits linking process...")

        # Update goals with visit_id in a single, efficient query
        cursor.execute("""
            UPDATE patients_goals
            SET visit_id = (
                SELECT MIN(id)  -- Choose the first visit if multiple exist
                FROM patient_visits pv
                WHERE pv.client_id = patients_goals.client_id 
                  AND pv.visit_date = patients_goals.visit_date
            )
            WHERE visit_id IS NULL;
        """)

        # Log how many goals were linked
        conn.commit()

        # Verify linking results
        cursor.execute("SELECT COUNT(*) FROM patients_goals WHERE visit_id IS NULL")
        unlinked_count = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM patients_goals")
        total_goals = cursor.fetchone()[0]

        logging.info(f"Goals to visits linking complete. Total goals: {total_goals}, Unlinked goals: {unlinked_count}")

        if unlinked_count > 0:
            logging.warning(f"Warning: {unlinked_count} out of {total_goals} goals could not be linked to visits")

        return total_goals, unlinked_count

    except Exception as e:
        conn.rollback()
        logging.error(f"Error linking goals to visits: {str(e)}")
        raise


try:
    conn = sqlite3.connect(DB_FILE)
    total_goals, unlinked_goals = link_goals_to_visits(conn)
    print(f"Linked goals to visits. Total goals: {total_goals}, Unlinked: {unlinked_goals}")
finally:
    conn.close()

print("✅ Successfully updated patient records database with proper separation of event data and health metrics.")
logging.info("Patient record import completed successfully")