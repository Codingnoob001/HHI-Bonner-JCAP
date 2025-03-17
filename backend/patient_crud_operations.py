import os
from datetime import datetime
from flask import Flask, request, jsonify, send_from_directory, render_template
from flask_cors import CORS
import sqlite3
from dotenv import load_dotenv
import functools

load_dotenv()
app = Flask(__name__, static_folder="frontend/static", template_folder="frontend/templates")
DB_FILE = os.getenv("DB_FILE", "database/patient_records.db")

CORS(app, origins=['http://127.0.0.1:5500'], supports_credentials=True)


# --------- DATABASE SETUP AND UTILITIES ---------

def db_connection():
    """Create and return a database connection with row factory"""
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn


def create_indexes():
    """Create indexes on frequently queried columns for better performance"""
    conn = db_connection()
    cursor = conn.cursor()
    try:
        # Create indexes for common query fields
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_patient_visits_client_id ON patient_visits(client_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_patient_visits_visit_date ON patient_visits(visit_date)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_patients_goals_client_id ON patients_goals(client_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_patients_goals_visit_date ON patients_goals(visit_date)")

        # Create index for search fields
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_patients_search ON patients(first_name, last_name, birthdate)")

        conn.commit()
    except sqlite3.Error as e:
        print(f"Error creating indexes: {str(e)}")
    finally:
        conn.close()

def ensure_visit_time_column():
    """Ensure visit_time column exists in patient_visits table"""
    conn = db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("ALTER TABLE patient_visits ADD COLUMN visit_time TEXT;")
        conn.commit()
    except sqlite3.OperationalError:
        # Column already exists, so we can ignore
        pass
    finally:
        conn.close()

def ensure_birthdate_column():
    """Ensure birthdate column exists in patients table"""
    conn = db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("ALTER TABLE patients ADD COLUMN birthdate TEXT;")
        conn.commit()
    except sqlite3.OperationalError:
        pass
    finally:
        conn.close()


def standardize_birthdate(birthdate):
    """Convert birthdate to standard MM/DD/YY format"""
    if not birthdate:
        return None

    try:
        birthdate_obj = datetime.strptime(birthdate, "%m/%d/%Y")
        return birthdate_obj.strftime("%m/%d/%y")
    except ValueError:
        try:
            # Try alternate formats
            formats = ["%m-%d-%Y", "%Y-%m-%d", "%d/%m/%Y"]
            for fmt in formats:
                try:
                    birthdate_obj = datetime.strptime(birthdate, fmt)
                    return birthdate_obj.strftime("%m/%d/%y")
                except ValueError:
                    continue
        except Exception:
            pass
        return None


def generate_client_id(first_name, last_name, first_visit_date, birthdate):
    """Generate client ID in format: FFMMYYMMDDYY"""
    if not all([first_name, last_name, first_visit_date, birthdate]):
        return None

    try:
        first_initial = first_name[0].upper()
        last_initial = last_name[0].upper()
        visit_date_obj = datetime.strptime(first_visit_date, "%m/%d/%Y")
        visit_month_year = visit_date_obj.strftime("%m%y")  # MMYY format

        return f"{first_initial}{last_initial}{visit_month_year}{birthdate.replace('/', '')}"  # MMDDYY
    except (IndexError, ValueError) as e:
        print(f"Error generating client ID: {str(e)}")
        return None


# --------- ERROR HANDLING DECORATOR ---------

def handle_errors(f):
    """Decorator to handle errors consistently across routes"""

    @functools.wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except sqlite3.IntegrityError as e:
            return jsonify({"error": "Database integrity error", "details": str(e)}), 400
        except sqlite3.Error as e:
            return jsonify({"error": "Database error", "details": str(e)}), 500
        except ValueError as e:
            return jsonify({"error": "Value error", "details": str(e)}), 400
        except Exception as e:
            return jsonify({"error": "An unexpected error occurred", "details": str(e)}), 500

    return decorated_function


# --------- REQUEST VALIDATION UTILITIES ---------

def validate_patient_data(data, is_update=False):
    """Validate patient data for creation or update"""
    errors = []

    # For creation, ensure required fields
    if not is_update:
        required_fields = ["first_name", "last_name", "gender", "age", "first_visit_date", "birthdate"]
        for field in required_fields:
            if field not in data or not data[field]:
                errors.append(f"Missing required field: {field}")

    # Validate specific fields if present
    if "age" in data and data["age"] is not None:
        try:
            age = int(data["age"])
            if age < 0 or age > 130:
                errors.append("Age must be between 0 and 130")
        except (ValueError, TypeError):
            errors.append("Age must be a number")

    if "birthdate" in data and data["birthdate"]:
        if not standardize_birthdate(data["birthdate"]):
            errors.append("Invalid birthdate format")

    if "first_visit_date" in data and data["first_visit_date"]:
        try:
            datetime.strptime(data["first_visit_date"], "%m/%d/%Y")
        except ValueError:
            errors.append("Invalid first visit date format. Use MM/DD/YYYY")

    return errors


def validate_visit_data(data):
    """Validate patient visit data"""
    errors = []

    # Required fields
    if "visit_date" not in data or not data["visit_date"]:
        errors.append("Missing required field: visit_date")

    # Validate numeric fields
    numeric_fields = ["systolic", "diastolic", "cholesterol", "glucose", "height", "weight", "bmi", "a1c"]
    for field in numeric_fields:
        if field in data and data[field] is not None:
            try:
                value = float(data[field])
                # Field-specific validations
                if field == "systolic" and (value < 50 or value > 400):
                    errors.append("Systolic blood pressure must be between 50 and 400")
                elif field == "diastolic" and (value < 30 or value > 350):
                    errors.append("Diastolic blood pressure must be between 30 and 350")
                elif field == "weight" and value <= 0:
                    errors.append("Weight must be greater than 0")
                elif field == "height" and value <= 0:
                    errors.append("Height must be greater than 0")
            except (ValueError, TypeError):
                errors.append(f"{field} must be a number")

    return errors


# Initialize database setup
ensure_birthdate_column()
create_indexes()


# --------- SERVE HTML FRONTEND ---------
@app.route("/")
def home():
    return render_template("index.html")


@app.route("/static/<path:filename>")
def static_files(filename):
    return send_from_directory("frontend/static", filename)


# --------- PATIENT CRUD OPERATIONS ---------

@app.route("/patients", methods=["GET"])
@handle_errors
def get_patients():
    # Get optional pagination parameters
    page = request.args.get('page', default=1, type=int)
    limit = request.args.get('limit', default=100, type=int)

    # Validate and sanitize pagination parameters
    if page < 1:
        page = 1
    if limit < 1 or limit > 500:  # Enforcing reasonable limits
        limit = 100

    offset = (page - 1) * limit

    conn = db_connection()
    cursor = conn.cursor()

    # Get total count for pagination info
    cursor.execute("SELECT COUNT(*) as count FROM patients")
    total_count = cursor.fetchone()["count"]

    # Get paginated patient data
    cursor.execute("SELECT * FROM patients LIMIT ? OFFSET ?", (limit, offset))
    patients = cursor.fetchall()

    # Get latest goals for these patients
    # Only get goals for the patients in the current page
    if patients:
        patient_ids = [patient["client_id"] for patient in patients]
        placeholders = ','.join(['?'] * len(patient_ids))

        cursor.execute(f"""
            SELECT g.*
            FROM patients_goals g
            INNER JOIN (
                SELECT client_id, MAX(visit_date) AS latest_visit
                FROM patients_goals
                WHERE client_id IN ({placeholders})
                GROUP BY client_id
            ) latest_goal ON g.client_id = latest_goal.client_id AND g.visit_date = latest_goal.latest_visit
        """, patient_ids)
        goals = cursor.fetchall()

        goals_dict = {goal["client_id"]: dict(goal) for goal in goals}
    else:
        goals_dict = {}

    conn.close()

    patients_list = [dict(patient) for patient in patients]

    for patient in patients_list:
        patient["goals"] = goals_dict.get(patient["client_id"], None)  # Include latest goals

    # Return with pagination info
    return jsonify({
        "patients": patients_list,
        "pagination": {
            "total": total_count,
            "page": page,
            "limit": limit,
            "pages": (total_count + limit - 1) // limit  # Ceiling division
        }
    })


@app.route("/patients/search", methods=["GET"])
@handle_errors
def search_patients():
    query = request.args.get("query", "").strip()
    if not query:
        return jsonify({"error": "Search query is required"}), 400

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


@app.route("/patients/<client_id>", methods=["GET"])
@handle_errors
def get_patient(client_id):
    conn = db_connection()
    cursor = conn.cursor()

    # Fetch patient info
    cursor.execute("SELECT * FROM patients WHERE client_id = ?", (client_id,))
    patient = cursor.fetchone()

    if not patient:
        return jsonify({"error": "Patient not found"}), 404

    # Fetch all patient visits sorted by visit_date
    cursor.execute("""
        SELECT id, visit_date, systolic, diastolic, cholesterol, glucose, weight, bmi, a1c 
        FROM patient_visits 
        WHERE client_id = ? 
        ORDER BY visit_date ASC
    """, (client_id,))

    visits = cursor.fetchall()

    # Get patient goals
    cursor.execute("""
        SELECT * FROM patients_goals
        WHERE client_id = ?
        ORDER BY visit_date DESC
        LIMIT 1
    """, (client_id,))
    latest_goals = cursor.fetchone()

    # Handle case with no visits
    if not visits:
        conn.close()
        return jsonify({
            "patient_info": dict(patient),
            "latest_goals": dict(latest_goals) if latest_goals else None,
            "latest_changes": None,
            "trend": []
        })

    # Convert visit records to list of dicts
    visits_list = [dict(row) for row in visits]

    # Calculate changes between last two visits
    if len(visits_list) > 1:
        last_visit = visits_list[-2]  # Second last visit
        recent_visit = visits_list[-1]  # Most recent visit

        def calculate_change(new, old):
            if old is None or new is None:
                return None
            change = round(new - old, 1)
            return f"+{change}" if change > 0 else f"{change}"

        changes = {
            "systolic_change": calculate_change(recent_visit["systolic"], last_visit["systolic"]),
            "diastolic_change": calculate_change(recent_visit["diastolic"], last_visit["diastolic"]),
            "cholesterol_change": calculate_change(recent_visit["cholesterol"], last_visit["cholesterol"]),
            "glucose_change": calculate_change(recent_visit["glucose"], last_visit["glucose"]),
            "weight_change": calculate_change(recent_visit["weight"], last_visit["weight"]),
            "bmi_change": calculate_change(recent_visit["bmi"], last_visit["bmi"]),
            "a1c_change": calculate_change(recent_visit["a1c"], last_visit["a1c"])
        }

        # Calculate weight percentage change
        if last_visit["weight"] and recent_visit["weight"]:
            weight_percent_change = ((recent_visit["weight"] - last_visit["weight"]) / last_visit["weight"]) * 100
            changes["weight_percentage_change"] = f"{weight_percent_change:.2f}%"
        else:
            changes["weight_percentage_change"] = None

    else:
        changes = {
            "systolic_change": None,
            "diastolic_change": None,
            "cholesterol_change": None,
            "glucose_change": None,
            "weight_change": None,
            "bmi_change": None,
            "a1c_change": None,
            "weight_percentage_change": None
        }

    conn.close()

    # Construct response
    response = {
        "patient_info": dict(patient),
        "latest_goals": dict(latest_goals) if latest_goals else None,
        "latest_changes": changes,
        "trend": visits_list  # Full visit history for visualization
    }

    return jsonify(response)


@app.route("/patients", methods=["POST"])
@handle_errors
def add_patient():
    data = request.json
    if not data:
        return jsonify({"error": "No data provided"}), 400

    # Validate patient data
    validation_errors = validate_patient_data(data)
    if validation_errors:
        return jsonify({"error": "Validation failed", "details": validation_errors}), 400

    birthdate = standardize_birthdate(data.get("birthdate"))
    if not birthdate:
        return jsonify({"error": "Invalid birthdate format. Use MM/DD/YYYY"}), 400

    client_id = generate_client_id(data["first_name"], data["last_name"], data["first_visit_date"], birthdate)
    if not client_id:
        return jsonify({"error": "Failed to generate client_id. Ensure valid names and dates."}), 400

    conn = db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute('''
            INSERT INTO patients (client_id, first_name, last_name, gender, age, race, primary_lang, insurance, phone, zipcode, first_visit_date, birthdate)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            client_id, data["first_name"], data["last_name"], data["gender"], data["age"],
            data.get("race"), data.get("primary_lang"), data.get("insurance"),
            data.get("phone"), data.get("zipcode"), data["first_visit_date"], birthdate
        ))
        conn.commit()

        conn.close()
        return jsonify({
            "message": "Patient added successfully",
            "client_id": client_id,
            "birthdate": birthdate
        }), 201

    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({"error": "Patient with this client_id already exists"}), 400


# Update a patient's details
@app.route("/patients/<client_id>", methods=["PATCH"])
@handle_errors
def update_patient(client_id):
    data = request.json
    if not data:
        return jsonify({"error": "No data provided"}), 400

    # Validate patient data for update
    validation_errors = validate_patient_data(data, is_update=True)
    if validation_errors:
        return jsonify({"error": "Validation failed", "details": validation_errors}), 400

    # First, check if patient exists
    conn = db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT 1 FROM patients WHERE client_id = ?", (client_id,))
    if not cursor.fetchone():
        conn.close()
        return jsonify({"error": "Patient not found"}), 404

    fields = []
    values = []

    for key, value in data.items():
        if key == "birthdate" and value:  # Standardize birthdate if updating
            value = standardize_birthdate(value)
            if not value:
                conn.close()
                return jsonify({"error": "Invalid birthdate format"}), 400
        fields.append(f"{key}=?")
        values.append(value)

    if not fields:
        conn.close()
        return jsonify({"error": "No fields provided to update"}), 400

    sql = f"UPDATE patients SET {', '.join(fields)} WHERE client_id=?"
    values.append(client_id)

    cursor.execute(sql, tuple(values))
    rows_affected = cursor.rowcount
    conn.commit()
    conn.close()

    if rows_affected > 0:
        return jsonify({"message": "Patient updated successfully"})
    else:
        return jsonify({"message": "No changes made"})


# Delete a patient
@app.route("/patients/<client_id>", methods=["DELETE"])
@handle_errors
def delete_patient(client_id):
    conn = db_connection()
    cursor = conn.cursor()

    # Begin transaction to ensure all related records are deleted
    cursor.execute("BEGIN TRANSACTION")
    try:
        # Delete related records first
        cursor.execute("DELETE FROM patient_visits WHERE client_id = ?", (client_id,))
        cursor.execute("DELETE FROM patients_goals WHERE client_id = ?", (client_id,))

        # Then delete the patient
        cursor.execute("DELETE FROM patients WHERE client_id = ?", (client_id,))

        # Check if patient was found and deleted
        if cursor.rowcount == 0:
            # Rollback and return error if patient not found
            cursor.execute("ROLLBACK")
            conn.close()
            return jsonify({"error": "Patient not found"}), 404

        # Commit the transaction if all operations succeeded
        cursor.execute("COMMIT")
    except Exception as e:
        # Rollback on any error
        cursor.execute("ROLLBACK")
        conn.close()
        raise e

    conn.close()
    return jsonify({"message": "Patient and all related records deleted successfully"})


# --------- PATIENT GOALS CRUD OPERATIONS ---------

# Get all goals for a patient
@app.route("/patients/<client_id>/goals", methods=["GET"])
@handle_errors
def get_patient_goals(client_id):
    conn = db_connection()
    cursor = conn.cursor()

    # First verify patient exists
    cursor.execute("SELECT 1 FROM patients WHERE client_id = ?", (client_id,))
    if not cursor.fetchone():
        conn.close()
        return jsonify({"error": "Patient not found"}), 404

    cursor.execute("SELECT * FROM patients_goals WHERE client_id = ? ORDER BY visit_date DESC", (client_id,))
    goals = cursor.fetchall()
    conn.close()

    if goals:
        return jsonify([dict(row) for row in goals])
    else:
        return jsonify([])  # Return empty array instead of error for easier frontend handling


# Add a new goal entry for a patient
@app.route("/patients/<client_id>/goals", methods=["POST"])
@handle_errors
def add_patient_goals(client_id):
    data = request.json
    if not data:
        return jsonify({"error": "No data provided"}), 400

    # Verify required fields
    if "visit_date" not in data or not data["visit_date"]:
        return jsonify({"error": "visit_date is required"}), 400

    # Verify patient exists
    conn = db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT 1 FROM patients WHERE client_id = ?", (client_id,))
    if not cursor.fetchone():
        conn.close()
        return jsonify({"error": "Patient not found"}), 404

    # Ensure all goal values are either 1 or 0
    goals_data = {key: (1 if data.get(key) else 0) for key in data if key != "visit_date"}
    visit_date = data.get("visit_date")

    # Verify visit date is valid
    try:
        # Try to parse and standardize the date if needed
        if "/" in visit_date:
            date_obj = datetime.strptime(visit_date, "%Y-%m-%d")
        else:
            date_obj = datetime.strptime(visit_date, "%Y-%m-%d")
        visit_date = date_obj.strftime("%Y-%m-%d")
    except ValueError:
        conn.close()
        return jsonify({"error": "Invalid visit_date format. Use YYYY-MM-DD"}), 400

    # Verify this is a valid visit date for this patient
    cursor.execute(
        "SELECT 1 FROM patient_visits WHERE client_id = ? AND visit_date = ?",
        (client_id, visit_date)
    )
    if not cursor.fetchone() and not data.get("force_create", False):
        conn.close()
        return jsonify({
            "error": "No visit record found for this date",
            "details": "Set force_create=true to create goals without a visit record"
        }), 400

    # If no goals data provided, return error
    if not goals_data:
        conn.close()
        return jsonify({"error": "No goals data provided"}), 400

    # Build and execute the query
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
@handle_errors
def update_patient_goals(client_id, visit_date):
    data = request.json
    if not data:
        return jsonify({"error": "No data provided"}), 400

    conn = db_connection()
    cursor = conn.cursor()

    # Verify record exists
    cursor.execute(
        "SELECT 1 FROM patients_goals WHERE client_id = ? AND visit_date = ?",
        (client_id, visit_date)
    )
    if not cursor.fetchone():
        conn.close()
        return jsonify({"error": "No goals found for this patient and visit date"}), 404

    fields = []
    values = []

    for key, value in data.items():
        if key in ("client_id", "visit_date"):
            continue  # Skip primary keys

        fields.append(f"{key}=?")
        # Convert boolean/truthy values to 0/1
        if isinstance(value, bool) or value:
            values.append(1 if value else 0)
        else:
            values.append(0)

    if not fields:
        conn.close()
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
@handle_errors
def delete_patient_goals(client_id, visit_date):
    conn = db_connection()
    cursor = conn.cursor()

    # Verify record exists before trying to delete
    cursor.execute(
        "SELECT 1 FROM patients_goals WHERE client_id = ? AND visit_date = ?",
        (client_id, visit_date)
    )
    if not cursor.fetchone():
        conn.close()
        return jsonify({"error": "No goals found for this patient and visit date"}), 404

    cursor.execute("DELETE FROM patients_goals WHERE client_id = ? AND visit_date = ?", (client_id, visit_date))
    conn.commit()
    conn.close()
    return jsonify({"message": "Patient goals deleted successfully"})


# --------- VISIT CRUD OPERATIONS ---------

# Get all visits for a patient
@app.route("/patients/<client_id>/visits", methods=["GET"])
@handle_errors
def get_patient_visits(client_id):
    conn = db_connection()
    cursor = conn.cursor()

    # First verify patient exists
    cursor.execute("SELECT 1 FROM patients WHERE client_id = ?", (client_id,))
    if not cursor.fetchone():
        conn.close()
        return jsonify({"error": "Patient not found"}), 404

    # Include visit_time in the ordering
    cursor.execute("""
        SELECT * FROM patient_visits 
        WHERE client_id = ? 
        ORDER BY visit_date DESC, visit_time DESC
    """, (client_id,))
    visits = cursor.fetchall()
    conn.close()

    if visits:
        visit_list = [dict(row) for row in visits]
        # Format a display string for each visit
        for visit in visit_list:
            if visit.get("visit_time"):
                visit["display_datetime"] = f"{visit['visit_date']} {visit['visit_time']}"
            else:
                visit["display_datetime"] = visit['visit_date']
        return jsonify(visit_list)
    else:
        return jsonify([])


# Add a new visit for a patient
@app.route("/patients/<client_id>/visits", methods=["POST"])
@handle_errors
def add_patient_visit(client_id):
    data = request.json
    if not data:
        return jsonify({"error": "No data provided"}), 400

    # Validate visit data
    validation_errors = validate_visit_data(data)
    if validation_errors:
        return jsonify({"error": "Validation failed", "details": validation_errors}), 400

    # Verify patient exists
    conn = db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT 1 FROM patients WHERE client_id = ?", (client_id,))
    if not cursor.fetchone():
        conn.close()
        return jsonify({"error": "Patient not found"}), 404

    # If visit_time is not provided, generate one
    if "visit_time" not in data or not data["visit_time"]:
        data["visit_time"] = datetime.now().strftime("%H:%M")

    # Prepare data for insertion, handling nulls appropriately
    visit_data = [
        client_id,
        data["visit_date"],
        data["visit_time"],  # Add visit_time
        data.get("event_type"),
        data.get("referral_source"),
        data.get("follow_up"),
        data.get("hra"),
        data.get("edu"),
        data.get("case_management"),
        data.get("systolic"),
        data.get("diastolic"),
        data.get("cholesterol"),
        data.get("fasting"),
        data.get("glucose"),
        data.get("height"),
        data.get("weight"),
        data.get("bmi"),
        data.get("a1c"),
        data.get("acquired_by")
    ]

    # Standard insert without duplicate check (since you've removed the UNIQUE constraint)
    cursor.execute('''
        INSERT INTO patient_visits (
            client_id, visit_date, visit_time, event_type, referral_source, follow_up, 
            hra, edu, case_management, systolic, diastolic, cholesterol, 
            fasting, glucose, height, weight, bmi, a1c, acquired_by
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', visit_data)

    visit_id = cursor.lastrowid  # Get the auto-generated visit ID from SQLite
    conn.commit()

    # If there's a goals field in the data, create goals for this visit
    if "goals" in data and isinstance(data["goals"], dict):
        goals_data = {key: 1 if value else 0 for key, value in data["goals"].items()}

        if goals_data:
            # Create a new goals record with visit_id reference
            cursor.execute(f'''
                INSERT INTO patients_goals (
                    client_id, visit_date, visit_id, {", ".join(goals_data.keys())}
                )
                VALUES (?, ?, ?, {", ".join(["?" for _ in goals_data])})
            ''', (client_id, data["visit_date"], visit_id) + tuple(goals_data.values()))
            conn.commit()

    conn.close()
    return jsonify({
        "message": "Visit added successfully",
        "visit_id": visit_id,
        "visit_time": data["visit_time"],
        "goals_added": "goals" in data and bool(data["goals"])
    }), 201


# Update a patient's visit
@app.route("/patients/<client_id>/visits/<int:visit_id>", methods=["PATCH"])
@handle_errors
def update_patient_visit(client_id, visit_id):
    data = request.json
    if not data:
        return jsonify({"error": "No data provided"}), 400

    # Validate numeric fields
    numeric_fields = ["systolic", "diastolic", "cholesterol", "glucose", "height", "weight", "bmi", "a1c"]
    for field in numeric_fields:
        if field in data and data[field] is not None:
            try:
                data[field] = float(data[field])
            except (ValueError, TypeError):
                return jsonify({"error": f"{field} must be a number"}), 400

    conn = db_connection()
    cursor = conn.cursor()

    # Verify the visit exists
    cursor.execute(
        "SELECT 1 FROM patient_visits WHERE client_id = ? AND id = ?",
        (client_id, visit_id)
    )
    if not cursor.fetchone():
        conn.close()
        return jsonify({"error": "Visit not found"}), 404

    # Dynamically build the UPDATE query based on provided fields
    fields = []
    values = []

    for key, value in data.items():
        if key not in ("id", "client_id"):  # Skip primary keys
            fields.append(f"{key}=?")
            values.append(value)

    if not fields:
        conn.close()
        return jsonify({"error": "No fields provided to update"}), 400

    # Create SQL update query
    sql = f"UPDATE patient_visits SET {', '.join(fields)} WHERE client_id=? AND id=?"
    values.append(client_id)
    values.append(visit_id)

    cursor.execute(sql, tuple(values))
    rows_affected = cursor.rowcount
    conn.commit()

    # Handle updating goals if provided
    if "goals" in data and isinstance(data["goals"], dict) and data.get("visit_date"):
        goals_data = {key: 1 if value else 0 for key, value in data["goals"].items()}

        if goals_data:
            # Build and execute the query
            cursor.execute(f'''
                INSERT INTO patients_goals (client_id, visit_date, {", ".join(goals_data.keys())})
                VALUES (?, ?, {", ".join(["?" for _ in goals_data])})
                ON CONFLICT(client_id, visit_date) DO UPDATE SET
                {", ".join([f"{goal} = excluded.{goal}" for goal in goals_data.keys()])}
            ''', (client_id, data["visit_date"]) + tuple(goals_data.values()))
            conn.commit()

    conn.close()

    return jsonify({
        "message": "Visit updated successfully",
        "rows_affected": rows_affected,
        "goals_updated": "goals" in data and bool(data["goals"])
    })



# Delete a visit
@app.route("/patients/<client_id>/visits/<int:visit_id>", methods=["DELETE"])
@handle_errors
def delete_patient_visit(client_id, visit_id):
    conn = db_connection()
    cursor = conn.cursor()

    # First get the visit_date to possibly delete associated goals
    cursor.execute(
        "SELECT visit_date FROM patient_visits WHERE client_id = ? AND id = ?",
        (client_id, visit_id)
    )
    visit = cursor.fetchone()

    if not visit:
        conn.close()
        return jsonify({"error": "Visit not found"}), 404

    visit_date = visit["visit_date"]

    # Begin transaction for atomicity
    cursor.execute("BEGIN TRANSACTION")
    try:
        # Delete the visit
        cursor.execute(
            "DELETE FROM patient_visits WHERE client_id = ? AND id = ?",
            (client_id, visit_id)
        )

        # Check if goals should be deleted too
        delete_goals = request.args.get('delete_goals', 'false').lower() == 'true'
        if delete_goals:
            cursor.execute(
                "DELETE FROM patients_goals WHERE client_id = ? AND visit_date = ?",
                (client_id, visit_date)
            )
            goals_deleted = True
        else:
            goals_deleted = False

        # Commit changes
        cursor.execute("COMMIT")
    except Exception as e:
        cursor.execute("ROLLBACK")
        conn.close()
        raise e

    conn.close()
    return jsonify({
        "message": "Visit deleted successfully",
        "goals_deleted": goals_deleted
    })


# --------- REPORTING ENDPOINTS ---------

@app.route("/reports/metrics", methods=["GET"])
@handle_errors
def get_metrics_report():
    """Get aggregate metrics report"""
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')

    # Validate dates
    if start_date:
        try:
            datetime.strptime(start_date, "%Y-%m-%d")
        except ValueError:
            return jsonify({"error": "Invalid start_date format. Use YYYY-MM-DD"}), 400

    if end_date:
        try:
            datetime.strptime(end_date, "%Y-%m-%d")
        except ValueError:
            return jsonify({"error": "Invalid end_date format. Use YYYY-MM-DD"}), 400

    conn = db_connection()
    cursor = conn.cursor()

    # Base query parts
    date_filter = ""
    params = []

    if start_date and end_date:
        date_filter = "WHERE visit_date BETWEEN ? AND ?"
        params = [start_date, end_date]
    elif start_date:
        date_filter = "WHERE visit_date >= ?"
        params = [start_date]
    elif end_date:
        date_filter = "WHERE visit_date <= ?"
        params = [end_date]

    # Patient count
    cursor.execute("SELECT COUNT(*) as total_patients FROM patients")
    total_patients = cursor.fetchone()["total_patients"]

    # Visit count
    cursor.execute(f"SELECT COUNT(*) as total_visits FROM patient_visits {date_filter}", params)
    total_visits = cursor.fetchone()["total_visits"]

    # Average metrics
    cursor.execute(f"""
        SELECT 
            AVG(systolic) as avg_systolic,
            AVG(diastolic) as avg_diastolic,
            AVG(cholesterol) as avg_cholesterol,
            AVG(glucose) as avg_glucose,
            AVG(weight) as avg_weight,
            AVG(bmi) as avg_bmi,
            AVG(a1c) as avg_a1c
        FROM patient_visits
        {date_filter}
    """, params)
    avg_metrics = cursor.fetchone()
    avg_metrics_dict = dict(avg_metrics) if avg_metrics else {}

    # Goals summary
    cursor.execute(f"""
        SELECT 
            SUM(increased_fruit_veg) as total_increased_fruit_veg,
            SUM(increased_water) as total_increased_water,
            SUM(increased_exercise) as total_increased_exercise,
            SUM(cut_tv_viewing) as total_cut_tv_viewing,
            SUM(eat_breakfast) as total_eat_breakfast,
            SUM(limit_alcohol) as total_limit_alcohol,
            SUM(no_late_eating) as total_no_late_eating,
            SUM(more_whole_grains) as total_more_whole_grains,
            SUM(less_fried_foods) as total_less_fried_foods,
            SUM(low_fat_milk) as total_low_fat_milk,
            SUM(lower_salt) as total_lower_salt,
            SUM(annual_checkup) as total_annual_checkup,
            SUM(quit_smoking) as total_quit_smoking,
            COUNT(*) as total_goal_records
        FROM patients_goals
        {date_filter}
    """, params)

    goals_row = cursor.fetchone()
    goals_summary = dict(goals_row) if goals_row else {}

    # Calculate goal percentages separately (not during iteration)
    goals_percentages = {}
    if 'total_goal_records' in goals_summary and goals_summary["total_goal_records"] > 0:
        total_records = goals_summary["total_goal_records"]
        for key in list(goals_summary.keys()):  # Create a new list from the keys
            if key != "total_goal_records" and goals_summary[key] is not None:
                goals_percentages[f"{key}_percent"] = round((goals_summary[key] / total_records) * 100, 1)

    # Merge the dictionaries
    goals_summary.update(goals_percentages)

    conn.close()

    return jsonify({
        "total_patients": total_patients,
        "total_visits": total_visits,
        "timeframe": {
            "start_date": start_date,
            "end_date": end_date
        },
        "average_metrics": avg_metrics_dict,
        "goals_summary": goals_summary
    })

# --------- SERVE REACT STATIC FILES (AFTER BUILD) ---------
@app.route("/<path:path>")
def serve_static_files(path):
    return send_from_directory(app.static_folder, path)


# Run the app
if __name__ == "__main__":
    app.run(debug=True, port=5000)  # Runs locally on http://127.0.0.1:5000/

"""Get rid of inability to create multiple visits for a client on same day"""