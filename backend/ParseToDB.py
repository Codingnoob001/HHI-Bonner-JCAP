import pandas as pd
import sqlite3

excel_files = [
    "/Users/victorakolo/Desktop/HHI/database/WVHA Outcomes (Database).xlsx",
    "/Users/victorakolo/Desktop/HHI/database/WVHA Outcomes 2 (Database).xlsx"
]
db_file = "../database/patient_records.db"
conn = sqlite3.connect(db_file)
cursor = conn.cursor()
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
    FOREIGN KEY (client_id) REFERENCES patients(client_id),
    UNIQUE(client_id, visit_date)
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
cursor.execute(f'''
CREATE TABLE IF NOT EXISTS patients_goals (
    client_id TEXT,
    visit_date TEXT,
    {", ".join([f"{goal} INTEGER" for goal in goals_mapping.values()])},
    PRIMARY KEY (client_id, visit_date),
    FOREIGN KEY (client_id) REFERENCES patients(client_id)
);
''')

conn.commit()

first_screen_data = {}
for excel_file in excel_files:
    print(f"Processing {excel_file}...")
    xls = pd.ExcelFile(excel_file)
    client_list_df = pd.read_excel(xls, sheet_name="CLIENT LIST")
    client_list_df.columns = client_list_df.columns.str.replace(r'\s+', ' ', regex=True).str.strip()
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
    for goal, col_name in goals_mapping.items():
        if goal in client_list_df.columns:
            client_list_df[col_name] = client_list_df[goal].apply(lambda x: 1 if str(x).strip().upper() == "X" else 0)
        else:
            client_list_df[col_name] = 0
    client_list_df = client_list_df[list(column_mapping.keys()) + list(new_value_mapping.keys()) + list(goals_mapping.values())].rename(columns=column_mapping)
    client_list_df = client_list_df.dropna(subset=["client_id"])  # Remove rows without client_id
    client_list_df["gender"] = client_list_df["gender"].str.strip().replace({"M": "Male", "F": "Female"})
    client_list_df["follow_up"] = client_list_df["follow_up"].astype(str).replace({"nan": None, "NaN": None})
    client_list_df["fasting"] = client_list_df["fasting"].astype(str).replace({"nan": None, "NaN": None})
    integer_fields = ["age", "systolic", "diastolic", "cholesterol", "glucose"]
    float_fields = ["height", "weight", "bmi", "a1c"]
    for field in integer_fields:
        client_list_df[field] = pd.to_numeric(client_list_df[field], errors='coerce').where(pd.notna(client_list_df[field]), None)
    for field in float_fields:
        client_list_df[field] = pd.to_numeric(client_list_df[field], errors='coerce').round(1).where(pd.notna(client_list_df[field]), None)
    client_list_df["phone"] = client_list_df["phone"].astype(str).str.replace(r'\.0$', '', regex=True).replace({"nan": None, "NaN": None})
    client_list_df["zipcode"] = client_list_df["zipcode"].astype(str).str.replace(r'\.0$', '', regex=True).replace({"nan": None, "NaN": None})
    for date_col in ["visit_date", "first_screen_date"]:
        client_list_df[date_col] = pd.to_datetime(client_list_df[date_col], errors='coerce').dt.strftime('%m/%d/%Y')
        client_list_df[date_col] = client_list_df[date_col].where(pd.notna(client_list_df[date_col]), None)
    patient_records = client_list_df.where(pd.notna(client_list_df), None).to_dict(orient="records")
    for row in patient_records:
        client_id = row["client_id"]
        if row["first_screen_date"]:
            if client_id not in first_screen_data:
                first_screen_data[client_id] = {
                    "event_type": row.get("event_type"),
                    "referral_source": row.get("referral_source"),
                    "follow_up": row.get("follow_up"),
                    "hra": row.get("hra"),
                    "edu": row.get("edu"),
                    "case_management": row.get("case_management"),
                    "systolic": row.get("systolic"),
                    "diastolic": row.get("diastolic"),
                    "cholesterol": row.get("cholesterol"),
                    "fasting": row.get("fasting"),
                    "glucose": row.get("glucose"),
                    "height": row.get("height"),
                    "weight": row.get("weight"),
                    "bmi": row.get("bmi"),
                    "a1c": row.get("a1c"),
                    "acquired_by": row.get("acquired_by")
                }
    for row in patient_records:
        cursor.execute('''
            INSERT INTO patients (client_id, first_name, last_name, gender, age, race, primary_lang, insurance, phone, zipcode, first_visit_date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(client_id) DO NOTHING;
        ''', tuple(row.get(col) for col in ["client_id", "first_name", "last_name", "gender", "age", "race", "primary_lang", "insurance", "phone", "zipcode", "first_screen_date"]))

    conn.commit()

    for row in patient_records:
        cursor.execute(f'''
                INSERT INTO patients_goals (client_id, visit_date, {", ".join(goals_mapping.values())})
                VALUES (?, ?, {", ".join(["?" for _ in goals_mapping])})
                ON CONFLICT(client_id, visit_date) DO UPDATE SET
                {", ".join([f"{goal} = excluded.{goal}" for goal in goals_mapping.values()])};
            ''', (row["client_id"], row["visit_date"]) + tuple(row.get(col) for col in goals_mapping.values()))

    conn.commit()

    for row in patient_records:
        client_id = row["client_id"]
        visit_date = row["visit_date"]
        first_screen_date = row["first_screen_date"]

        visit_data = [
            client_id, visit_date,
            row.get("event_type"), row.get("referral_source"), row.get("follow_up"),
            row.get("hra"), row.get("edu"), row.get("case_management"),
            row.get("systolic"), row.get("diastolic"), row.get("cholesterol"),
            row.get("fasting"), row.get("glucose"), row.get("height"), row.get("weight"),
            row.get("bmi"), row.get("a1c"), row.get("acquired_by")
        ]

        cursor.execute('''
            INSERT INTO patient_visits (
                client_id, visit_date, event_type, referral_source, follow_up,
                hra, edu, case_management,
                systolic, diastolic, cholesterol, fasting, glucose, height, weight, bmi, a1c,
                acquired_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(client_id, visit_date) DO UPDATE SET
            event_type = excluded.event_type,
            referral_source = excluded.referral_source,
            follow_up = excluded.follow_up,
            hra = excluded.hra,
            edu = excluded.edu,
            case_management = excluded.case_management,
            systolic = excluded.systolic,
            diastolic = excluded.diastolic,
            cholesterol = excluded.cholesterol,
            fasting = excluded.fasting,
            glucose = excluded.glucose,
            height = excluded.height,
            weight = excluded.weight,
            bmi = excluded.bmi,
            a1c = excluded.a1c,
            acquired_by = excluded.acquired_by;
        ''', visit_data)

        if visit_date == first_screen_date and client_id in first_screen_data:
            update_fields = {key: row[key] for key in first_screen_data[client_id] if row.get(key) is not None}

            if update_fields:
                set_clause = ", ".join([f"{key} = ?" for key in update_fields.keys()])
                values = list(update_fields.values()) + [client_id, first_screen_date]

                cursor.execute(f'''
                    UPDATE patient_visits
                    SET {set_clause}
                    WHERE client_id = ? AND visit_date = ?;
                ''', values)



    conn.commit()
conn.close()

print("✅ Successfully updated patient records database with unique records for each visit.")

"""
extract birthdays and create a column for it
in app.py, auto generate ID
"""