import streamlit as st
import pandas as pd
import plotly.express as px
import yaml
from pathlib import Path
import logging
from models import get_db, get_all_transactions, get_all_vendor_mappings, PDFFile, VendorMapping, init_db

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('app.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Initialize database tables if needed (won't recreate if they exist)
init_db()

def load_config() -> dict:
    config_path = Path("config.yaml")
    if not config_path.exists():
        default_config = {
            "ui": {
                "page_title": "Finance Categorizer",
                "layout": "wide",
                "theme": "light"
            },
            "processing": {
                "max_file_size_mb": 10,
                "supported_file_types": ["pdf"],
                "date_format": "%Y-%m-%d"
            }
        }
        with open(config_path, "w") as f:
            yaml.dump(default_config, f)
        return default_config
    with open(config_path, "r") as f:
        return yaml.safe_load(f)

CONFIG = load_config()

# Page configuration
st.set_page_config(
    page_title=CONFIG["ui"]["page_title"],
    layout=CONFIG["ui"]["layout"],
    initial_sidebar_state="expanded"
)

# Initialize session state variables if they don't exist
if "selected_statement" not in st.session_state:
    st.session_state.selected_statement = None
if "active_tab" not in st.session_state:
    st.session_state.active_tab = "reconcile"
if "all_pdf_files" not in st.session_state:
    st.session_state.all_pdf_files = None
if "target_tab_for_navigation" not in st.session_state:
    st.session_state.target_tab_for_navigation = "expenses"

# Add your Streamlit UI code here, importing any shared logic from main.py as needed.
st.title("💰 Finance Statement Categorizer")

# Example: Load transactions and display
with next(get_db()) as db:
    transactions = get_all_transactions(db)
    st.write("All Transactions", transactions) 