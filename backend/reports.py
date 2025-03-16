import os
import sqlite3
from flask import Flask, request, jsonify
from dotenv import load_dotenv

load_dotenv()
app = Flask(__name__)
DB_FILE = os.getenv("DB_FILE", "database/patient_records.db")


# Connect to the database
def db_connection():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn


@app.route("/reports/patients-count", methods=["GET"])
def get_patient_count():
    start_date = request.args.get("start_date")  # Format: MM/DD/YYYY
    end_date = request.args.get("end_date")

    if not start_date or not end_date:
        return jsonify({"error": "start_date and end_date are required"}), 400

    conn = db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT COUNT(*) as total_patients FROM patients 
        WHERE first_visit_date BETWEEN ? AND ?
    """, (start_date, end_date))

    result = cursor.fetchone()
    conn.close()

    return jsonify({"total_patients": result["total_patients"]})


# 📌 **Get Gender Distribution**
@app.route("/reports/gender-distribution", methods=["GET"])
def get_gender_distribution():
    conn = db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) as male_count FROM patients WHERE gender = 'Male'")
    male_count = cursor.fetchone()["male_count"]

    cursor.execute("SELECT COUNT(*) as female_count FROM patients WHERE gender = 'Female'")
    female_count = cursor.fetchone()["female_count"]

    conn.close()

    total = male_count + female_count
    male_percentage = round((male_count / total) * 100, 2) if total else 0
    female_percentage = round((female_count / total) * 100, 2) if total else 0

    return jsonify({
        "total_patients": total,
        "male": male_percentage,
        "female": female_percentage
    })


# 📌 **Count Patients with Improved Health Metrics**
@app.route("/reports/improvements", methods=["GET"])
def get_health_improvements():
    metric = request.args.get("metric")  # e.g., bmi, glucose, systolic
    if not metric:
        return jsonify({"error": "Please provide a health metric"}), 400

    conn = db_connection()
    cursor = conn.cursor()

    cursor.execute(f"""
        SELECT COUNT(*) as improved_count FROM (
            SELECT client_id, 
                LAG({metric}) OVER (PARTITION BY client_id ORDER BY visit_date ASC) as prev_value, 
                {metric} as current_value 
            FROM patient_visits
        ) 
        WHERE current_value < prev_value AND prev_value IS NOT NULL;
    """)

    result = cursor.fetchone()
    conn.close()

    return jsonify({"metric": metric, "improved_patients": result["improved_count"]})


# 📌 **Get Number of Visits Over Time (Graph Data)**
@app.route("/reports/visits-over-time", methods=["GET"])
def get_visits_over_time():
    time_unit = request.args.get("time_unit", "month")  # 'day', 'month', 'year'

    if time_unit not in ["day", "month", "year"]:
        return jsonify({"error": "Invalid time_unit. Choose 'day', 'month', or 'year'"}), 400

    conn = db_connection()
    cursor = conn.cursor()

    date_format = {
        "day": "%m/%d/%Y",
        "month": "%m/%Y",
        "year": "%Y"
    }[time_unit]

    cursor.execute(f"""
        SELECT strftime('{date_format}', visit_date) as period, COUNT(*) as visit_count
        FROM patient_visits
        GROUP BY period
        ORDER BY period ASC;
    """)

    visits = cursor.fetchall()
    conn.close()

    return jsonify({"visits_over_time": [dict(row) for row in visits]})


@app.route("/reports/latest-trends", methods=["GET"])
def get_latest_trends():
    conn = db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT AVG(bmi) as avg_bmi, AVG(glucose) as avg_glucose, AVG(systolic) as avg_systolic, AVG(diastolic) as avg_diastolic 
        FROM patient_visits 
        WHERE visit_date >= date('now', '-3 months')
    """)

    trends = cursor.fetchone()
    conn.close()

    return jsonify({
        "average_bmi": round(trends["avg_bmi"], 2) if trends["avg_bmi"] else None,
        "average_glucose": round(trends["avg_glucose"], 2) if trends["avg_glucose"] else None,
        "average_systolic": round(trends["avg_systolic"], 2) if trends["avg_systolic"] else None,
        "average_diastolic": round(trends["avg_diastolic"], 2) if trends["avg_diastolic"] else None,
    })


if __name__ == "__main__":
    app.run(debug=True, port=5001)  # Running on a separate port
