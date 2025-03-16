import os
from datetime import datetime
from flask import Flask, request, jsonify, send_from_directory, render_template
from flask_cors import CORS # --------- I had to import this for it to work (different ports) ---------
import sqlite3
from dotenv import load_dotenv


load_dotenv()
app = Flask(__name__, static_folder="frontend/static", template_folder="frontend/templates")
DB_FILE = os.getenv("DB_FILE", "database/patient_records.db")

CORS(app, origins=['http://127.0.0.1:5500'], supports_credentials=True)

def db_connection():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

def ensure_birthdate_column():
    conn = db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("ALTER TABLE patients ADD COLUMN birthdate TEXT;")
        conn.commit()
    except sqlite3.OperationalError:
        pass
    conn.close()

def standardize_birthdate(birthdate):
    try:
        birthdate_obj = datetime.strptime(birthdate, "%m/%d/%Y")
        return birthdate_obj.strftime("%m/%d/%y")
    except ValueError:
        return None

def generate_client_id(first_name, last_name, first_visit_date, birthdate):
    try:
        first_initial = first_name[0].upper()
        last_initial = last_name[0].upper()
        visit_date_obj = datetime.strptime(first_visit_date, "%m/%d/%Y")
        visit_month_year = visit_date_obj.strftime("%m%y")  # MMYY format

        return f"{first_initial}{last_initial}{visit_month_year}{birthdate.replace('/', '')}"  # MMDDYY
    except (IndexError, ValueError):
        return None


ensure_birthdate_column()

# --------- SERVE HTML FRONTEND ---------
@app.route("/")
def home():
    return render_template("index.html")

@app.route("/static/<path:filename>")
def static_files(filename):
    return send_from_directory("frontend/static", filename)


# --------- PATIENT CRUD OPERATIONS ---------

@app.route("/patients", methods=["GET"])
def get_patients():
    conn = db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM patients")
    patients = cursor.fetchall()

    cursor.execute("""
        SELECT g.*
        FROM patients_goals g
        INNER JOIN (
            SELECT client_id, MAX(visit_date) AS latest_visit
            FROM patients_goals
            GROUP BY client_id
        ) latest_goal ON g.client_id = latest_goal.client_id AND g.visit_date = latest_goal.latest_visit
    """)
    goals = cursor.fetchall()

    conn.close()

    patients_list = [dict(patient) for patient in patients]
    goals_dict = {goal["client_id"]: dict(goal) for goal in goals}  # Map goals by client_id

    for patient in patients_list:
        patient["goals"] = goals_dict.get(patient["client_id"], None)  # Include latest goals

    return jsonify(patients_list)


@app.route("/patients/search", methods=["GET"])
def search_patients():
    query = request.args.get("query", "").strip()
    if not query:
        return jsonify({"error": "Search query is required"}), 400
    try:
        conn = db_connection()
        cursor = conn.cursor()
        # Search by client ID, first name, last name, birthdate, or age
        cursor.execute("""
            SELECT * FROM patients 
            WHERE client_id LIKE ? 
            OR first_name LIKE ? 
            OR last_name LIKE ? 
            OR birthdate LIKE ? 
            OR CAST(age AS TEXT) LIKE ?
        """, (f"%{query}%", f"%{query}%", f"%{query}%", f"%{query}%", f"%{query}%"))
        results = cursor.fetchall()
        conn.close()
        if not results:
            return jsonify({"message": "No matching patients found"}), 404
        return jsonify([dict(row) for row in results])
    except sqlite3.Error as e:
        return jsonify({"error": "Database error", "details": str(e)}), 500
    except Exception as e:
        return jsonify({"error": "Something went wrong", "details": str(e)}), 500


@app.route("/patients/<client_id>", methods=["GET"])
def get_patient(client_id):
    conn = db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM patients WHERE client_id = ?", (client_id,))
    patient = cursor.fetchone()

    if not patient:
        return jsonify({"error": "Patient not found"}), 404

    cursor.execute("""
        SELECT * FROM patients_goals 
        WHERE client_id = ? 
        ORDER BY visit_date DESC 
        LIMIT 1
    """, (client_id,))
    goals = cursor.fetchone()

    conn.close()

    patient_data = dict(patient)
    patient_data["goals"] = dict(goals) if goals else None  # Include latest goals

    return jsonify(patient_data)


@app.route("/patients", methods=["POST"])
def add_patient():
    data = request.json
    conn = db_connection()
    cursor = conn.cursor()

    birthdate = standardize_birthdate(data.get("birthdate"))

    if not birthdate:
        return jsonify({"error": "Invalid birthdate format. Use MM DD YYYY"}), 400

    client_id = generate_client_id(data["first_name"], data["last_name"], data["first_visit_date"], birthdate)

    if not client_id:
        return jsonify({"error": "Failed to generate client_id. Ensure valid names and dates."}), 400

    try:
        cursor.execute('''
            INSERT INTO patients (client_id, first_name, last_name, gender, age, race, primary_lang, insurance, phone, zipcode, first_visit_date, birthdate)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            client_id, data["first_name"], data["last_name"], data["gender"], data["age"],
            data["race"], data["primary_lang"], data["insurance"], data["phone"], data["zipcode"],
            data["first_visit_date"], birthdate
        ))
        conn.commit()
        conn.close()

        return jsonify({"message": "Patient added successfully", "client_id": client_id, "birthdate": birthdate}), 201
    except sqlite3.IntegrityError:
        return jsonify({"error": "Patient with this client_id already exists"}), 400


# Update a patient's details
@app.route("/patients/<client_id>", methods=["PATCH"])
def update_patient(client_id):
    data = request.json
    conn = db_connection()
    cursor = conn.cursor()

    fields = []
    values = []

    for key, value in data.items():
        if key == "birthdate":  # Standardize birthdate if updating
            value = standardize_birthdate(value)
        fields.append(f"{key}=?")
        values.append(value)

    if not fields:
        return jsonify({"error": "No fields provided to update"}), 400

    sql = f"UPDATE patients SET {', '.join(fields)} WHERE client_id=?"
    values.append(client_id)

    cursor.execute(sql, tuple(values))
    conn.commit()
    conn.close()

    return jsonify({"message": "Patient updated successfully"})



# Delete a patient
@app.route("/patients/<client_id>", methods=["DELETE"])
def delete_patient(client_id):
    conn = db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM patients WHERE client_id = ?", (client_id,))
    conn.commit()
    conn.close()

    return jsonify({"message": "Patient deleted successfully"})

# --------- PATIENT GOALS CRUD OPERATIONS ---------

# Get all goals for a patient
@app.route("/patients/<client_id>/goals", methods=["GET"])
def get_patient_goals(client_id):
    conn = db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM patients_goals WHERE client_id = ?", (client_id,))
    goals = cursor.fetchall()
    conn.close()

    if goals:
        return jsonify([dict(row) for row in goals])
    else:
        return jsonify({"error": "No goals found"}), 404

# Add a new goal entry for a patient
@app.route("/patients/<client_id>/goals", methods=["POST"])
def add_patient_goals(client_id):
    data = request.json
    conn = db_connection()
    cursor = conn.cursor()

    # Ensure all goal values are either 1 or 0
    goals_data = {key: (1 if data.get(key) else 0) for key in data if key != "visit_date"}
    visit_date = data.get("visit_date")

    cursor.execute(f'''
        INSERT INTO patients_goals (client_id, visit_date, {", ".join(goals_data.keys())})
        VALUES (?, ?, {", ".join(["?" for _ in goals_data])})
        ON CONFLICT(client_id, visit_date) DO UPDATE SET
        {", ".join([f"{goal} = excluded.{goal}" for goal in goals_data.keys()])}
    ''', (client_id, visit_date) + tuple(goals_data.values()))

    conn.commit()
    conn.close()
    return jsonify({"message": "Goals added/updated successfully"}), 201

# Update existing goals for a specific visit
@app.route("/patients/<client_id>/goals/<visit_date>", methods=["PATCH"])
def update_patient_goals(client_id, visit_date):
    data = request.json
    conn = db_connection()
    cursor = conn.cursor()

    fields = []
    values = []

    for key, value in data.items():
        if isinstance(value, bool):
            fields.append(f"{key}=?")
            values.append(1 if value else 0)

    if not fields:
        return jsonify({"error": "No valid goals provided to update"}), 400

    values.append(client_id)
    values.append(visit_date)
    sql = f"UPDATE patients_goals SET {', '.join(fields)} WHERE client_id=? AND visit_date=?"

    cursor.execute(sql, tuple(values))
    conn.commit()
    conn.close()
    return jsonify({"message": "Patient goals updated successfully"})

# Delete goals for a specific visit
@app.route("/patients/<client_id>/goals/<visit_date>", methods=["DELETE"])
def delete_patient_goals(client_id, visit_date):
    conn = db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM patients_goals WHERE client_id = ? AND visit_date = ?", (client_id, visit_date))
    conn.commit()
    conn.close()
    return jsonify({"message": "Patient goals deleted successfully"})



# --------- VISIT CRUD OPERATIONS ---------

# Get all visits for a patient
@app.route("/patients/<client_id>/visits", methods=["GET"])
def get_patient_visits(client_id):
    conn = db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM patient_visits WHERE client_id = ?", (client_id,))
    visits = cursor.fetchall()
    conn.close()
    return jsonify([dict(row) for row in visits])


# Add a new visit for a patient
@app.route("/patients/<client_id>/visits", methods=["POST"])
def add_patient_visit(client_id):
    data = request.json
    conn = db_connection()
    cursor = conn.cursor()

    cursor.execute('''
        INSERT INTO patient_visits (client_id, visit_date, event_type, referral_source, follow_up, hra, edu, case_management,
                                    systolic, diastolic, cholesterol, fasting, glucose, height, weight, bmi, a1c, acquired_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        client_id, data["visit_date"], data["event_type"], data["referral_source"], data["follow_up"],
        data["hra"], data["edu"], data["case_management"], data["systolic"], data["diastolic"], data["cholesterol"],
        data["fasting"], data["glucose"], data["height"], data["weight"], data["bmi"], data["a1c"], data["acquired_by"]
    ))

    visit_id = cursor.lastrowid  # Get the auto-generated visit ID from SQLite
    conn.commit()
    conn.close()

    return jsonify({"message": "Visit added successfully", "visit_id": visit_id}), 201



# Update a patient's visit
@app.route("/patients/<client_id>/visits/<int:visit_id>", methods=["PATCH"])
def update_patient_visit(client_id, visit_id):
    data = request.json
    conn = db_connection()
    cursor = conn.cursor()

    # Dynamically build the UPDATE query based on provided fields
    fields = []
    values = []

    for key, value in data.items():
        fields.append(f"{key}=?")  # Add field to update
        values.append(value)  # Add value to set

    if not fields:
        return jsonify({"error": "No fields provided to update"}), 400

    # Create SQL update query
    sql = f"UPDATE patient_visits SET {', '.join(fields)} WHERE client_id=? AND id=?"
    values.append(client_id)
    values.append(visit_id)

    cursor.execute(sql, tuple(values))
    conn.commit()
    conn.close()

    return jsonify({"message": "Visit updated successfully"})



# Delete a visit
@app.route("/patients/<client_id>/visits/<int:visit_id>", methods=["DELETE"])
def delete_patient_visit(client_id, visit_id):
    conn = db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM patient_visits WHERE client_id = ? AND id = ?", (client_id, visit_id))
    conn.commit()
    conn.close()

    return jsonify({"message": "Visit deleted successfully"})


# --------- SERVE REACT STATIC FILES (AFTER BUILD) ---------
@app.route("/<path:path>")
def serve_static_files(path):
    return send_from_directory(app.static_folder, path)


# Run the app
if __name__ == "__main__":
    app.run(debug=True, port=5000)  # Runs locally on http://127.0.0.1:5000/
