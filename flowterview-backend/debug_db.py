import sys

sys.path.append("/Users/varadudi/Desktop/proxy/Hexagon-A/flowterview-backend")

from dotenv import load_dotenv

from storage.db_manager import DatabaseManager

# Load environment variables
load_dotenv()

db = DatabaseManager()


def debug_database():
    print("=" * 50)
    print("DATABASE DEBUGGING")
    print("=" * 50)

    print("\n1. Candidates in database:")
    try:
        candidates = db.fetch_all("candidates")
        if candidates:
            for c in candidates:
                print(
                    f"Email: {c.get('email')}, ID: {c.get('id')}, Org: {c.get('organization_id')}"
                )
        else:
            print("No candidates found")
    except Exception as e:
        print(f"Error fetching candidates: {str(e)}")

    print("\n2. Interviews in database:")
    try:
        interviews = db.fetch_all("interviews")
        if interviews:
            for i in interviews:
                print(f"ID: {i.get('id')}, Title: {i.get('title')}, Status: {i.get('status')}")
        else:
            print("No interviews found")
    except Exception as e:
        print(f"Error fetching interviews: {str(e)}")

    print("\n3. Jobs in database:")
    try:
        jobs = db.fetch_all("jobs")
        if jobs:
            for j in jobs:
                print(f"ID: {j.get('id')}, Title: {j.get('title')}")
        else:
            print("No jobs found")
    except Exception as e:
        print(f"Error fetching jobs: {str(e)}")

    print("\n4. Verification tokens in database:")
    try:
        tokens = db.fetch_all("verification_tokens")
        if tokens:
            for t in tokens:
                print(
                    f"Email: {t.get('email')}, Token: {t.get('token')[:10]}..., Expires: {t.get('expires_at')}"
                )
        else:
            print("No verification tokens found")
    except Exception as e:
        print(f"Error fetching verification tokens: {str(e)}")

    print("=" * 50)


if __name__ == "__main__":
    debug_database()
