import os
from datetime import datetime, timedelta
from flask import Flask, request, jsonify, send_from_directory, render_template
from flask_cors import CORS
import sqlite3
from dotenv import load_dotenv
import functools


load_dotenv()
app = Flask(__name__, static_folder="dist", static_url_path="")
DB_FILE = os.getenv("DB_FILE", "database/patient_records.db")

CORS(app, 
     origins=["http://localhost:5173", "http://127.0.0.1:5173"], 
     methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
     allow_headers=["Content-Type", "Authorization"])

# --------- DATABASE SETUP AND UTILITIES ---------

def db_connection():
    """Create and return a database connection with row factory"""
    conn = sqlite3.connect(DB_FILE, isolation_level=None)  # autocommit mode
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("PRAGMA synchronous = FULL")
    cursor.execute("PRAGMA journal_mode = DELETE")
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


def standardize_date_for_db(date_str):
    """Convert any date format to YYYY-MM-DD format for database storage"""
    if not date_str:
        return None

    try:
        # First try standard YYYY-MM-DD format
        if '-' in date_str and len(date_str.split('-')[0]) == 4:
            datetime.strptime(date_str, "%Y-%m-%d")
            return date_str

        # Common date formats to try
        formats = [
            "%m/%d/%Y",  # 03/20/2025
            "%Y/%m/%d",  # 2025/03/20
            "%m-%d-%Y",  # 03-20-2025
            "%d/%m/%Y",  # 20/03/2025
            "%m/%d/%y",  # 03/20/25
            "%d-%m-%Y",  # 20-03-2025
            "%Y%m%d"  # 20250320
        ]

        for fmt in formats:
            try:
                date_obj = datetime.strptime(date_str, fmt)
                return date_obj.strftime("%Y-%m-%d")
            except ValueError:
                continue

        # If none of the formats work, log this unusual format
        print(f"Warning: Couldn't standardize date format: {date_str}")
        return date_str  # Return original rather than None to avoid data loss
    except Exception as e:
        print(f"Error in standardize_date_for_db with {date_str}: {str(e)}")
        return date_str  # Return original rather than None


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


# Function to calculate BMI from height and weight
def calculate_bmi(height, weight):
    """
    Calculate BMI using height (in or cm) and weight (lb or kg)

    If height > 3, assume it's in cm and convert to meters
    If weight > 150, assume it's in lb and convert to kg

    BMI = weight (kg) / (height (m) * height (m))
    """
    if height is None or weight is None:
        return None

    try:
        height_val = float(height)
        weight_val = float(weight)

        # Convert height to meters if needed
        if height_val > 3:  # Assuming height > 3 means it's in cm
            height_m = height_val / 100
        else:  # Height is in meters
            height_m = height_val

        # Convert weight to kg if needed
        if weight_val > 150:  # Assuming weight > 150 means it's in pounds
            weight_kg = weight_val * 0.453592
        else:  # Weight is in kg
            weight_kg = weight_val

        # Calculate BMI
        bmi = weight_kg / (height_m * height_m)
        return round(bmi, 1)
    except (ValueError, ZeroDivisionError):
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
    numeric_fields = ["systolic", "diastolic", "cholesterol", "glucose", "height", "weight", "a1c"]
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


def ensure_activity_log_table():
    """Ensure activity_log table exists"""
    conn = db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS activity_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            activity_type TEXT NOT NULL,  -- 'create', 'read', 'update', 'delete'
            entity_type TEXT NOT NULL,    -- 'patient', 'visit', 'goals'
            entity_id TEXT NOT NULL,      -- client_id, visit_id, etc.
            entity_name TEXT,             -- patient name, etc.
            timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
            additional_info TEXT          -- any extra info
        )
        ''')
        conn.commit()
    except sqlite3.Error as e:
        print(f"Error creating activity_log table: {str(e)}")
    finally:
        conn.close()
# Call it during initialization
ensure_activity_log_table()

def log_activity(activity_type, entity_type, entity_id, entity_name, additional_info=None):
    """Log an activity in the activity_log table"""
    try:
        conn = db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO activity_log 
            (activity_type, entity_type, entity_id, entity_name, additional_info)
            VALUES (?, ?, ?, ?, ?)
        ''', (activity_type, entity_type, entity_id, entity_name, additional_info))
        
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print(f"Error logging activity: {str(e)}")
        return False


# --------- SERVE HTML FRONTEND ---------
@app.route("/")
def home():
    return render_template("index.html")


@app.route("/static/<path:filename>")
def static_files(filename):
    return send_from_directory("frontend/static", filename)

@app.route("/setup", methods=["GET"])
@handle_errors
def setup_database():
    conn = db_connection()
    cursor = conn.cursor()
    
    # Create activity log table if it doesn't exist
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
    
    conn.commit()
    conn.close()
    
    return jsonify({"message": "Database setup completed"})


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

    # Get and standardize birthdate for validation and client_id generation
    birthdate_short = standardize_birthdate(data.get("birthdate"))
    if not birthdate_short:
        return jsonify({"error": "Invalid birthdate format. Use MM/DD/YYYY"}), 400

    # Generate the client_id using the MM/DD/YY format
    client_id = generate_client_id(data["first_name"], data["last_name"], data["first_visit_date"], birthdate_short)
    if not client_id:
        return jsonify({"error": "Failed to generate client_id. Ensure valid names and dates."}), 400

    # Now standardize dates for database storage in YYYY-MM-DD format
    first_visit_date_db = standardize_date_for_db(data.get("first_visit_date"))
    birthdate_db = standardize_date_for_db(data.get("birthdate"))

    if not first_visit_date_db:
        return jsonify(
            {"error": "Invalid first visit date format. Please use MM/DD/YYYY or another recognized format."}), 400
    if not birthdate_db:
        return jsonify({"error": "Invalid birthdate format. Please use MM/DD/YYYY or another recognized format."}), 400

    # Extract goals data if present
    goals_data = data.pop("goals", {})

    conn = db_connection()
    cursor = conn.cursor()

    try:
        # Insert patient data with standardized dates
        cursor.execute('''
            INSERT INTO patients (client_id, first_name, last_name, gender, age, race, primary_lang, 
                insurance, phone, zipcode, first_visit_date, birthdate, height)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            client_id,
            data.get("first_name"),
            data.get("last_name"),
            data.get("gender"),
            data.get("age"),
            data.get("race"),
            data.get("primary_lang"),
            data.get("insurance"),
            data.get("phone"),
            data.get("zipcode"),
            first_visit_date_db,  # Use the standardized YYYY-MM-DD format
            birthdate_db,  # Use the standardized YYYY-MM-DD format
            data.get("height")
        ))
        # Handle goals data if provided
        goals_inserted = False
        if goals_data and isinstance(goals_data, dict):
            # Convert boolean/truthy values to 0/1
            processed_goals = {key: 1 if value else 0 for key, value in goals_data.items()}

            if processed_goals:
                # Convert first_visit_date to YYYY-MM-DD format for goals table
                formatted_visit_date = standardize_date_for_db(data.get("first_visit_date"))

                if formatted_visit_date:
                    # Build the goals query - dynamically handle any goal fields provided
                    goal_fields = list(processed_goals.keys())
                    placeholders = ", ".join(["?" for _ in processed_goals])
                    values = list(processed_goals.values())

                    # Insert goals
                    sql = f"""
                        INSERT INTO patients_goals (client_id, visit_date, {', '.join(goal_fields)})
                        VALUES (?, ?, {placeholders})
                    """
                    cursor.execute(sql, (client_id, formatted_visit_date) + tuple(values))
                    goals_inserted = True
                else:
                    print(f"Error: Could not convert visit date '{data.get('first_visit_date')}' to YYYY-MM-DD format")
        log_activity('create', 'patient', client_id, f"{data.get('first_name')} {data.get('last_name')}")

        conn.commit()
        conn.close()

        return jsonify({
            "message": "Patient added successfully",
            "client_id": client_id,
            "birthdate": birthdate_db,
            "goals_added": goals_inserted
        }), 201

    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({"error": "Patient with this client_id already exists"}), 400


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
    cursor.execute("SELECT * FROM patients WHERE client_id = ?", (client_id,))
    patient_record = cursor.fetchone()

    if not patient_record:
        conn.close()
        return jsonify({"error": "Patient not found"}), 404

    # Convert patient record to dict for easier access
    patient_data = dict(patient_record)

    # Extract goals data if present
    goals_data = data.pop("goals", None)

    # Process patient information fields
    fields = []
    values = []

    for key, value in data.items():
        # Skip empty values to preserve original data
        if value is None or value == "":
            continue

        # In update_patient, change this section:
        if key == "birthdate" and value:  # Standardize birthdate if updating
            # First get the MM/DD/YY format for validation
            value_short = standardize_birthdate(value)
            if not value_short:
                conn.close()
                return jsonify({"error": "Invalid birthdate format"}), 400

            # But store the YYYY-MM-DD format in the database
            value = standardize_date_for_db(value)
            if not value:
                conn.close()
                return jsonify({"error": "Failed to convert birthdate to standard format"}), 400

        if key == "first_visit_date" and value:  # Handle first_visit_date proper formatting
            value = standardize_date_for_db(value)
            if not value:
                conn.close()
                return jsonify({"error": "Invalid first_visit_date format"}), 400

        # Preserve fields as-is, without converting case
        # This ensures fields like 'Gender' with 'Male'/'Female' keep their original case
        fields.append(f"{key}=?")
        values.append(value)

    patient_updated = False
    goals_updated = False

    try:
        # Begin transaction
        cursor.execute("BEGIN TRANSACTION")

        # Update patient information if there are fields to update
        if fields:
            # Update patient information
            sql = f"UPDATE patients SET {', '.join(fields)} WHERE client_id=?"
            values.append(client_id)

            cursor.execute(sql, tuple(values))
            patient_updated = cursor.rowcount > 0

        # Handle goals update if goals data is provided
        if goals_data and isinstance(goals_data, dict):
            # Convert boolean/truthy values to 0/1
            processed_goals = {key: 1 if value else 0 for key, value in goals_data.items()}

            if processed_goals:
                # Get the visit date to use for goals - prefer the one in the update if provided
                visit_date_to_use = None

                # Try to use first_visit_date from the update data
                if "first_visit_date" in data and data["first_visit_date"]:
                    visit_date_to_use = standardize_date_for_db(data["first_visit_date"])

                # If not in update data, use the one from the database
                if not visit_date_to_use and "first_visit_date" in patient_data and patient_data["first_visit_date"]:
                    visit_date_to_use = standardize_date_for_db(patient_data["first_visit_date"])

                # If we still don't have a valid date, use the most recent visit date
                if not visit_date_to_use:
                    cursor.execute(
                        "SELECT MAX(visit_date) as latest_visit FROM patient_visits WHERE client_id = ?",
                        (client_id,)
                    )
                    result = cursor.fetchone()
                    if result and result['latest_visit']:
                        visit_date_to_use = result['latest_visit']

                # If we still don't have a valid date, use today's date
                if not visit_date_to_use:
                    visit_date_to_use = datetime.now().strftime("%Y-%m-%d")

                if visit_date_to_use:
                    # Check if goals record exists for this date
                    cursor.execute(
                        "SELECT 1 FROM patients_goals WHERE client_id = ? AND visit_date = ?",
                        (client_id, visit_date_to_use)
                    )

                    if cursor.fetchone():
                        # Update existing goals
                        goal_fields = list(processed_goals.keys())
                        update_parts = [f"{field} = ?" for field in goal_fields]
                        goal_values = list(processed_goals.values())

                        sql = f"UPDATE patients_goals SET {', '.join(update_parts)} WHERE client_id = ? AND visit_date = ?"
                        goal_values.extend([client_id, visit_date_to_use])
                        cursor.execute(sql, tuple(goal_values))
                    else:
                        # Insert new goals record
                        goal_fields = list(processed_goals.keys())
                        placeholders = ", ".join(["?" for _ in processed_goals])
                        goal_values = list(processed_goals.values())

                        sql = f"""
                            INSERT INTO patients_goals (client_id, visit_date, {', '.join(goal_fields)})
                            VALUES (?, ?, {placeholders})
                        """
                        cursor.execute(sql, (client_id, visit_date_to_use) + tuple(goal_values))

                    goals_updated = True

        # Log the update in activity_log if activity tracking is enabled
        try:
            # Get the patient name
            patient_name = f"{patient_data['first_name']} {patient_data['last_name']}"

            # Check if activity_log table exists
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='activity_log'")
            if cursor.fetchone():
                cursor.execute('''
                    INSERT INTO activity_log (activity_type, entity_type, entity_id, entity_name)
                    VALUES (?, ?, ?, ?)
                ''', ('update', 'patient', client_id, patient_name))
        except Exception as log_error:
            # Don't fail the update if logging fails
            print(f"Error logging update activity: {str(log_error)}")

        # Commit all changes
        cursor.execute("COMMIT")

    except Exception as e:
        # Roll back on error
        try:
            cursor.execute("ROLLBACK")
        except:
            pass  # If rollback fails, continue to close connection

        print(f"Error updating patient: {str(e)}")
        import traceback
        traceback.print_exc()

        # Ensure the connection gets closed
        conn.close()

        # Re-raise the exception to be handled by the @handle_errors decorator
        raise e

    # Close the connection after successful transaction
    conn.close()

    if patient_updated or goals_updated:
        return jsonify({
            "message": "Patient updated successfully",
            "patient_updated": patient_updated,
            "goals_updated": goals_updated
        })
    else:
        return jsonify({"message": "No changes made"})

# Delete a patient
@app.route("/patients/<client_id>", methods=["DELETE"])
@handle_errors
def delete_patient(client_id):
    conn = db_connection()
    cursor = conn.cursor()

    # Get the patient name before deleting
    cursor.execute("SELECT first_name || ' ' || last_name as name FROM patients WHERE client_id = ?", (client_id,))
    patient = cursor.fetchone()

    if not patient:
        conn.close()
        return jsonify({"error": "Patient not found"}), 404

    patient_name = patient["name"]

    # Begin transaction
    cursor.execute("BEGIN TRANSACTION")
    try:
        # Delete related records
        cursor.execute("DELETE FROM patient_visits WHERE client_id = ?", (client_id,))
        cursor.execute("DELETE FROM patients_goals WHERE client_id = ?", (client_id,))
        cursor.execute("DELETE FROM patients WHERE client_id = ?", (client_id,))

        # Log the deletion in activity_log
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='activity_log'")
        if cursor.fetchone():
            cursor.execute('''
                INSERT INTO activity_log (activity_type, entity_type, entity_id, entity_name)
                VALUES (?, ?, ?, ?)
            ''', ('delete', 'patient', client_id, patient_name))

        cursor.execute("COMMIT")
    except Exception as e:
        cursor.execute("ROLLBACK")
        conn.close()
        raise e

    conn.close()
    return jsonify({"message": "Patient deleted successfully"})

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

    # Standardize the visit date to YYYY-MM-DD format
    original_visit_date = data.get("visit_date")
    visit_date = standardize_date_for_db(original_visit_date)

    if not visit_date:
        conn.close()
        return jsonify({
                           "error": f"Invalid visit_date format: {original_visit_date}. Use YYYY-MM-DD, MM/DD/YYYY, or other standard date formats"}), 400

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
    data["visit_date"] = standardize_date_for_db(data["visit_date"])
    if not data["visit_date"]:
        return jsonify({"error": "Invalid visit date format. Please use YYYY-MM-DD format."}), 400

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

    # Calculate BMI if height and weight are provided
    height = data.get("height")
    weight = data.get("weight")

    if height is not None and weight is not None:
        # Calculate BMI on the backend
        data["bmi"] = calculate_bmi(height, weight)

    # Create a clean copy of data without the goals field for the visit table
    visit_data_dict = {k: v for k, v in data.items() if k != "goals"}

    # Prepare data for insertion, handling nulls appropriately
    visit_data = [
        client_id,
        visit_data_dict["visit_date"],
        visit_data_dict["visit_time"],  # Add visit_time
        visit_data_dict.get("event_type"),
        visit_data_dict.get("referral_source"),
        visit_data_dict.get("follow_up"),
        visit_data_dict.get("hra"),
        visit_data_dict.get("edu"),
        visit_data_dict.get("case_management"),
        visit_data_dict.get("systolic"),
        visit_data_dict.get("diastolic"),
        visit_data_dict.get("cholesterol"),
        visit_data_dict.get("fasting"),
        visit_data_dict.get("glucose"),
        visit_data_dict.get("height"),
        visit_data_dict.get("weight"),
        visit_data_dict.get("bmi"),  # Now calculated on the backend
        visit_data_dict.get("a1c"),
        visit_data_dict.get("acquired_by")
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
            # Standardize the visit date to YYYY-MM-DD format
            standardized_visit_date = standardize_date_for_db(data["visit_date"])

            if standardized_visit_date:
                # Create a new goals record with visit_id reference
                cursor.execute(f'''
                    INSERT INTO patients_goals (
                        client_id, visit_date, visit_id, {", ".join(goals_data.keys())}
                    )
                    VALUES (?, ?, ?, {", ".join(["?" for _ in goals_data])})
                ''', (client_id, standardized_visit_date, visit_id) + tuple(goals_data.values()))
            else:
                print(f"Error: Could not convert visit date '{data['visit_date']}' to YYYY-MM-DD format")
            conn.commit()

    cursor.execute("SELECT first_name || ' ' || last_name as name FROM patients WHERE client_id = ?", (client_id,))
    patient_name = cursor.fetchone()["name"]
    log_activity('create', 'visit', str(visit_id), patient_name, f"Visit date: {data['visit_date']}")

    conn.close()
    return jsonify({
        "message": "Visit added successfully",
        "visit_id": visit_id,
        "visit_time": data["visit_time"],
        "goals_added": "goals" in data and bool(data["goals"]),
        "bmi": data.get("bmi")  # Include calculated BMI in response
    }), 201


# Update a patient's visit
@app.route("/patients/<client_id>/visits/<int:visit_id>", methods=["PATCH"])
@handle_errors
def update_patient_visit(client_id, visit_id):
    data = request.json
    if not data:
        return jsonify({"error": "No data provided"}), 400

    # Validate numeric fields
    numeric_fields = ["systolic", "diastolic", "cholesterol", "glucose", "height", "weight", "a1c"]
    for field in numeric_fields:
        if field in data and data[field] is not None:
            try:
                data[field] = float(data[field])
            except (ValueError, TypeError):
                return jsonify({"error": f"{field} must be a number"}), 400
    if "visit_date" in data:
        # Ensure the visit_date is in YYYY-MM-DD format
        data["visit_date"] = standardize_date_for_db(data["visit_date"])
        if not data["visit_date"]:
            return jsonify({"error": "Invalid visit date format. Please use YYYY-MM-DD format."}), 400

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

    # Calculate BMI if height and weight are present
    if "height" in data or "weight" in data:
        # Get current height and weight if not in update data
        if "height" not in data or "weight" not in data:
            cursor.execute(
                "SELECT height, weight FROM patient_visits WHERE client_id = ? AND id = ?",
                (client_id, visit_id)
            )
            current_data = cursor.fetchone()

            height = data.get("height", current_data["height"])
            weight = data.get("weight", current_data["weight"])
        else:
            height = data.get("height")
            weight = data.get("weight")

        # Calculate and add BMI to update data
        if height is not None and weight is not None:
            data["bmi"] = calculate_bmi(height, weight)

    # Dynamically build the UPDATE query based on provided fields
    fields = []
    values = []

    # Create a copy of data without the goals field for the visit table update
    visit_data_dict = {k: v for k, v in data.items() if k != "goals"}

    for key, value in visit_data_dict.items():
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
            # Standardize the visit date to YYYY-MM-DD format
            standardized_visit_date = standardize_date_for_db(data["visit_date"])

            if standardized_visit_date:
                # Build and execute the query
                cursor.execute(f'''
                    INSERT INTO patients_goals (client_id, visit_date, visit_id, {", ".join(goals_data.keys())})
                    VALUES (?, ?, ?, {", ".join(["?" for _ in goals_data])})
                    ON CONFLICT(client_id, visit_date) DO UPDATE SET
                    visit_id = excluded.visit_id,
                    {", ".join([f"{goal} = excluded.{goal}" for goal in goals_data.keys()])}
                ''', (client_id, standardized_visit_date, visit_id) + tuple(goals_data.values()))
            else:
                print(f"Error: Could not convert visit date '{data['visit_date']}' to YYYY-MM-DD format")
            conn.commit()

    conn.close()

    return jsonify({
        "message": "Visit updated successfully",
        "rows_affected": rows_affected,
        "goals_updated": "goals" in data and bool(data["goals"]),
        "bmi_calculated": "bmi" in data
    })


@app.route("/patients/<client_id>/visits/<int:visit_id>", methods=["DELETE"])
@handle_errors
def delete_patient_visit(client_id, visit_id):
    conn = db_connection()
    cursor = conn.cursor()

    # First get the patient name and visit date
    cursor.execute('''
        SELECT p.first_name || ' ' || p.last_name as patient_name, v.visit_date
        FROM patient_visits v
        JOIN patients p ON v.client_id = p.client_id
        WHERE v.client_id = ? AND v.id = ?
    ''', (client_id, visit_id))
    
    visit_info = cursor.fetchone()
    
    if not visit_info:
        conn.close()
        return jsonify({"error": "Visit not found"}), 404

    # Begin transaction for atomicity
    cursor.execute("BEGIN TRANSACTION")
    try:
        # Delete the visit
        cursor.execute(
            "DELETE FROM patient_visits WHERE client_id = ? AND id = ?",
            (client_id, visit_id)
        )

        # Delete associated goals
        cursor.execute(
            "DELETE FROM patients_goals WHERE client_id = ? AND visit_date = ?",
            (client_id, visit_info["visit_date"])
        )
        
        # Add to activity log
        cursor.execute('''
            INSERT INTO activity_log (activity_type, entity_type, entity_id, entity_name, additional_info)
            VALUES (?, ?, ?, ?, ?)
        ''', ('delete', 'visit', str(visit_id), visit_info["patient_name"], f"Visit date: {visit_info['visit_date']}"))

        # Commit changes
        cursor.execute("COMMIT")
    except Exception as e:
        cursor.execute("ROLLBACK")
        conn.close()
        raise e

    conn.close()
    return jsonify({"message": "Visit and corresponding goals deleted successfully"})

# --------- DASHBOARD ENDPOINTS ---------
# --------- DASHBOARD ENDPOINTS ---------
@app.route("/dashboard/metrics", methods=["GET"])
@handle_errors
def get_dashboard_metrics():
    """
    Get dashboard metrics including:
    - Total patients count with percentage change
    - New patients within date range with percentage change
    - Total visits within date range with percentage change
    - Follow-up compliance percentage with change
    """
    # Get date range from query parameters
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')

    # If no dates provided, default to today and 6 months ago
    today = datetime.now()
    if not end_date:
        end_date = today.strftime("%Y-%m-%d")
    if not start_date:
        start_date = (today - timedelta(days=180)).strftime("%Y-%m-%d")

    # Get comparison period (for calculating percentage changes)
    comparison_start = request.args.get('comparison_start')
    comparison_end = request.args.get('comparison_end')

    # Validate dates
    for date_str in [start_date, end_date, comparison_start, comparison_end]:
        if date_str and not is_valid_date(date_str):
            return jsonify({"error": f"Invalid date format: {date_str}. Use YYYY-MM-DD"}), 400

    # If no comparison period is provided, calculate previous 6 months before the start date
    if not comparison_start or not comparison_end:
        try:
            start_dt = datetime.strptime(start_date, "%Y-%m-%d")
            comparison_end = (start_dt - timedelta(days=1)).strftime("%Y-%m-%d")
            comparison_start = (start_dt - timedelta(days=180)).strftime("%Y-%m-%d")
        except ValueError:
            # If any error occurs, use reasonable defaults
            comparison_end = (today - timedelta(days=181)).strftime("%Y-%m-%d")
            comparison_start = (today - timedelta(days=360)).strftime("%Y-%m-%d")

    conn = db_connection()
    cursor = conn.cursor()

    # --- 1. Total Patients ---
    # Current total patients count
    cursor.execute("SELECT COUNT(*) as count FROM patients")
    total_patients = cursor.fetchone()["count"]

    # Calculate total patients percentage change
    total_patients_change = calculate_patient_growth(cursor, start_date, end_date, comparison_start, comparison_end)

    # --- 2. New Patients in Date Range ---
    new_patients_count = 0
    new_patients_change = 0

    if start_date and end_date:
        # Count patients whose first_visit_date is within the selected range
        cursor.execute("""
            SELECT COUNT(*) as count FROM patients 
            WHERE strftime('%Y-%m-%d', first_visit_date) BETWEEN ? AND ?
        """, (start_date, end_date))
        new_patients_count = cursor.fetchone()["count"]

        # Calculate new patients percentage change
        if comparison_start and comparison_end:
            cursor.execute("""
                SELECT COUNT(*) as count FROM patients 
                WHERE strftime('%Y-%m-%d', first_visit_date) BETWEEN ? AND ?
            """, (comparison_start, comparison_end))

            previous_new_patients = cursor.fetchone()["count"]
            if previous_new_patients > 0:
                new_patients_change = ((new_patients_count - previous_new_patients) / previous_new_patients) * 100
            elif new_patients_count > 0:
                new_patients_change = 100  # If previous was 0 and current is not, that's a 100% increase
            else:
                new_patients_change = 0

    # --- 3. Total Visits ---
    visits_count = 0
    visits_change = 0

    if start_date and end_date:
        cursor.execute("""
            SELECT COUNT(*) as count FROM patient_visits 
            WHERE visit_date BETWEEN ? AND ?
        """, (start_date, end_date))
        visits_count = cursor.fetchone()["count"]

        # Calculate visits percentage change
        if comparison_start and comparison_end:
            cursor.execute("""
                SELECT COUNT(*) as count FROM patient_visits 
                WHERE visit_date BETWEEN ? AND ?
            """, (comparison_start, comparison_end))

            previous_visits = cursor.fetchone()["count"]
            if previous_visits > 0:
                visits_change = ((visits_count - previous_visits) / previous_visits) * 100
            elif visits_count > 0:
                visits_change = 100  # If previous was 0 and current is not, that's a 100% increase
            else:
                visits_change = 0

    # --- 4. Follow-up Compliance ---
    compliance_percentage = 0
    compliance_change = 0

    if start_date and end_date:
        # Count total follow-ups scheduled in the date range
        cursor.execute("""
            SELECT COUNT(*) as total,
                   SUM(CASE WHEN follow_up = 'COMPLIANT' THEN 1 ELSE 0 END) as compliant
            FROM patient_visits 
            WHERE visit_date BETWEEN ? AND ?
        """, (start_date, end_date))

        result = cursor.fetchone()
        total_follow_ups = result["total"]
        compliant_follow_ups = result["compliant"] or 0  # Note: lowercase "compliant" as the alias in the SQL

        if total_follow_ups > 0:
            compliance_percentage = (compliant_follow_ups / total_follow_ups) * 100

        # Calculate compliance percentage change
        if comparison_start and comparison_end:
            cursor.execute("""
                SELECT COUNT(*) as total,
                       SUM(CASE WHEN follow_up = 'COMPLIANT' THEN 1 ELSE 0 END) as compliant
                FROM patient_visits 
                WHERE visit_date BETWEEN ? AND ?
            """, (comparison_start, comparison_end))

            prev_result = cursor.fetchone()
            prev_total = prev_result["total"]
            prev_compliant = prev_result["compliant"] or 0  # Note: lowercase "compliant" as the alias

            prev_percentage = (prev_compliant / prev_total) * 100 if prev_total > 0 else 0
            if prev_percentage > 0:
                compliance_change = compliance_percentage - prev_percentage
            elif compliance_percentage > 0:
                compliance_change = compliance_percentage  # Absolute change if previous was 0

    conn.close()

    return jsonify({
        "total_patients": {
            "count": total_patients,
            "change_percentage": round(total_patients_change, 1) if total_patients_change is not None else None
        },
        "new_patients": {
            "count": new_patients_count,
            "change_percentage": round(new_patients_change, 1) if new_patients_change is not None else None
        },
        "total_visits": {
            "count": visits_count,
            "change_percentage": round(visits_change, 1) if visits_change is not None else None
        },
        "follow_up_compliance": {
            "percentage": round(compliance_percentage, 1),
            "change_percentage": round(compliance_change, 1) if compliance_change is not None else None
        },
        "timeframe": {
            "start_date": start_date,
            "end_date": end_date,
            "comparison_start": comparison_start,
            "comparison_end": comparison_end
        }
    })


@app.route("/dashboard/historical-trends", methods=["GET"])
@handle_errors
def get_historical_trends():
    """
    Get historical trends data for dashboard metrics:
    - Patient growth
    - New patient registrations
    - Visit counts
    - Follow-up compliance

    Returns data suitable for sparkline visualization
    """
    # Get parameters
    points = request.args.get('points', default=7, type=int)  # Number of data points to return
    end_date = request.args.get('end_date')  # End date for the period

    # Validate parameters
    if points < 2 or points > 24:  # Reasonable limits
        points = 7  # Default to 7 points

    # If no end date provided, use today
    if not end_date or not is_valid_date(end_date):
        end_date = datetime.now().strftime("%Y-%m-%d")

    # Calculate time intervals based on points
    # For 7 points or less, use weekly intervals
    # For 8-14 points, use bi-weekly intervals
    # For 15+ points, use monthly intervals
    if points <= 7:
        interval_days = 7  # Weekly
    elif points <= 14:
        interval_days = 14  # Bi-weekly
    else:
        interval_days = 30  # Monthly

    # Calculate start date based on intervals
    end_date_obj = datetime.strptime(end_date, "%Y-%m-%d")
    start_date_obj = end_date_obj - timedelta(days=interval_days * (points - 1))
    start_date = start_date_obj.strftime("%Y-%m-%d")

    conn = db_connection()
    cursor = conn.cursor()

    # Initialize results data structure
    results = {
        "total_patients": [],
        "new_patients": [],
        "visits": [],
        "follow_up_compliance": [],
        "date_labels": []
    }

    # Generate date points from start to end at our interval
    date_points = []
    current_date = start_date_obj
    while current_date <= end_date_obj:
        date_points.append(current_date.strftime("%Y-%m-%d"))
        current_date += timedelta(days=interval_days)

    # Add the date labels to results
    results["date_labels"] = date_points

    # For each date point, calculate the metrics
    for i, date_point in enumerate(date_points):
        # For start date calculations, use the first date point
        period_start = start_date if i == 0 else date_points[i - 1]
        period_end = date_point

        # 1. Total patients as of this date
        cursor.execute("""
            SELECT COUNT(*) as count FROM patients 
            WHERE strftime('%Y-%m-%d', first_visit_date) <= ?
        """, (period_end,))
        total_patients = cursor.fetchone()["count"]
        results["total_patients"].append(total_patients)

        # 2. New patients in this period
        cursor.execute("""
            SELECT COUNT(*) as count FROM patients 
            WHERE strftime('%Y-%m-%d', first_visit_date) BETWEEN ? AND ?
        """, (period_start, period_end))
        new_patients = cursor.fetchone()["count"]
        results["new_patients"].append(new_patients)

        # 3. Visits in this period
        cursor.execute("""
            SELECT COUNT(*) as count FROM patient_visits 
            WHERE visit_date BETWEEN ? AND ?
        """, (period_start, period_end))
        visits = cursor.fetchone()["count"]
        results["visits"].append(visits)

        # 4. Follow-up compliance
        cursor.execute("""
            SELECT COUNT(*) as total,
                   SUM(CASE WHEN follow_up = 1 THEN 1 ELSE 0 END) as compliant
            FROM patient_visits 
            WHERE visit_date BETWEEN ? AND ?
        """, (period_start, period_end))

        result = cursor.fetchone()
        total_follow_ups = result["total"]
        compliant_follow_ups = result["compliant"] or 0  # Fixed the syntax error here

        compliance_percentage = 0
        if total_follow_ups > 0:
            compliance_percentage = (compliant_follow_ups / total_follow_ups) * 100

        results["follow_up_compliance"].append(round(compliance_percentage, 1))

    conn.close()

    return jsonify({
        "trends": results,
        "timeframe": {
            "start_date": start_date,
            "end_date": end_date,
            "interval_days": interval_days,
            "points": len(date_points)
        }
    })


@app.route("/dashboard/recent-activity", methods=["GET"])
@handle_errors
def get_recent_activity():
    """Get recent activity for the dashboard"""
    limit = request.args.get('limit', default=5, type=int)
    if limit < 1 or limit > 100:
        limit = 5

    conn = db_connection()
    cursor = conn.cursor()

    all_activities = []

    try:
        # Check if direct activities are disabled
        direct_activities_disabled = False
        try:
            cursor.execute("SELECT value FROM system_settings WHERE key = 'disable_direct_activities'")
            result = cursor.fetchone()
            if result and result[0] == 'true':
                direct_activities_disabled = True
                print("Direct activities are disabled")
        except Exception as e:
            print(f"Error checking direct_activities_disabled: {str(e)}")

        # Check if activity_log table exists and get activities from it
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='activity_log'")
        if cursor.fetchone():
            # Get activities from the activity log
            cursor.execute("""
                SELECT activity_type, entity_type, entity_id, entity_name, 
                       datetime(timestamp) as date, additional_info, id
                FROM activity_log
                ORDER BY id DESC
                LIMIT ?
            """, (limit,))

            activities = cursor.fetchall()
            for activity in activities:
                activity_dict = dict(activity)

                # Format description based on activity type
                if activity_dict["activity_type"] == "create":
                    if activity_dict["entity_type"] == "patient":
                        description = f"New patient registered: {activity_dict['entity_name']}"
                    elif activity_dict["entity_type"] == "visit":
                        description = f"New visit for: {activity_dict['entity_name']}"
                    else:
                        description = f"Created {activity_dict['entity_type']} for: {activity_dict['entity_name']}"

                elif activity_dict["activity_type"] == "update":
                    description = f"Updated {activity_dict['entity_type']}: {activity_dict['entity_name']}"

                elif activity_dict["activity_type"] == "delete":
                    description = f"Deleted {activity_dict['entity_type']}: {activity_dict['entity_name']}"
                    if activity_dict.get("additional_info"):
                        description += f" ({activity_dict['additional_info']})"

                else:  # For any other activity types
                    description = f"{activity_dict['activity_type'].capitalize()} {activity_dict['entity_type']}: {activity_dict['entity_name']}"

                # Format date and time
                date_parts = activity_dict["date"].split(" ")
                date = date_parts[0]
                time = date_parts[1] if len(date_parts) > 1 else None

                all_activities.append({
                    "type": activity_dict["activity_type"],
                    "entity_type": activity_dict["entity_type"],
                    "patient_name": activity_dict["entity_name"],
                    "client_id": activity_dict["entity_id"] if activity_dict["entity_type"] == "patient" else None,
                    "date": date,
                    "time": time,
                    "description": description,
                    "sort_id": int(activity_dict["id"])
                })

        # If direct activities are not disabled, get activities from other tables
        if not direct_activities_disabled:
            # 1. Get recent new patients
            cursor.execute("""
                SELECT 'create' as activity_type, first_name || ' ' || last_name as name, 
                       first_visit_date as date, client_id, rowid
                FROM patients
                ORDER BY rowid DESC
                LIMIT ?
            """, (limit,))

            new_patients = cursor.fetchall()
            for patient in new_patients:
                patient_dict = dict(patient)
                all_activities.append({
                    "type": "create",
                    "entity_type": "patient",
                    "patient_name": patient_dict["name"],
                    "client_id": patient_dict["client_id"],
                    "date": patient_dict["date"],
                    "description": f"New patient registered: {patient_dict['name']}",
                    "sort_id": int(patient_dict["rowid"])
                })

            # Similar logic for visits and goals...

        # Sort all activities by sort_id in descending order (newest first)
        all_activities.sort(key=lambda x: x.get("sort_id", 0), reverse=True)

        # Remove sort_id before returning to client
        for activity in all_activities:
            if "sort_id" in activity:
                del activity["sort_id"]

        # Limit to the requested number
        all_activities = all_activities[:limit]

        # Debug: Print what activities we're returning
        print(f"Returning {len(all_activities)} activities:", all_activities)

    except Exception as e:
        print(f"Error in get_recent_activity: {str(e)}")
        import traceback
        traceback.print_exc()
        raise e
    finally:
        conn.close()

    return jsonify({
        "activities": all_activities
    })

@app.route("/dashboard/clear-activities", methods=["POST"])
@handle_errors
def clear_activities():
    """Clear all activity sources completely"""
    conn = db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("BEGIN TRANSACTION")

        # 1. Clear the activity_log table if it exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='activity_log'")
        if cursor.fetchone():
            cursor.execute("DELETE FROM activity_log")
            print("Cleared activity_log table")

        # 2. Create or update a setting that disables showing direct table activities
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='system_settings'")
        if not cursor.fetchone():
            cursor.execute('''
            CREATE TABLE IF NOT EXISTS system_settings (
                key TEXT PRIMARY KEY,
                value TEXT,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
            ''')

        # Set a flag to indicate that direct activities should be ignored
        current_time = datetime.now().isoformat()
        cursor.execute('''
        INSERT INTO system_settings (key, value, updated_at)
        VALUES ('disable_direct_activities', 'true', ?)
        ON CONFLICT(key) DO UPDATE SET
            value = excluded.value,
            updated_at = excluded.updated_at
        ''', (current_time,))

        cursor.execute("COMMIT")

        return jsonify({"message": "All activities successfully cleared"})
    except Exception as e:
        cursor.execute("ROLLBACK")
        print(f"Error clearing activities: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Failed to clear activities: {str(e)}"}), 500
    finally:
        conn.close()
# ----- Helper functions -----

def is_valid_date(date_str):
    """Validate if a string is in YYYY-MM-DD format"""
    try:
        datetime.strptime(date_str, "%Y-%m-%d")
        return True
    except ValueError:
        return False


def calculate_patient_growth(cursor, start_date, end_date, comparison_start, comparison_end):
    """Calculate percentage growth in patient count"""
    # If no date range specified, calculate overall growth (comparing to last month)
    if not start_date or not end_date:
        # Get current total
        cursor.execute("SELECT COUNT(*) as current_count FROM patients")
        current_count = cursor.fetchone()["current_count"]

        # Get count from one month ago
        one_month_ago = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
        cursor.execute("""
            SELECT COUNT(*) as previous_count FROM patients 
            WHERE first_visit_date < ?
        """, (one_month_ago,))

        previous_count = cursor.fetchone()["previous_count"]

        if previous_count > 0:
            return ((current_count - previous_count) / previous_count) * 100
        return None

    # If comparison period not provided, we can't calculate growth
    if not comparison_start or not comparison_end:
        return None

    # Get patient count as of the end date
    cursor.execute("""
        SELECT COUNT(*) as current_count FROM patients 
        WHERE strftime('%Y-%m-%d', first_visit_date) <= ?
    """, (end_date,))

    current_count = cursor.fetchone()["current_count"]

    # Get patient count as of the end of the comparison period
    cursor.execute("""
        SELECT COUNT(*) as previous_count FROM patients 
        WHERE strftime('%Y-%m-%d', first_visit_date) <= ?
    """, (comparison_end,))

    previous_count = cursor.fetchone()["previous_count"]

    if previous_count > 0:
        return ((current_count - previous_count) / previous_count) * 100
    elif current_count > 0:
        return 100  # If previous was 0 and current is not, that's a 100% increase

    return 0



# --------- SERVE REACT STATIC FILES (AFTER BUILD) ---------
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    # Skip API routes
    if path.startswith('/'):
        return jsonify({"error": "Not found"}), 404

    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')

# Run the app
if __name__ == "__main__":
    app.run(debug=True, port=5000)  # Runs locally on http://127.0.0.1:5000/