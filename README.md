# HHI-Bonner-JCAP

# Healthcare Information Management System (HIMS)

A comprehensive solution for healthcare organizations to manage patient records, visits, health metrics, and administrative functions.

https://github.com/user-attachments/assets/3af34dca-7b5b-46eb-9557-b01e786ef0e4


## 🌟 Features

- **Patient Management**: Complete patient profiles with demographic information, contact details, and medical history
- **Visit Tracking**: Record and analyze patient visits with comprehensive health metrics
- **Health Goal Monitoring**: Track patient health goals and improvements over time
- **Analytics Dashboard**: Real-time data visualization of patient metrics and organizational KPIs
- **Reporting System**: Generate detailed reports on patient demographics, health trends, and operational metrics
- **Smart Search**: Quick access to patient records with powerful search functionality
- **Financial Management**: Budget tracking and service utilization statistics

## 🚀 Technology Stack

- **Frontend**: React, TypeScript, TailwindCSS, Recharts
- **Backend**: Python, Flask, SQLite
- **Data Processing**: Pandas, NumPy
- **Authentication**: JWT-based authentication system
- **Testing**: Jest, Pytest

## 📋 Installation

### Prerequisites

- Python 3.9+
- Node.js 16+
- npm or yarn

## 📊 Data Extraction and Migration

The system includes a data migration utility (`parse_to_db.py`) that can extract patient information from Excel files and import it into the SQLite database with proper normalization.

```bash
python parse_to_db.py
```

## 📈 Reporting Capabilities

The reporting module (`reports.py`) enables generating various reports:
- Patient demographics
- Health metric trends
- Service utilization
- Financial performance

## 🔧 API Documentation

The system provides a comprehensive RESTful API for all functionality:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/patients` | GET | Retrieve all patients with pagination |
| `/patients` | POST | Create a new patient |
| `/patients/:clientId` | GET | Get a specific patient's details |
| `/patients/:clientId` | PATCH | Update a patient's information |
| `/patients/:clientId` | DELETE | Remove a patient record |
| `/patients/:clientId/visits` | GET | Get all visits for a patient |
| `/patients/:clientId/visits` | POST | Add a new visit for a patient |
| `/patients/:clientId/goals` | GET | Get a patient's health goals |
| `/dashboard/metrics` | GET | Retrieve dashboard metrics |
| `/dashboard/recent-activity` | GET | Get recent system activity |
| `/reports/comprehensive-summary` | GET | Generate a comprehensive report |

## 🔐 Security

The system is designed with security in mind:
- Data encryption for sensitive information
- Role-based access control
- Comprehensive audit logging
- HIPAA-compliant data handling


## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.


