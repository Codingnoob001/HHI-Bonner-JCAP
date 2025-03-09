from flask import Flask, request, jsonify, render_template
import sqlite3

app = Flask(__name__)
DB_FILE = "/Users/victorakolo/Desktop/HHI/patient_records.db"  # Using uploaded database


# Database Connection
def db_connection():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn


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
    cursor.execute("SELECT * FROM patients WHERE client_id = ?", (client_id,))
    patient = cursor.fetchone()
    conn.close()

    if patient:
        return jsonify(dict(patient))
    else:
        return jsonify({"error": "Patient not found"}), 404


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
        return jsonify({"message": "Patient added successfully"}), 201
    except sqlite3.IntegrityError:
        return jsonify({"error": "Patient with this client_id already exists"}), 400


# Update a patient's details
@app.route("/patients/<client_id>", methods=["PUT"])
def update_patient(client_id):
    data = request.json
    conn = db_connection()
    cursor = conn.cursor()

    cursor.execute('''
        UPDATE patients SET first_name=?, last_name=?, gender=?, age=?, race=?, primary_lang=?, insurance=?, phone=?, zipcode=?, first_visit_date=?
        WHERE client_id=?
    ''', (
        data["first_name"], data["last_name"], data["gender"], data["age"], data["race"],
        data["primary_lang"], data["insurance"], data["phone"], data["zipcode"], data["first_visit_date"],
        client_id
    ))

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

    conn.commit()
    conn.close()
    return jsonify({"message": "Visit added successfully"}), 201


# Update a patient's visit
@app.route("/patients/<client_id>/visits/<int:visit_id>", methods=["PUT"])
def update_patient_visit(client_id, visit_id):
    data = request.json
    conn = db_connection()
    cursor = conn.cursor()

    cursor.execute('''
        UPDATE patient_visits
        SET visit_date=?, event_type=?, referral_source=?, follow_up=?, hra=?, edu=?, case_management=?,
            systolic=?, diastolic=?, cholesterol=?, fasting=?, glucose=?, height=?, weight=?, bmi=?, a1c=?, acquired_by=?
        WHERE client_id=? AND id=?
    ''', (
        data["visit_date"], data["event_type"], data["referral_source"], data["follow_up"],
        data["hra"], data["edu"], data["case_management"], data["systolic"], data["diastolic"],
        data["cholesterol"], data["fasting"], data["glucose"], data["height"], data["weight"],
        data["bmi"], data["a1c"], data["acquired_by"], client_id, visit_id
    ))

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


# Run the app
if __name__ == "__main__":
    app.run(debug=True, port=5000)  # Runs locally on http://127.0.0.1:5000/
