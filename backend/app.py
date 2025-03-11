from flask import Flask, request, jsonify, send_from_directory
import sqlite3
from flask_cors import CORS
import os


app = Flask(__name__, static_folder="frontend/build", static_url_path="")
CORS(app)
DB_FILE = "/Users/victorakolo/Desktop/HHI/database/patient_records.db"


# Database Connection
def db_connection():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

# --------- SERVE REACT FRONTEND ---------
@app.route("/")
def serve_react():
    """Serve the React frontend."""
    return send_from_directory(app.static_folder, "index.html")



# --------- PATIENT CRUD OPERATIONS ---------

# Get all patients
@app.route("/patients", methods=["GET"])
def get_patients():
    conn = db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM patients")
    patients = cursor.fetchall()
    conn.close()
    return jsonify([dict(row) for row in patients])


# Get a single patient by client_id
@app.route("/patients/<client_id>", methods=["GET"])
def get_patient(client_id):
    conn = db_connection()
    cursor = conn.cursor()

    # Fetch patient details
    cursor.execute("SELECT * FROM patients WHERE client_id = ?", (client_id,))
    patient = cursor.fetchone()

    if not patient:
        return jsonify({"error": "Patient not found"}), 404

    # Fetch latest goals for the patient (most recent visit date)
    cursor.execute("""
        SELECT * FROM patients_goals 
        WHERE client_id = ? 
        ORDER BY visit_date DESC 
        LIMIT 1
    """, (client_id,))
    goals = cursor.fetchone()

    conn.close()

    # Convert data to dictionary
    patient_data = dict(patient)
    patient_data["goals"] = dict(goals) if goals else None  # Include latest goals

    return jsonify(patient_data)


# Add a new patient
@app.route("/patients", methods=["POST"])
def add_patient():
    data = request.json
    conn = db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute('''
            INSERT INTO patients (client_id, first_name, last_name, gender, age, race, primary_lang, insurance, phone, zipcode, first_visit_date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            data["client_id"], data["first_name"], data["last_name"], data["gender"], data["age"],
            data["race"], data["primary_lang"], data["insurance"], data["phone"], data["zipcode"], data["first_visit_date"]
        ))
        conn.commit()
        conn.close()

        return jsonify({"message": "Patient added successfully", "client_id": data["client_id"]}), 201
    except sqlite3.IntegrityError:
        return jsonify({"error": "Patient with this client_id already exists"}), 400



# Update a patient's details
@app.route("/patients/<client_id>", methods=["PATCH"])
def update_patient(client_id):
    data = request.json
    conn = db_connection()
    cursor = conn.cursor()

    # Dynamically build the UPDATE query
    fields = []
    values = []

    for key, value in data.items():
        fields.append(f"{key}=?")  # Add column name to update
        values.append(value)  # Add value for update

    if not fields:
        return jsonify({"error": "No fields provided to update"}), 400

    # Create final SQL statement
    sql = f"UPDATE patients SET {', '.join(fields)} WHERE client_id=?"
    values.append(client_id)  # Append client_id at the end for WHERE clause

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

    # Insert or update goals for a visit
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
