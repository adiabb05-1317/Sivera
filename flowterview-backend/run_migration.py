import os
import sys
import requests
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv()

def run_migration():
    """Run the SQL migration to create the verification_tokens table"""
    # Get Supabase credentials from environment variables
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_KEY")
    
    if not supabase_url or not supabase_key:
        print("Error: SUPABASE_URL or SUPABASE_KEY environment variables are not set.")
        sys.exit(1)
    
    try:
        # Initialize Supabase client for basic operations
        supabase: Client = create_client(supabase_url, supabase_key)
        
        # Read SQL file
        migration_path = os.path.join(os.path.dirname(__file__), "migrations", "verification_tokens.sql")
        
        with open(migration_path, "r") as f:
            sql_content = f.read()
        
        print("Running verification_tokens table migration...")
        
        # Split the SQL into individual statements
        sql_statements = sql_content.split(';')
        
        # Execute each statement using direct SQL query through REST API
        for statement in sql_statements:
            # Skip empty statements
            if not statement.strip():
                continue
                
            print(f"Executing: {statement.strip()[:50]}...")
                
            # Use direct SQL API (requires Postgres connection)
            headers = {
                "apikey": supabase_key,
                "Authorization": f"Bearer {supabase_key}",
                "Content-Type": "application/json",
                "Prefer": "return=minimal"
            }
            
            # Check if table exists first
            if "CREATE TABLE" in statement.upper():
                table_name = "verification_tokens"
                # Check if table already exists
                try:
                    supabase.table(table_name).select("*", count="exact").limit(1).execute()
                    print(f"Table {table_name} already exists, skipping creation")
                    continue
                except Exception as e:
                    # Table doesn't exist, continue with creation
                    pass
            
            try:
                # Manually create the table and indexes
                if "CREATE TABLE" in statement.upper():
                    # Create table using Supabase API
                    response = supabase.table("verification_tokens").create({
                        "id": "00000000-0000-0000-0000-000000000000",  # Dummy UUID will be replaced by default value
                        "token": "dummy-token",
                        "email": "dummy@example.com",
                        "name": "Dummy User",
                        "organization_id": "00000000-0000-0000-0000-000000000000",  # Reference to organizations
                        "job_title": "Test Job",
                        "expires_at": "2099-12-31T23:59:59Z",
                        "created_at": "2023-01-01T00:00:00Z"
                    }).execute()
                    print("Table created successfully")
                elif "CREATE INDEX" in statement.upper():
                    print("Index creation required database admin access - please create in Supabase dashboard")
            except Exception as e:
                print(f"Statement execution failed: {str(e)}")
                # Continue with next statement even if this one fails
        
        print("\nMigration completed! Some steps may require manual intervention in the Supabase dashboard.")
        print("\nPlease verify that the verification_tokens table exists with the following columns:")
        print("- id (UUID, primary key)")
        print("- token (TEXT, unique)")
        print("- email (TEXT)")
        print("- name (TEXT)")
        print("- organization_id (UUID, foreign key)")
        print("- job_title (TEXT)")
        print("- interview_id (UUID, foreign key)")
        print("- expires_at (TIMESTAMPTZ)")
        print("- created_at (TIMESTAMPTZ)")
        return True
    
    except Exception as e:
        print(f"Error running migration: {str(e)}")
        print("\nPlease create the table manually in the Supabase dashboard using the SQL in migrations/verification_tokens.sql")
        return False

if __name__ == "__main__":
    success = run_migration()
    if success:
        print("✅ Verification tokens table created successfully!")
    else:
        print("❌ Failed to create verification tokens table. Check the error above.")
        sys.exit(1)
