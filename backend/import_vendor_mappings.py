from models import SessionLocal, import_vendor_mappings

if __name__ == "__main__":
    db = SessionLocal()
    count = import_vendor_mappings(db)
    print(f"Imported {count} vendor mappings.")
    db.close() 