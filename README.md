# Finance App

A comprehensive finance management application that helps users track their expenses, manage bank statements, and analyze their spending patterns.

## Features

- Upload and process bank statements (PDF)
- Automatic transaction categorization
- Expense tracking and analysis
- Interactive dashboard with charts and graphs
- Transaction filtering and search
- Export transactions to CSV
- RESTful API for frontend integration

## Tech Stack

### Backend
- FastAPI - Modern, fast web framework for building APIs
- SQLAlchemy - SQL toolkit and ORM
- PDFPlumber - PDF text extraction
- Streamlit - Web application framework for data visualization
- Pandas - Data manipulation and analysis
- Plotly - Interactive data visualization

### Frontend
- React Native - Mobile application framework
- React Navigation - Navigation library
- Axios - HTTP client
- React Native Paper - Material Design components

## Setup

### Backend Setup

1. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
cd backend
pip install -r requirements.txt
```

3. Run the FastAPI server:
```bash
uvicorn main:app --reload
```

4. Run the Streamlit app:
```bash
streamlit run main.py
```

### Frontend Setup

1. Install dependencies:
```bash
cd frontend
npm install
```

2. Start the development server:
```bash
npm start
```

## API Endpoints

### Transactions
- `GET /api/transactions` - Get all transactions
- `POST /api/transactions` - Create a new transaction
- `GET /api/transactions/category/{category}` - Get transactions by category

### Accounts
- `GET /api/accounts` - Get account balances

### Statements
- `POST /api/upload-statement` - Upload and process a statement

### Vendor Mappings
- `GET /api/vendor-mappings` - Get all vendor mappings
- `POST /api/vendor-mappings` - Create a new vendor mapping

### Data Management
- `DELETE /api/clear-data` - Clear all data from the database

## Database Schema

### Transaction
- id (Integer, Primary Key)
- date (DateTime)
- details (String)
- amount (Float)
- category (String)
- transaction_type (String)
- pdf_file_id (Integer, Foreign Key)
- bank (String)
- statement_type (String)

### PDFFile
- id (Integer, Primary Key)
- original_filename (String)
- month_year (String)
- upload_date (DateTime)
- content (Text)
- opening_balance (Float)
- closing_balance (Float)
- account (String)
- bank (String)
- statement_type (String)

### VendorMapping
- id (Integer, Primary Key)
- vendor_substring (String)
- category (String)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 