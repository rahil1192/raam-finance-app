# main.py - Shared backend logic and utilities only. No Streamlit code.
import fitz  # PyMuPDF
import sys
import pandas as pd
import pdfplumber
import re
import os
import json
import plotly.express as px
from datetime import datetime
import logging
from pathlib import Path
import yaml
from typing import Dict, List, Optional, Union, Tuple
import traceback
import io
import numpy as np
from pdf2image import convert_from_bytes
import pytesseract
from PIL import Image
import cv2
from sklearn.cluster import DBSCAN
import layoutparser as lp
from models import (
    get_db, save_transaction, get_all_transactions, save_vendor_mapping,
    get_all_vendor_mappings, update_transaction_category, init_db,
    save_pdf_file, get_pdf_files, get_pdf_content, PDFFile, VendorMapping,
    clear_all_data, get_latest_statement_balance, Transaction,
    SessionLocal, update_transaction_details, CategoryMapping
)
from transaction_utils import apply_category_to_similar_transactions
import jwt
from sqlalchemy.orm import Session

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

# Utility functions, data processing, and logic only below.
# No Streamlit code, no database session or initialization at global scope.
# Do not call ensure_vendor_mappings or import_vendor_mappings at the global scope.

# (All your shared functions and logic remain here, but nothing should run on import)
