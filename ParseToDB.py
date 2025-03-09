import pandas as pd
import sqlite3

# File paths
excel_file = "/Users/victorakolo/Desktop/HHI/WVHA Outcomes (Database).xlsx"
db_file = "patient_records.db"

# Load the spreadsheet
xls = pd.ExcelFile(excel_file)
client_list_df = pd.read_excel(xls, sheet_name="CLIENT LIST")

# Standardize column names (remove extra spaces)
client_list_df.columns = client_list_df.columns.str.replace(r'\s+', ' ', regex=True).str.strip()

# Define column mappings
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
    "First Screen Date": "first_screen_date",  # First recorded visit
    "Follow-Up": "follow_up",
    "DATE": "visit_date",
    "AQUIRED BY": "acquired_by",
    "HRA": "hra",
    "EDU": "edu",
    "Case Management": "case_management",
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

# New values should be recorded as a new visit
new_value_mapping = {
    "NEW SYSTOLIC": "systolic",
    "NEW DIASTOLIC": "diastolic",
    "NEW CHOLESTEROL": "cholesterol",
    "FASTING.1": "fasting",
    "NEW GLUCOSE": "glucose",
    "NEW WEIGHT": "weight",
    "NEW BMI": "bmi",
    "A1C.1": "a1c"
}

# Keep only required columns
client_list_df = client_list_df[list(column_mapping.keys()) + list(new_value_mapping.keys())].rename(columns=column_mapping)
client_list_df = client_list_df.dropna(subset=["client_id"])  # Remove rows without client_id

# Standardize gender values
client_list_df["gender"] = client_list_df["gender"].str.strip().replace({"M": "Male", "F": "Female"})

# Convert categorical fields
client_list_df["follow_up"] = client_list_df["follow_up"].astype(str).replace({"nan": None, "NaN": None})
client_list_df["fasting"] = client_list_df["fasting"].astype(str).replace({"nan": None, "NaN": None})

# Convert numerical fields while preserving NULLs
integer_fields = ["age", "systolic", "diastolic", "cholesterol", "glucose"]
float_fields = ["height", "weight", "bmi", "a1c"]

for field in integer_fields:
    client_list_df[field] = pd.to_numeric(client_list_df[field], errors='coerce').where(pd.notna(client_list_df[field]), None)

for field in float_fields:
    client_list_df[field] = pd.to_numeric(client_list_df[field], errors='coerce').round(1).where(pd.notna(client_list_df[field]), None)

# Ensure phone and zipcode are stored as text
client_list_df["phone"] = client_list_df["phone"].astype(str).str.replace(r'\.0$', '', regex=True).replace({"nan": None, "NaN": None})
client_list_df["zipcode"] = client_list_df["zipcode"].astype(str).str.replace(r'\.0$', '', regex=True).replace({"nan": None, "NaN": None})

# Convert date columns to string format
for date_col in ["visit_date", "first_screen_date"]:
    client_list_df[date_col] = pd.to_datetime(client_list_df[date_col], errors='coerce').dt.strftime('%Y-%m-%d')
    client_list_df[date_col] = client_list_df[date_col].where(pd.notna(client_list_df[date_col]), None)

# Convert DataFrame into a list of dictionaries
patient_records = client_list_df.where(pd.notna(client_list_df), None).to_dict(orient="records")

# SQLite Database Connection
conn = sqlite3.connect(db_file)
cursor = conn.cursor()

# Create patients table
cursor.execute('''
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
    first_visit_date TEXT
);
''')

# Create patient_visits table
cursor.execute('''
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

conn.commit()

# Insert unique patients
for row in patient_records:
    cursor.execute('''
        INSERT INTO patients (client_id, first_name, last_name, gender, age, race, primary_lang, insurance, phone, zipcode, first_visit_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(client_id) DO NOTHING;
    ''', tuple(row.get(col) for col in ["client_id", "first_name", "last_name", "gender", "age", "race", "primary_lang", "insurance", "phone", "zipcode", "first_screen_date"]))

conn.commit()

# Insert each visit as a unique record
for row in patient_records:
    # Insert first recorded visit
    cursor.execute('''
        INSERT INTO patient_visits (
            client_id, visit_date, event_type, referral_source, follow_up,
            hra, edu, case_management,
            systolic, diastolic, cholesterol, fasting, glucose, height, weight, bmi, a1c,
            acquired_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    ''', tuple(row.get(col) for col in [
        "client_id", "first_screen_date", "event_type", "referral_source", "follow_up",
        "hra", "edu", "case_management",
        "systolic", "diastolic", "cholesterol", "fasting", "glucose", "height", "weight", "bmi", "a1c",
        "acquired_by"
    ]))

    # Insert new values as a separate visit
    if any(row.get(old_col) is not None for old_col in new_value_mapping.keys()):
        new_values = {new_value_mapping[old_col]: row.get(old_col) for old_col in new_value_mapping.keys() if row.get(old_col) is not None}
        cursor.execute(f'''
            INSERT INTO patient_visits (
                client_id, visit_date, {', '.join(new_values.keys())}
            ) VALUES (?, ?, {', '.join(['?' for _ in new_values])});
        ''', (row["client_id"], row["visit_date"]) + tuple(new_values.values()))

conn.commit()
conn.close()

print("✅ Successfully updated patient records database with unique records for each visit.")
