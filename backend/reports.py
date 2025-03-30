import os
from datetime import datetime, timedelta
from flask import Blueprint, Flask, request, jsonify
import sqlite3
from dotenv import load_dotenv
import functools
import traceback

from flask_cors import CORS

app = Flask(__name__)
CORS(app, resources={r"/reports/*": {"origins": "*"}})
# Load environment variables
load_dotenv()
DB_FILE = os.getenv("DB_FILE", "database/patient_records.db")

# Create Blueprint for reporting endpoints
reporting = Blueprint('reporting', __name__, url_prefix='/reports')


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


# --------- REPORT AGGREGATION ---------

# Modified route to support date range instead of just year
@reporting.route('/comprehensive-summary', methods=['GET'])
@handle_errors
def comprehensive_summary():
    """
    Get a fully comprehensive summary for a specified date range
    Query parameters:
      - start_date (required): Start date in YYYY-MM-DD format
      - end_date (required): End date in YYYY-MM-DD format
    """
    # Get required date parameters
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    # Validate parameters
    if not start_date or not end_date:
        return jsonify({"error": "Both start_date and end_date parameters are required"}), 400
    
    if not is_valid_date(start_date) or not is_valid_date(end_date):
        return jsonify({"error": "Invalid date format. Use YYYY-MM-DD format"}), 400
    
    # Check if end_date is after start_date
    if start_date > end_date:
        return jsonify({"error": "End date must be after start date"}), 400
    
    # Collect all report data for the specified date range
    try:
        # Original data endpoints
        gender_data = gender_distribution_by_date(start_date, end_date).json
        follow_up_data = follow_up_compliance_by_date(start_date, end_date).json
        zipcode_data = zipcode_distribution_by_date(start_date, end_date).json
        event_data = event_attendance_by_date(start_date, end_date).json
        response = rescreening_stats_range(start_date, end_date)
        if isinstance(response, tuple):
            rescreening_data = response[0].json
        else:
            # It's just the Flask response
            rescreening_data = response.json
        service_data = service_totals_by_date(start_date, end_date).json
        age_data = age_distribution_by_date(start_date, end_date).json
        
        # New data endpoints
        race_data = race_distribution_by_date(start_date, end_date).json
        language_data = language_distribution_by_date(start_date, end_date).json
        health_improvement_data = health_improvements_by_date(start_date, end_date).json
        weight_data = weight_changes_by_date(start_date, end_date).json
        bmi_data = bmi_changes_by_date(start_date, end_date).json
        
        # Extract the year from the start date for backward compatibility
        year = datetime.strptime(start_date, "%Y-%m-%d").year
        
        # Combine all data into a single comprehensive report that maintains
        # compatibility with the original yearly summary structure
        summary = {
            'date_range': {
                'start_date': start_date,
                'end_date': end_date
            },
            'year': year,  # Include for backward compatibility
            'report_date': datetime.now().strftime('%Y-%m-%d'),
            
            # Original data fields for backward compatibility
            'gender_distribution': gender_data['gender_distribution'],
            'follow_up_compliance': follow_up_data['compliance_stats'],
            'zipcode_distribution': {
                'zipcodes': zipcode_data['zipcode_distribution'][:10],  # Top 10 zipcodes
                'regions': zipcode_data['region_distribution']
            },
            'event_attendance': event_data['event_attendance'],
            'rescreening': {
                'acquisition_methods': rescreening_data.get('acquisition_methods', []),
                'metrics': rescreening_data.get('rescreening_statistics', [])
            },
            'services': service_data['service_breakdown'],
            'age_distribution': age_data['age_distribution'],
            
            # New data fields
            'demographics': {
                'race_distribution': race_data['race_distribution'],
                'language_distribution': language_data['language_distribution']
            },
            
            'health_improvements': {
                'metrics': health_improvement_data.get('improvement_metrics', []),
                'eligible_patients': health_improvement_data.get('total_eligible_patients', 0)
            },
            
            'weight_changes': {
                'loss': weight_data.get('weight_loss', {
                    'count': 0, 
                    'percentage': 0, 
                    'total_pounds_lost': 0, 
                    'average_loss_per_client': 0
                }),
                'gain': weight_data.get('weight_gain', {
                    'count': 0, 
                    'percentage': 0, 
                    'total_pounds_gained': 0, 
                    'average_gain_per_client': 0
                }),
                'maintained': weight_data.get('maintained_weight', {
                    'count': 0, 
                    'percentage': 0
                })
            },
            
            'bmi_changes': {
                'decrease': bmi_data.get('bmi_decrease', {
                    'count': 0, 
                    'percentage': 0, 
                    'total_bmi_decrease': 0, 
                    'average_decrease_per_client': 0
                }),
                'increase': bmi_data.get('bmi_increase', {
                    'count': 0, 
                    'percentage': 0, 
                    'total_bmi_increase': 0, 
                    'average_increase_per_client': 0
                }),
                'maintained': bmi_data.get('maintained_bmi', {
                    'count': 0, 
                    'percentage': 0
                })
            },
            
            # Combine totals from both original and new data
            'totals': {
                'patients': gender_data['total_patients'],
                'visits': event_data['total_visits'],
                'services': service_data['total_services'],
                'eligible_for_improvements': health_improvement_data.get('total_eligible_patients', 0)
            }
        }
        
        return jsonify(summary)
    except Exception as e:
        return jsonify({'error': str(e), 'traceback': str(traceback.format_exc())}), 500


# Keep the original year-based endpoint for backward compatibility
@reporting.route('/comprehensive-summary/<year>', methods=['GET'])
@handle_errors
def comprehensive_summary_by_year(year):
    """Get a fully comprehensive yearly summary (legacy endpoint)"""
    # Convert year to date range
    start_date, end_date = get_year_date_range(year)
    
    # Redirect to the new date-based endpoint
    return comprehensive_summary_with_dates(start_date, end_date, year)


def comprehensive_summary_with_dates(start_date, end_date, year=None):
    """Internal helper to generate comprehensive summary with date range"""
    try:
        # Original data endpoints
        gender_data = gender_distribution_by_date(start_date, end_date).json
        follow_up_data = follow_up_compliance_by_date(start_date, end_date).json
        zipcode_data = zipcode_distribution_by_date(start_date, end_date).json
        event_data = event_attendance_by_date(start_date, end_date).json
        rescreening_data = rescreening_stats_by_date(start_date, end_date).json
        service_data = service_totals_by_date(start_date, end_date).json
        age_data = age_distribution_by_date(start_date, end_date).json
        
        # New data endpoints
        race_data = race_distribution_by_date(start_date, end_date).json
        language_data = language_distribution_by_date(start_date, end_date).json
        health_improvement_data = health_improvements_by_date(start_date, end_date).json
        weight_data = weight_changes_by_date(start_date, end_date).json
        bmi_data = bmi_changes_by_date(start_date, end_date).json
        
        # Use provided year or extract year from start date
        year_to_use = year or datetime.strptime(start_date, "%Y-%m-%d").year
        
        # Combine all data into a single comprehensive report
        summary = {
            'year': year_to_use,
            'date_range': {
                'start_date': start_date,
                'end_date': end_date
            },
            'report_date': datetime.now().strftime('%Y-%m-%d'),
            
            # Original data fields for backward compatibility
            'gender_distribution': gender_data['gender_distribution'],
            'follow_up_compliance': follow_up_data['compliance_stats'],
            'zipcode_distribution': {
                'zipcodes': zipcode_data['zipcode_distribution'][:10],  # Top 10 zipcodes
                'regions': zipcode_data['region_distribution']
            },
            'event_attendance': event_data['event_attendance'],
            'rescreening': {
                'acquisition_methods': rescreening_data.get('acquisition_methods', []),
                'metrics': rescreening_data.get('rescreening_statistics', [])
            },
            'services': service_data['service_breakdown'],
            'age_distribution': age_data['age_distribution'],
            
            # New data fields
            'demographics': {
                'race_distribution': race_data['race_distribution'],
                'language_distribution': language_data['language_distribution']
            },
            
            'health_improvements': {
                'metrics': health_improvement_data.get('improvement_metrics', []),
                'eligible_patients': health_improvement_data.get('total_eligible_patients', 0)
            },
            
            'weight_changes': {
                'loss': weight_data.get('weight_loss', {
                    'count': 0, 
                    'percentage': 0, 
                    'total_pounds_lost': 0, 
                    'average_loss_per_client': 0
                }),
                'gain': weight_data.get('weight_gain', {
                    'count': 0, 
                    'percentage': 0, 
                    'total_pounds_gained': 0, 
                    'average_gain_per_client': 0
                }),
                'maintained': weight_data.get('maintained_weight', {
                    'count': 0, 
                    'percentage': 0
                })
            },
            
            'bmi_changes': {
                'decrease': bmi_data.get('bmi_decrease', {
                    'count': 0, 
                    'percentage': 0, 
                    'total_bmi_decrease': 0, 
                    'average_decrease_per_client': 0
                }),
                'increase': bmi_data.get('bmi_increase', {
                    'count': 0, 
                    'percentage': 0, 
                    'total_bmi_increase': 0, 
                    'average_increase_per_client': 0
                }),
                'maintained': bmi_data.get('maintained_bmi', {
                    'count': 0, 
                    'percentage': 0
                })
            },
            
            # Combine totals from both original and new data
            'totals': {
                'patients': gender_data['total_patients'],
                'visits': event_data['total_visits'],
                'services': service_data['total_services'],
                'eligible_for_improvements': health_improvement_data.get('total_eligible_patients', 0)
            }
        }
        
        return jsonify(summary)
    except Exception as e:
        return jsonify({'error': str(e), 'traceback': str(traceback.format_exc())}), 500


# --------- DATABASE UTILITIES ---------

def db_connection():
    """Create and return a database connection with row factory"""
    conn = sqlite3.connect(DB_FILE, isolation_level=None)  # autocommit mode
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    return conn


# --------- HELPER FUNCTIONS ---------

def get_year_date_range(year):
    """Convert year to start and end dates"""
    try:
        year = int(year)
        start_date = f"{year}-01-01"
        end_date = f"{year}-12-31"
        return start_date, end_date
    except ValueError:
        raise ValueError(f"Invalid year format: {year}")


def is_valid_date(date_str):
    """Validate if a string is in YYYY-MM-DD format"""
    try:
        datetime.strptime(date_str, "%Y-%m-%d")
        return True
    except ValueError:
        return False


def calculate_percentage(part, whole):
    """Calculate percentage with proper handling of zero"""
    return round((part / whole) * 100, 1) if whole > 0 else 0.0


# --------- REPORTING ENDPOINTS WITH DATE RANGE SUPPORT ---------

# New route that supports date range
@reporting.route('/gender', methods=['GET'])
@handle_errors
def gender_distribution_range():
    """
    Get gender distribution for a specific date range
    Query parameters:
      - start_date (required): Start date in YYYY-MM-DD format
      - end_date (required): End date in YYYY-MM-DD format
    """
    # Get required date parameters
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    # Validate parameters
    if not start_date or not end_date:
        return jsonify({"error": "Both start_date and end_date parameters are required"}), 400
    
    if not is_valid_date(start_date) or not is_valid_date(end_date):
        return jsonify({"error": "Invalid date format. Use YYYY-MM-DD format"}), 400
    
    # Check if end_date is after start_date
    if start_date > end_date:
        return jsonify({"error": "End date must be after start date"}), 400
    
    return gender_distribution_by_date(start_date, end_date)


# Keep the original year-based endpoint for backward compatibility
@reporting.route('/gender/<year>', methods=['GET'])
@handle_errors
def gender_distribution(year):
    """Get gender distribution for a specific year"""
    start_date, end_date = get_year_date_range(year)
    return gender_distribution_by_date(start_date, end_date, year)


# Implementation of gender distribution by date range
def gender_distribution_by_date(start_date, end_date, year=None):
    """Internal implementation of gender distribution by date range"""
    conn = db_connection()
    cursor = conn.cursor()
    
    # Get patients who had visits in the specified date range
    cursor.execute("""
        SELECT DISTINCT p.client_id, p.gender
        FROM patient_visits v
        JOIN patients p ON v.client_id = p.client_id
        WHERE v.visit_date BETWEEN ? AND ?
    """, (start_date, end_date))
    
    patients = cursor.fetchall()
    
    # Count by gender
    gender_counts = {}
    for patient in patients:
        gender = patient['gender'] or 'Unknown'
        gender_counts[gender] = gender_counts.get(gender, 0) + 1
    
    total_patients = len(patients)
    
    # Calculate percentages
    gender_stats = []
    for gender, count in gender_counts.items():
        gender_stats.append({
            'gender': gender,
            'count': count,
            'percentage': calculate_percentage(count, total_patients)
        })
    
    # Sort by count (descending)
    gender_stats.sort(key=lambda x: x['count'], reverse=True)
    
    conn.close()
    
    # Use provided year or extract year from start date
    year_to_use = year or datetime.strptime(start_date, "%Y-%m-%d").year
    
    return jsonify({
        'year': year_to_use,
        'date_range': {
            'start_date': start_date,
            'end_date': end_date
        },
        'total_patients': total_patients,
        'gender_distribution': gender_stats
    })


# New route that supports date range
@reporting.route('/follow-up-compliance', methods=['GET'])
@handle_errors
def follow_up_compliance_range():
    """
    Get follow-up compliance statistics for a specific date range
    Query parameters:
      - start_date (required): Start date in YYYY-MM-DD format
      - end_date (required): End date in YYYY-MM-DD format
    """
    # Get required date parameters
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    # Validate parameters
    if not start_date or not end_date:
        return jsonify({"error": "Both start_date and end_date parameters are required"}), 400
    
    if not is_valid_date(start_date) or not is_valid_date(end_date):
        return jsonify({"error": "Invalid date format. Use YYYY-MM-DD format"}), 400
    
    # Check if end_date is after start_date
    if start_date > end_date:
        return jsonify({"error": "End date must be after start date"}), 400
    
    return follow_up_compliance_by_date(start_date, end_date)


# Keep the original year-based endpoint for backward compatibility
@reporting.route('/follow-up-compliance/<year>', methods=['GET'])
@handle_errors
def follow_up_compliance(year):
    """Get follow-up compliance statistics for a specific year"""
    start_date, end_date = get_year_date_range(year)
    return follow_up_compliance_by_date(start_date, end_date, year)


# Implementation of follow-up compliance by date range
def follow_up_compliance_by_date(start_date, end_date, year=None):
    """Internal implementation of follow-up compliance by date range"""
    conn = db_connection()
    cursor = conn.cursor()
    
    # Count compliant vs non-compliant patients directly using the follow_up field
    cursor.execute("""
        SELECT 
            COUNT(DISTINCT client_id) as total_patients,
            SUM(CASE WHEN follow_up = 'COMPLIANT' THEN 1 ELSE 0 END) as compliant_count
        FROM (
            SELECT client_id, follow_up
            FROM patient_visits
            WHERE visit_date BETWEEN ? AND ?
            GROUP BY client_id
        )
    """, (start_date, end_date))
    
    result = cursor.fetchone()
    total_patients = result['total_patients']
    compliant_count = result['compliant_count'] or 0  # Handle NULL
    non_compliant_count = total_patients - compliant_count
    
    conn.close()
    
    # Use provided year or extract year from start date
    year_to_use = year or datetime.strptime(start_date, "%Y-%m-%d").year
    
    return jsonify({
        'year': year_to_use,
        'date_range': {
            'start_date': start_date,
            'end_date': end_date
        },
        'total_patients': total_patients,
        'compliance_stats': {
            'compliant': {
                'description': 'Patients with COMPLIANT status',
                'count': compliant_count,
                'percentage': calculate_percentage(compliant_count, total_patients)
            },
            'non_compliant': {
                'description': 'Patients with NON-COMPLIANT or missing status',
                'count': non_compliant_count,
                'percentage': calculate_percentage(non_compliant_count, total_patients)
            }
        }
    })


# New route that supports date range
@reporting.route('/zipcode-distribution', methods=['GET'])
@handle_errors
def zipcode_distribution_range():
    """
    Get distribution of patients by zip code for a specific date range
    Query parameters:
      - start_date (required): Start date in YYYY-MM-DD format
      - end_date (required): End date in YYYY-MM-DD format
    """
    # Get required date parameters
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    # Validate parameters
    if not start_date or not end_date:
        return jsonify({"error": "Both start_date and end_date parameters are required"}), 400
    
    if not is_valid_date(start_date) or not is_valid_date(end_date):
        return jsonify({"error": "Invalid date format. Use YYYY-MM-DD format"}), 400
    
    # Check if end_date is after start_date
    if start_date > end_date:
        return jsonify({"error": "End date must be after start date"}), 400
    
    return zipcode_distribution_by_date(start_date, end_date)


# Keep the original year-based endpoint for backward compatibility
@reporting.route('/zipcode-distribution/<year>', methods=['GET'])
@handle_errors
def zipcode_distribution(year):
    """Get distribution of patients by zip code for a specific year"""
    start_date, end_date = get_year_date_range(year)
    return zipcode_distribution_by_date(start_date, end_date, year)


# Implementation of zipcode distribution by date range
def zipcode_distribution_by_date(start_date, end_date, year=None):
    """Internal implementation of zipcode distribution by date range"""
    conn = db_connection()
    cursor = conn.cursor()
    
    # Get unique patients who had visits in the specified date range
    cursor.execute("""
        SELECT DISTINCT p.client_id, p.zipcode
        FROM patient_visits v
        JOIN patients p ON v.client_id = p.client_id
        WHERE v.visit_date BETWEEN ? AND ?
    """, (start_date, end_date))
    
    patients = cursor.fetchall()
    
    # Count by zipcode
    zipcode_counts = {}
    for patient in patients:
        zipcode = patient['zipcode'] or 'Unknown'
        zipcode_counts[zipcode] = zipcode_counts.get(zipcode, 0) + 1
    
    total_patients = len(patients)
    
    # Calculate percentages
    zipcode_stats = []
    for zipcode, count in zipcode_counts.items():
        zipcode_stats.append({
            'zipcode': zipcode,
            'count': count,
            'percentage': calculate_percentage(count, total_patients)
        })
    
    # Sort by count (descending)
    zipcode_stats.sort(key=lambda x: x['count'], reverse=True)
    
    # Group zipcodes by region (first 3 digits)
    region_counts = {}
    for patient in patients:
        zipcode = patient['zipcode'] or 'Unknown'
        if zipcode != 'Unknown' and len(zipcode) >= 3:
            region = zipcode[:3]
            region_counts[region] = region_counts.get(region, 0) + 1
        else:
            region_counts['Unknown'] = region_counts.get('Unknown', 0) + 1
    
    # Calculate percentages for regions
    region_stats = []
    for region, count in region_counts.items():
        region_stats.append({
            'region': region,
            'count': count,
            'percentage': calculate_percentage(count, total_patients)
        })
    
    # Sort regions by count (descending)
    region_stats.sort(key=lambda x: x['count'], reverse=True)
    
    conn.close()
    
    # Use provided year or extract year from start date
    year_to_use = year or datetime.strptime(start_date, "%Y-%m-%d").year
    
    return jsonify({
        'year': year_to_use,
        'date_range': {
            'start_date': start_date,
            'end_date': end_date
        },
        'total_patients': total_patients,
        'zipcode_distribution': zipcode_stats,
        'region_distribution': region_stats
    })


# New route that supports date range
@reporting.route('/event-attendance', methods=['GET'])
@handle_errors
def event_attendance_range():
    """
    Get attendance statistics for different events in a specific date range
    Query parameters:
      - start_date (required): Start date in YYYY-MM-DD format
      - end_date (required): End date in YYYY-MM-DD format
    """
    # Get required date parameters
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    # Validate parameters
    if not start_date or not end_date:
        return jsonify({"error": "Both start_date and end_date parameters are required"}), 400
    
    if not is_valid_date(start_date) or not is_valid_date(end_date):
        return jsonify({"error": "Invalid date format. Use YYYY-MM-DD format"}), 400
    
    # Check if end_date is after start_date
    if start_date > end_date:
        return jsonify({"error": "End date must be after start date"}), 400
    
    return event_attendance_by_date(start_date, end_date)


# Keep the original year-based endpoint for backward compatibility
@reporting.route('/event-attendance/<year>', methods=['GET'])
@handle_errors
def event_attendance(year):
    """Get attendance statistics for different events in a specific year"""
    start_date, end_date = get_year_date_range(year)
    return event_attendance_by_date(start_date, end_date, year)


# Implementation of event attendance by date range
def event_attendance_by_date(start_date, end_date, year=None):
    """Internal implementation of event attendance by date range"""
    conn = db_connection()
    cursor = conn.cursor()
    
    # Count visits by event type
    cursor.execute("""
        SELECT event_type, COUNT(*) as attendance_count
        FROM patient_visits
        WHERE visit_date BETWEEN ? AND ?
        GROUP BY event_type
    """, (start_date, end_date))
    
    results = cursor.fetchall()
    
    # Transform to list of dicts
    event_stats = []
    total_visits = 0
    
    for result in results:
        event_type = result['event_type'] or 'Not Specified'
        count = result['attendance_count']
        total_visits += count
        
        event_stats.append({
            'event_type': event_type,
            'count': count
        })
    
    # Calculate percentages
    for event in event_stats:
        event['percentage'] = calculate_percentage(event['count'], total_visits)
    
    # Sort by count (descending)
    event_stats.sort(key=lambda x: x['count'], reverse=True)
    
    conn.close()
    
    # Use provided year or extract year from start date
    year_to_use = year or datetime.strptime(start_date, "%Y-%m-%d").year
    
    return jsonify({
        'year': year_to_use,
        'date_range': {
            'start_date': start_date,
            'end_date': end_date
        },
        'total_visits': total_visits,
        'event_attendance': event_stats
    })


# New route that supports date range
@reporting.route('/rescreening-stats', methods=['GET'])
@handle_errors
def rescreening_stats_range():
    """
    Get statistics on rescreening for different health metrics in a specific date range
    Query parameters:
      - start_date (required): Start date in YYYY-MM-DD format
      - end_date (required): End date in YYYY-MM-DD format
    """
    # Get required date parameters
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    # Validate parameters
    if not start_date or not end_date:
        return jsonify({"error": "Both start_date and end_date parameters are required"}), 400
    
    if not is_valid_date(start_date) or not is_valid_date(end_date):
        return jsonify({"error": "Invalid date format. Use YYYY-MM-DD format"}), 400
    
    # Check if end_date is after start_date
    if start_date > end_date:
        return jsonify({"error": "End date must be after start date"}), 400
    
    return rescreening_stats_by_date(start_date, end_date)


# Keep the original year-based endpoint for backward compatibility
@reporting.route('/rescreening-stats/<year>', methods=['GET'])
@handle_errors
def rescreening_stats(year):
    """Get statistics on rescreening for different health metrics in a specific year"""
    start_date, end_date = get_year_date_range(year)
    return rescreening_stats_by_date(start_date, end_date, year)


def rescreening_stats_by_date(start_date, end_date, year=None):
    """Internal implementation of rescreening stats by date range"""
    conn = db_connection()
    cursor = conn.cursor()

    # Get total number of patients who had visits in the date range
    cursor.execute("""
        SELECT COUNT(DISTINCT client_id) as total_patients
        FROM patient_visits
        WHERE visit_date BETWEEN ? AND ?
    """, (start_date, end_date))

    total_patients = cursor.fetchone()['total_patients']

    # Define the acquisition methods we're interested in
    acquisition_method_types = ["SELF-REPORTED", "RESCREENED", "EDUCATION"]

    acquisition_stats = []

    # For each defined acquisition method, count patients
    for method_type in acquisition_method_types:
        cursor.execute("""
            SELECT COUNT(DISTINCT client_id) as count
            FROM patient_visits
            WHERE visit_date BETWEEN ? AND ?
            AND acquired_by = ?
        """, (start_date, end_date, method_type))

        result = cursor.fetchone()
        count = result['count'] if result else 0

        acquisition_stats.append({
            'method': method_type,
            'count': count,
            'percentage': calculate_percentage(count, total_patients)
        })

    # Define metrics to check
    metrics = [
        {"name": "GLUCOSE", "field": "glucose"},
        {"name": "CHOLESTEROL", "field": "cholesterol"},
        {"name": "BLOOD PRESSURE (Systolic)", "field": "systolic"},
        {"name": "BLOOD PRESSURE (Diastolic)", "field": "diastolic"},
        {"name": "BODY MASS INDEX", "field": "bmi"},
        {"name": "A1C", "field": "a1c"}
    ]

    rescreening_results = []

    # For each metric, find patients who were screened and rescreened
    for metric in metrics:
        # Count patients who had this metric measured at least once
        cursor.execute(f"""
            SELECT COUNT(DISTINCT client_id) as screened_count
            FROM patient_visits
            WHERE visit_date BETWEEN ? AND ?
            AND {metric['field']} IS NOT NULL
        """, (start_date, end_date))

        screened_once = cursor.fetchone()['screened_count']

        # Count patients who had this metric measured multiple times
        cursor.execute(f"""
            SELECT COUNT(DISTINCT client_id) as rescreened_count
            FROM (
                SELECT client_id, COUNT(*) as measurement_count
                FROM patient_visits
                WHERE visit_date BETWEEN ? AND ?
                AND {metric['field']} IS NOT NULL
                GROUP BY client_id
                HAVING COUNT(*) > 1
            )
        """, (start_date, end_date))

        rescreened_count = cursor.fetchone()['rescreened_count']

        # Calculate percentage of patients rescreened
        percentage_rescreened = calculate_percentage(rescreened_count, screened_once)

        # Calculate percentage of all patients screened for this metric
        percentage_screened = calculate_percentage(screened_once, total_patients)

        rescreening_results.append({
            'metric': metric['name'],
            'total_patients_screened': screened_once,
            'percentage_screened': percentage_screened,
            'total_patients_rescreened': rescreened_count,
            'percentage_rescreened': percentage_rescreened
        })

    conn.close()

    # Use provided year or extract year from start date
    year_to_use = year or datetime.strptime(start_date, "%Y-%m-%d").year

    return jsonify({
        'year': year_to_use,
        'date_range': {
            'start_date': start_date,
            'end_date': end_date
        },
        'total_patients': total_patients,
        'acquisition_methods': acquisition_stats,
        'rescreening_statistics': rescreening_results
    })

# Implementation of rescreening stats by date range
# New route that supports date range
@reporting.route('/service-totals', methods=['GET'])
@handle_errors
def service_totals_range():
    """
    Get total counts of HRA, Education, and Case Management services for a specific date range
    Query parameters:
      - start_date (required): Start date in YYYY-MM-DD format
      - end_date (required): End date in YYYY-MM-DD format
    """
    # Get required date parameters
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    # Validate parameters
    if not start_date or not end_date:
        return jsonify({"error": "Both start_date and end_date parameters are required"}), 400
    
    if not is_valid_date(start_date) or not is_valid_date(end_date):
        return jsonify({"error": "Invalid date format. Use YYYY-MM-DD format"}), 400
    
    # Check if end_date is after start_date
    if start_date > end_date:
        return jsonify({"error": "End date must be after start date"}), 400
    
    return service_totals_by_date(start_date, end_date)


# Keep the original year-based endpoint for backward compatibility
@reporting.route('/service-totals/<year>', methods=['GET'])
@handle_errors
def service_totals(year):
    """Get total counts of HRA, Education, and Case Management services for a specific year"""
    start_date, end_date = get_year_date_range(year)
    return service_totals_by_date(start_date, end_date, year)


# Implementation of service totals by date range
def service_totals_by_date(start_date, end_date, year=None):
    """Internal implementation of service totals by date range"""
    conn = db_connection()
    cursor = conn.cursor()
    
    # Count unique patients who received HRA services
    cursor.execute("""
        SELECT COUNT(DISTINCT client_id) as hra_total
        FROM patient_visits
        WHERE visit_date BETWEEN ? AND ?
        AND event_type LIKE '%HRA%'
    """, (start_date, end_date))
    
    hra_total = cursor.fetchone()['hra_total']
    
    # Count unique patients who received education services
    cursor.execute("""
        SELECT COUNT(DISTINCT client_id) as edu_total
        FROM patient_visits
        WHERE visit_date BETWEEN ? AND ?
        AND edu IS NOT NULL AND edu != ''
    """, (start_date, end_date))
    
    edu_total = cursor.fetchone()['edu_total']
    
    # Count unique patients who received case management services
    cursor.execute("""
        SELECT COUNT(DISTINCT client_id) as cm_total
        FROM patient_visits
        WHERE visit_date BETWEEN ? AND ?
        AND case_management IS NOT NULL AND case_management != ''
    """, (start_date, end_date))
    
    cm_total = cursor.fetchone()['cm_total']
    
    # Get total services
    total_services = hra_total + edu_total + cm_total
    
    conn.close()
    
    # Use provided year or extract year from start date
    year_to_use = year or datetime.strptime(start_date, "%Y-%m-%d").year
    
    return jsonify({
        'year': year_to_use,
        'date_range': {
            'start_date': start_date,
            'end_date': end_date
        },
        'total_services': total_services,
        'service_breakdown': {
            'hra': {
                'count': hra_total,
                'percentage': calculate_percentage(hra_total, total_services)
            },
            'education': {
                'count': edu_total,
                'percentage': calculate_percentage(edu_total, total_services)
            },
            'case_management': {
                'count': cm_total,
                'percentage': calculate_percentage(cm_total, total_services)
            }
        }
    })


# New route that supports date range
@reporting.route('/age-distribution', methods=['GET'])
@handle_errors
def age_distribution_range():
    """
    Get distribution of patients by age range for a specific date range
    Query parameters:
      - start_date (required): Start date in YYYY-MM-DD format
      - end_date (required): End date in YYYY-MM-DD format
    """
    # Get required date parameters
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    # Validate parameters
    if not start_date or not end_date:
        return jsonify({"error": "Both start_date and end_date parameters are required"}), 400
    
    if not is_valid_date(start_date) or not is_valid_date(end_date):
        return jsonify({"error": "Invalid date format. Use YYYY-MM-DD format"}), 400
    
    # Check if end_date is after start_date
    if start_date > end_date:
        return jsonify({"error": "End date must be after start date"}), 400
    
    return age_distribution_by_date(start_date, end_date)


# Keep the original year-based endpoint for backward compatibility
@reporting.route('/age-distribution/<year>', methods=['GET'])
@handle_errors
def age_distribution(year):
    """Get distribution of patients by age range for a specific year"""
    start_date, end_date = get_year_date_range(year)
    return age_distribution_by_date(start_date, end_date, year)


# Implementation of age distribution by date range
def age_distribution_by_date(start_date, end_date, year=None):
    """Internal implementation of age distribution by date range"""
    conn = db_connection()
    cursor = conn.cursor()
    
    # Get unique patients who had visits in the specified date range with their ages
    cursor.execute("""
        SELECT DISTINCT p.client_id, p.age
        FROM patient_visits v
        JOIN patients p ON v.client_id = p.client_id
        WHERE v.visit_date BETWEEN ? AND ?
    """, (start_date, end_date))
    
    patients = cursor.fetchall()
    
    # Define age ranges
    age_ranges = [
        {"name": "18-24", "min": 18, "max": 24},
        {"name": "25-44", "min": 25, "max": 44},
        {"name": "45-64", "min": 45, "max": 64},
        {"name": "65+", "min": 65, "max": 150}  # Upper limit arbitrarily high
    ]
    
    # Count patients in each age range
    age_stats = []
    total_counted = 0
    
    for age_range in age_ranges:
        count = 0
        for patient in patients:
            # Skip if age is null
            if patient['age'] is None:
                continue
                
            if age_range['min'] <= patient['age'] <= age_range['max']:
                count += 1
                total_counted += 1
        
        age_stats.append({
            'range': age_range['name'],
            'count': count
        })
    
    # Count patients with null/unknown age
    unknown_age_count = len(patients) - total_counted
    if unknown_age_count > 0:
        age_stats.append({
            'range': 'Unknown',
            'count': unknown_age_count
        })
    
    # Calculate percentages
    total_patients = len(patients)
    for age_stat in age_stats:
        age_stat['percentage'] = calculate_percentage(age_stat['count'], total_patients)
    
    conn.close()
    
    # Use provided year or extract year from start date
    year_to_use = year or datetime.strptime(start_date, "%Y-%m-%d").year
    
    return jsonify({
        'year': year_to_use,
        'date_range': {
            'start_date': start_date,
            'end_date': end_date
        },
        'total_patients': total_patients,
        'age_distribution': age_stats
    })


# New route that supports date range
@reporting.route('/race-distribution', methods=['GET'])
@handle_errors
def race_distribution_range():
    """
    Get distribution of patients by race/ethnicity for a specific date range
    Query parameters:
      - start_date (required): Start date in YYYY-MM-DD format
      - end_date (required): End date in YYYY-MM-DD format
    """
    # Get required date parameters
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    # Validate parameters
    if not start_date or not end_date:
        return jsonify({"error": "Both start_date and end_date parameters are required"}), 400
    
    if not is_valid_date(start_date) or not is_valid_date(end_date):
        return jsonify({"error": "Invalid date format. Use YYYY-MM-DD format"}), 400
    
    # Check if end_date is after start_date
    if start_date > end_date:
        return jsonify({"error": "End date must be after start date"}), 400
    
    return race_distribution_by_date(start_date, end_date)


# Keep the original year-based endpoint for backward compatibility
@reporting.route('/race-distribution/<year>', methods=['GET'])
@handle_errors
def race_distribution(year):
    """Get distribution of patients by race/ethnicity for a specific year"""
    start_date, end_date = get_year_date_range(year)
    return race_distribution_by_date(start_date, end_date, year)


# Implementation of race distribution by date range
def race_distribution_by_date(start_date, end_date, year=None):
    """Internal implementation of race distribution by date range"""
    conn = db_connection()
    cursor = conn.cursor()
    
    # Get patients who had visits in the specified date range
    cursor.execute("""
        SELECT DISTINCT p.client_id, p.race
        FROM patient_visits v
        JOIN patients p ON v.client_id = p.client_id
        WHERE v.visit_date BETWEEN ? AND ?
    """, (start_date, end_date))
    
    patients = cursor.fetchall()
    
    # Count by race
    race_counts = {}
    for patient in patients:
        race = patient['race'] or 'Unknown'
        race_counts[race] = race_counts.get(race, 0) + 1
    
    total_patients = len(patients)
    
    # Calculate percentages
    race_stats = []
    for race, count in race_counts.items():
        race_stats.append({
            'race': race,
            'count': count,
            'percentage': calculate_percentage(count, total_patients)
        })
    
    # Sort by count (descending)
    race_stats.sort(key=lambda x: x['count'], reverse=True)
    
    conn.close()
    
    # Use provided year or extract year from start date
    year_to_use = year or datetime.strptime(start_date, "%Y-%m-%d").year
    
    return jsonify({
        'year': year_to_use,
        'date_range': {
            'start_date': start_date,
            'end_date': end_date
        },
        'total_patients': total_patients,
        'race_distribution': race_stats
    })


# New route that supports date range
@reporting.route('/language-distribution', methods=['GET'])
@handle_errors
def language_distribution_range():
    """
    Get distribution of patients by primary language for a specific date range
    Query parameters:
      - start_date (required): Start date in YYYY-MM-DD format
      - end_date (required): End date in YYYY-MM-DD format
    """
    # Get required date parameters
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    # Validate parameters
    if not start_date or not end_date:
        return jsonify({"error": "Both start_date and end_date parameters are required"}), 400
    
    if not is_valid_date(start_date) or not is_valid_date(end_date):
        return jsonify({"error": "Invalid date format. Use YYYY-MM-DD format"}), 400
    
    # Check if end_date is after start_date
    if start_date > end_date:
        return jsonify({"error": "End date must be after start date"}), 400
    
    return language_distribution_by_date(start_date, end_date)



# Implementation of language distribution by date range
def language_distribution_by_date(start_date, end_date, year=None):
    """Internal implementation of language distribution by date range"""
    conn = db_connection()
    cursor = conn.cursor()
    
    # Get patients who had visits in the specified date range
    cursor.execute("""
        SELECT DISTINCT p.client_id, p.primary_lang
        FROM patient_visits v
        JOIN patients p ON v.client_id = p.client_id
        WHERE v.visit_date BETWEEN ? AND ?
    """, (start_date, end_date))
    
    patients = cursor.fetchall()
    
    # Count by language
    language_counts = {}
    for patient in patients:
        language = patient['primary_lang'] or 'Unknown'
        language_counts[language] = language_counts.get(language, 0) + 1
    
    total_patients = len(patients)
    
    # Calculate percentages
    language_stats = []
    for language, count in language_counts.items():
        language_stats.append({
            'language': language,
            'count': count,
            'percentage': calculate_percentage(count, total_patients)
        })
    
    # Sort by count (descending)
    language_stats.sort(key=lambda x: x['count'], reverse=True)
    
    conn.close()
    
    # Use provided year or extract year from start date
    year_to_use = year or datetime.strptime(start_date, "%Y-%m-%d").year
    
    return jsonify({
        'year': year_to_use,
        'date_range': {
            'start_date': start_date,
            'end_date': end_date
        },
        'total_patients': total_patients,
        'language_distribution': language_stats
    })


# New route that supports date range
@reporting.route('/health-improvements', methods=['GET'])
@handle_errors
def health_improvements_range():
    """
    Get statistics on patients who improved their health metrics for a specific date range
    Query parameters:
      - start_date (required): Start date in YYYY-MM-DD format
      - end_date (required): End date in YYYY-MM-DD format
    """
    # Get required date parameters
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    # Validate parameters
    if not start_date or not end_date:
        return jsonify({"error": "Both start_date and end_date parameters are required"}), 400
    
    if not is_valid_date(start_date) or not is_valid_date(end_date):
        return jsonify({"error": "Invalid date format. Use YYYY-MM-DD format"}), 400
    
    # Check if end_date is after start_date
    if start_date > end_date:
        return jsonify({"error": "End date must be after start date"}), 400
    
    return health_improvements_by_date(start_date, end_date)


# Keep the original year-based endpoint for backward compatibility
@reporting.route('/health-improvements/<year>', methods=['GET'])
@handle_errors
def health_improvements(year):
    """Get statistics on patients who improved their health metrics for a specific year"""
    start_date, end_date = get_year_date_range(year)
    return health_improvements_by_date(start_date, end_date, year)


# Implementation of health improvements by date range
def health_improvements_by_date(start_date, end_date, year=None):
    """
    Get statistics on patients who improved their health metrics 
    (lowered glucose, cholesterol, blood pressure, A1C) within a date range
    """
    conn = db_connection()
    cursor = conn.cursor()
    
    # Get total number of patients who had at least two visits in the date range
    cursor.execute("""
        SELECT COUNT(DISTINCT client_id) as total_patients
        FROM patient_visits
        WHERE visit_date BETWEEN ? AND ?
        GROUP BY client_id
        HAVING COUNT(*) >= 2
    """, (start_date, end_date))
    
    patients_with_multiple_visits = cursor.fetchall()
    total_eligible_patients = len(patients_with_multiple_visits)
    
    # If no patients had multiple visits, return early
    if total_eligible_patients == 0:
        conn.close()
        
        # Use provided year or extract year from start date
        year_to_use = year or datetime.strptime(start_date, "%Y-%m-%d").year
        
        return jsonify({
            'year': year_to_use,
            'date_range': {
                'start_date': start_date,
                'end_date': end_date
            },
            'total_eligible_patients': 0,
            'note': 'No patients had multiple visits in this time period, so improvement metrics cannot be calculated.'
        })
    
    # Define metrics to check
    metrics = [
        {"name": "Glucose", "field": "glucose", "good_direction": "lower"},
        {"name": "Cholesterol", "field": "cholesterol", "good_direction": "lower"},
        {"name": "Systolic", "field": "systolic", "good_direction": "lower"},
        {"name": "Diastolic", "field": "diastolic", "good_direction": "lower"},
        {"name": "A1C", "field": "a1c", "good_direction": "lower"}
    ]
    
    improvement_results = []
    
    # For each metric, find patients who showed improvement
    for metric in metrics:
        # Get clients who improved (first visit value > last visit value)
        cursor.execute(f"""
            WITH FirstVisits AS (
                SELECT client_id, {metric['field']}, visit_date,
                ROW_NUMBER() OVER (PARTITION BY client_id ORDER BY visit_date ASC) as visit_rank
                FROM patient_visits
                WHERE visit_date BETWEEN ? AND ?
                AND {metric['field']} IS NOT NULL
            ),
            LastVisits AS (
                SELECT client_id, {metric['field']}, visit_date,
                ROW_NUMBER() OVER (PARTITION BY client_id ORDER BY visit_date DESC) as visit_rank
                FROM patient_visits
                WHERE visit_date BETWEEN ? AND ?
                AND {metric['field']} IS NOT NULL
            )
            SELECT 
                f.client_id,
                f.{metric['field']} as first_value,
                l.{metric['field']} as last_value,
                (f.{metric['field']} - l.{metric['field']}) as improvement
            FROM FirstVisits f
            JOIN LastVisits l ON f.client_id = l.client_id
            WHERE f.visit_rank = 1 AND l.visit_rank = 1
            AND f.{metric['field']} > l.{metric['field']}
        """, (start_date, end_date, start_date, end_date))
        
        improvement_data = cursor.fetchall()
        improved_count = len(improvement_data)
        
        # Calculate average improvement and total improvement
        total_improvement = 0
        for row in improvement_data:
            total_improvement += row['improvement']
        
        avg_improvement = round(total_improvement / improved_count, 2) if improved_count > 0 else 0
        
        # Get total patients who had this metric measured at least twice
        cursor.execute(f"""
            SELECT COUNT(DISTINCT client_id) as count
            FROM patient_visits
            WHERE visit_date BETWEEN ? AND ?
            AND {metric['field']} IS NOT NULL
            GROUP BY client_id
            HAVING COUNT(*) >= 2
        """, (start_date, end_date))
        
        eligible_for_metric = len(cursor.fetchall())
        
        improvement_results.append({
            'metric': metric['name'],
            'eligible_patients': eligible_for_metric,
            'improved_count': improved_count,
            'percentage_improved': calculate_percentage(improved_count, eligible_for_metric),
            'total_improvement': round(total_improvement, 2),
            'average_improvement': avg_improvement
        })
    
    conn.close()
    
    # Use provided year or extract year from start date
    year_to_use = year or datetime.strptime(start_date, "%Y-%m-%d").year
    
    return jsonify({
        'year': year_to_use,
        'date_range': {
            'start_date': start_date,
            'end_date': end_date
        },
        'total_eligible_patients': total_eligible_patients,
        'improvement_metrics': improvement_results
    })


# New route that supports date range
@reporting.route('/weight-changes', methods=['GET'])
@handle_errors
def weight_changes_range():
    """
    Get statistics on patients who lost or gained weight for a specific date range
    Query parameters:
      - start_date (required): Start date in YYYY-MM-DD format
      - end_date (required): End date in YYYY-MM-DD format
    """
    # Get required date parameters
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    # Validate parameters
    if not start_date or not end_date:
        return jsonify({"error": "Both start_date and end_date parameters are required"}), 400
    
    if not is_valid_date(start_date) or not is_valid_date(end_date):
        return jsonify({"error": "Invalid date format. Use YYYY-MM-DD format"}), 400
    
    # Check if end_date is after start_date
    if start_date > end_date:
        return jsonify({"error": "End date must be after start date"}), 400
    
    return weight_changes_by_date(start_date, end_date)


# Keep the original year-based endpoint for backward compatibility
@reporting.route('/weight-changes/<year>', methods=['GET'])
@handle_errors
def weight_changes(year):
    """Get statistics on patients who lost or gained weight for a specific year"""
    start_date, end_date = get_year_date_range(year)
    return weight_changes_by_date(start_date, end_date, year)


# Implementation of weight changes by date range
def weight_changes_by_date(start_date, end_date, year=None):
    """
    Get statistics on patients who lost or gained weight,
    comparing the most recent visit of the date range with their previous visit
    """
    conn = db_connection()
    cursor = conn.cursor()
    
    # Find patients who had a visit in the specified date range AND had at least one previous visit
    weight_loss_data = []
    weight_gain_data = []
    maintained_weight_count = 0
    total_eligible_patients = 0
    
    # Get all patients with visits in the specified date range
    cursor.execute("""
        SELECT DISTINCT client_id
        FROM patient_visits
        WHERE visit_date BETWEEN ? AND ?
    """, (start_date, end_date))
    
    patients_in_range = cursor.fetchall()
    
    # For each patient, find their most recent visit in the date range and their most recent visit before that
    for patient in patients_in_range:
        client_id = patient['client_id']
        
        # Get most recent visit with weight in the specified date range
        cursor.execute("""
            SELECT weight, visit_date
            FROM patient_visits
            WHERE client_id = ?
            AND visit_date BETWEEN ? AND ?
            AND weight IS NOT NULL
            ORDER BY visit_date DESC
            LIMIT 1
        """, (client_id, start_date, end_date))
        
        current_visit = cursor.fetchone()
        if not current_visit:
            continue  # Skip if no weight data in this date range
        
        # Get most recent visit with weight before this visit
        cursor.execute("""
            SELECT weight, visit_date
            FROM patient_visits
            WHERE client_id = ?
            AND visit_date < ?
            AND weight IS NOT NULL
            ORDER BY visit_date DESC
            LIMIT 1
        """, (client_id, current_visit['visit_date']))
        
        previous_visit = cursor.fetchone()
        if not previous_visit:
            continue  # Skip if no previous weight data
        
        # Now we have two visits to compare - calculate the change
        total_eligible_patients += 1
        current_weight = current_visit['weight']
        previous_weight = previous_visit['weight']
        weight_change = previous_weight - current_weight
        
        if weight_change > 0:  # Weight decreased (loss)
            weight_loss_data.append({
                'client_id': client_id,
                'previous_weight': previous_weight,
                'current_weight': current_weight,
                'weight_loss': weight_change
            })
        elif weight_change < 0:  # Weight increased (gain)
            weight_gain_data.append({
                'client_id': client_id,
                'previous_weight': previous_weight,
                'current_weight': current_weight,
                'weight_gain': abs(weight_change)
            })
        else:  # No change
            maintained_weight_count += 1
    
    # Calculate stats
    weight_loss_count = len(weight_loss_data)
    total_weight_loss = sum(item['weight_loss'] for item in weight_loss_data)
    avg_weight_loss = round(total_weight_loss / weight_loss_count, 2) if weight_loss_count > 0 else 0
    
    weight_gain_count = len(weight_gain_data)
    total_weight_gain = sum(item['weight_gain'] for item in weight_gain_data)
    avg_weight_gain = round(total_weight_gain / weight_gain_count, 2) if weight_gain_count > 0 else 0
    
    conn.close()
    
    # Use provided year or extract year from start date
    year_to_use = year or datetime.strptime(start_date, "%Y-%m-%d").year
    
    return jsonify({
        'year': year_to_use,
        'date_range': {
            'start_date': start_date,
            'end_date': end_date
        },
        'total_eligible_patients': total_eligible_patients,
        'weight_loss': {
            'count': weight_loss_count,
            'percentage': calculate_percentage(weight_loss_count, total_eligible_patients),
            'total_pounds_lost': round(total_weight_loss, 2),
            'average_loss_per_client': avg_weight_loss
        },
        'weight_gain': {
            'count': weight_gain_count,
            'percentage': calculate_percentage(weight_gain_count, total_eligible_patients),
            'total_pounds_gained': round(total_weight_gain, 2),
            'average_gain_per_client': avg_weight_gain
        },
        'maintained_weight': {
            'count': maintained_weight_count,
            'percentage': calculate_percentage(maintained_weight_count, total_eligible_patients)
        }
    })


# New route that supports date range
@reporting.route('/bmi-changes', methods=['GET'])
@handle_errors
def bmi_changes_range():
    """
    Get statistics on patients who lowered or increased their BMI for a specific date range
    Query parameters:
      - start_date (required): Start date in YYYY-MM-DD format
      - end_date (required): End date in YYYY-MM-DD format
    """
    # Get required date parameters
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    # Validate parameters
    if not start_date or not end_date:
        return jsonify({"error": "Both start_date and end_date parameters are required"}), 400
    
    if not is_valid_date(start_date) or not is_valid_date(end_date):
        return jsonify({"error": "Invalid date format. Use YYYY-MM-DD format"}), 400
    
    # Check if end_date is after start_date
    if start_date > end_date:
        return jsonify({"error": "End date must be after start date"}), 400
    
    return bmi_changes_by_date(start_date, end_date)


# Keep the original year-based endpoint for backward compatibility
@reporting.route('/bmi-changes/<year>', methods=['GET'])
@handle_errors
def bmi_changes(year):
    """Get statistics on patients who lowered or increased their BMI for a specific year"""
    start_date, end_date = get_year_date_range(year)
    return bmi_changes_by_date(start_date, end_date, year)


# Implementation of bmi changes by date range
def bmi_changes_by_date(start_date, end_date, year=None):
    """
    Get statistics on patients who lowered or increased their BMI,
    comparing the most recent visit of the date range with their previous visit
    """
    conn = db_connection()
    cursor = conn.cursor()
    
    # Find patients who had a visit in the specified date range AND had at least one previous visit
    bmi_decrease_data = []
    bmi_increase_data = []
    maintained_bmi_count = 0
    total_eligible_patients = 0
    
    # Get all patients with visits in the specified date range
    cursor.execute("""
        SELECT DISTINCT client_id
        FROM patient_visits
        WHERE visit_date BETWEEN ? AND ?
    """, (start_date, end_date))
    
    patients_in_range = cursor.fetchall()
    
    # For each patient, find their most recent visit in the date range and their most recent visit before that
    for patient in patients_in_range:
        client_id = patient['client_id']
        
        # Get most recent visit with BMI in the specified date range
        cursor.execute("""
            SELECT bmi, visit_date
            FROM patient_visits
            WHERE client_id = ?
            AND visit_date BETWEEN ? AND ?
            AND bmi IS NOT NULL
            ORDER BY visit_date DESC
            LIMIT 1
        """, (client_id, start_date, end_date))
        
        current_visit = cursor.fetchone()
        if not current_visit:
            continue  # Skip if no BMI data in this date range
        
        # Get most recent visit with BMI before this visit
        cursor.execute("""
            SELECT bmi, visit_date
            FROM patient_visits
            WHERE client_id = ?
            AND visit_date < ?
            AND bmi IS NOT NULL
            ORDER BY visit_date DESC
            LIMIT 1
        """, (client_id, current_visit['visit_date']))
        
        previous_visit = cursor.fetchone()
        if not previous_visit:
            continue  # Skip if no previous BMI data
        
        # Now we have two visits to compare - calculate the change
        total_eligible_patients += 1
        current_bmi = current_visit['bmi']
        previous_bmi = previous_visit['bmi']
        bmi_change = previous_bmi - current_bmi
        
        if bmi_change > 0:  # BMI decreased (improved)
            bmi_decrease_data.append({
                'client_id': client_id,
                'previous_bmi': previous_bmi,
                'current_bmi': current_bmi,
                'bmi_decrease': bmi_change
            })
        elif bmi_change < 0:  # BMI increased
            bmi_increase_data.append({
                'client_id': client_id,
                'previous_bmi': previous_bmi,
                'current_bmi': current_bmi,
                'bmi_increase': abs(bmi_change)
            })
        else:  # No change
            maintained_bmi_count += 1
    
    # Calculate stats
    bmi_decrease_count = len(bmi_decrease_data)
    total_bmi_decrease = sum(item['bmi_decrease'] for item in bmi_decrease_data)
    avg_bmi_decrease = round(total_bmi_decrease / bmi_decrease_count, 2) if bmi_decrease_count > 0 else 0
    
    bmi_increase_count = len(bmi_increase_data)
    total_bmi_increase = sum(item['bmi_increase'] for item in bmi_increase_data)
    avg_bmi_increase = round(total_bmi_increase / bmi_increase_count, 2) if bmi_increase_count > 0 else 0
    
    conn.close()
    
    # Use provided year or extract year from start date
    year_to_use = year or datetime.strptime(start_date, "%Y-%m-%d").year
    
    return jsonify({
        'year': year_to_use,
        'date_range': {
            'start_date': start_date,
            'end_date': end_date
        },
        'total_eligible_patients': total_eligible_patients,
        'bmi_decrease': {
            'count': bmi_decrease_count,
            'percentage': calculate_percentage(bmi_decrease_count, total_eligible_patients),
            'total_bmi_decrease': round(total_bmi_decrease, 2),
            'average_decrease_per_client': avg_bmi_decrease
        },
        'bmi_increase': {
            'count': bmi_increase_count,
            'percentage': calculate_percentage(bmi_increase_count, total_eligible_patients),
            'total_bmi_increase': round(total_bmi_increase, 2),
            'average_increase_per_client': avg_bmi_increase
        },
        'maintained_bmi': {
            'count': maintained_bmi_count,
            'percentage': calculate_percentage(maintained_bmi_count, total_eligible_patients)
        }
    })

    conn = db_connection()
    cursor = conn.cursor()
    
    # Get total number of patients who had visits in the date range
    cursor.execute("""
        SELECT COUNT(DISTINCT client_id) as total_patients
        FROM patient_visits
        WHERE visit_date BETWEEN ? AND ?
    """, (start_date, end_date))
    
    total_patients = cursor.fetchone()['total_patients']
    
    # Define the acquisition methods we're interested in
    acquisition_method_types = ["SELF-REPORTED", "RESCREENED", "EDUCATION"]
    
    acquisition_stats = []
    
    # For each defined acquisition method, count patients
    for method_type in acquisition_method_types:
        cursor.execute("""
            SELECT COUNT(DISTINCT client_id) as count
            FROM patient_visits
            WHERE visit_date BETWEEN ? AND ?
            AND acquired_by = ?
        """, (start_date, end_date, method_type))
        
        result = cursor.fetchone()
        count = result['count'] if result else 0
        
        acquisition_stats.append({
            'method': method_type,
            'count': count,
            'percentage': calculate_percentage(count, total_patients)
        })
    
    # Define metrics to check
    metrics = [
        {"name": "GLUCOSE", "field": "glucose"},
        {"name": "CHOLESTEROL", "field": "cholesterol"},
        {"name": "BLOOD PRESSURE (Systolic)", "field": "systolic"},
        {"name": "BLOOD PRESSURE (Diastolic)", "field": "diastolic"},
        {"name": "BODY MASS INDEX", "field": "bmi"},
        {"name": "A1C", "field": "a1c"}
    ]
    
    rescreening_results = []
    
    # For each metric, find patients who were screened and rescreened
    for metric in metrics:
        # Count patients who had this metric measured at least once
        cursor.execute(f"""
            SELECT COUNT(DISTINCT client_id) as screened_count
            FROM patient_visits
            WHERE visit_date BETWEEN ? AND ?
            AND {metric['field']} IS NOT NULL
        """, (start_date, end_date))
        
        screened_once = cursor.fetchone()['screened_count']
        
        # Count patients who had this metric measured multiple times
        cursor.execute(f"""
            SELECT COUNT(DISTINCT client_id) as rescreened_count
            FROM (
                SELECT client_id, COUNT(*) as measurement_count
                FROM patient_visits
                WHERE visit_date BETWEEN ? AND ?
                AND {metric['field']} IS NOT NULL
                GROUP BY client_id
                HAVING COUNT(*) > 1
            )
        """, (start_date, end_date))
        
        rescreened_count = cursor.fetchone()['rescreened_count']
        
        # Calculate percentage of patients rescreened
        percentage_rescreened = calculate_percentage(rescreened_count, screened_once)
        
        # Calculate percentage of all patients screened for this metric
        percentage_screened = calculate_percentage(screened_once, total_patients)
        
        rescreening_results.append({
            'metric': metric['name'],
            'total_patients_screened': screened_once,
            'percentage_screened': percentage_screened,
            'total_patients_rescreened': rescreened_count,
            'percentage_rescreened': percentage_rescreened
        })
    
    conn.close()
    
    # Use provided year or extract year from start date
    year_to_use = year or datetime.strptime(start_date, "%Y-%m-%d").year
    
    return jsonify({
        'year': year_to_use,
        'date_range': {
            'start_date': start_date,
            'end_date': end_date
        },
        'total_patients': total_patients,
        'acquisition_methods': acquisition_stats,
        'rescreening_statistics': rescreening_results
    })