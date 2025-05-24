import time
from typing import Any, Dict, List, Optional

from supabase import create_client

from src.core.config import Config
from src.utils.logger import logger


class DatabaseError(Exception):
    """Custom exception for database-related errors."""

    pass


class DatabaseManager:
    """Database manager for Supabase with connection retry logic"""

    MAX_RETRIES = 3
    RETRY_DELAY = 2
    _instance = None

    def __init__(self):
        """Initialize instance variables. Will only run once per singleton instance."""
        pass

    def __new__(cls):
        """Implement singleton pattern without multiprocessing lock"""
        if cls._instance is None:
            instance = super(DatabaseManager, cls).__new__(cls)
            instance.initialized = False
            instance.connected = False
            instance.supabase_url = Config.SUPABASE_URL
            instance.supabase_key = Config.SUPABASE_KEY
            instance.supabase = None

            if not instance.initialized:
                if instance.initialize_connection():
                    instance.initialized = True
                    logger.info("Database initialization complete")
            cls._instance = instance
        return cls._instance

    def initialize_connection(self) -> bool:
        """Initialize Supabase connection with retry logic."""
        if self.initialized:
            return self.connected

        if not self.supabase_url or not self.supabase_key:
            logger.error("SUPABASE_PROJECT or SUPABASE_API_KEY not set")
            return False

        retries = 0
        while retries < self.MAX_RETRIES:
            try:
                self.supabase = create_client(self.supabase_url, self.supabase_key)
                self.supabase.auth.get_user()
                self.connected = True
                logger.info("Supabase connection initialized successfully")
                return True

            except Exception as e:
                retries += 1
                logger.error(f"Supabase initialization attempt {retries} failed: {e}")
                if retries < self.MAX_RETRIES:
                    time.sleep(self.RETRY_DELAY)
                    continue
                logger.error("All Supabase initialization attempts failed")
                self.connected = False
                return False

    def close(self) -> None:
        """Close the Supabase connection."""
        if self.supabase:
            self.connected = False
            self.supabase = None
            logger.info("Supabase connection released")

    def execute_query(self, table: str, data: Dict, returning: str = "id") -> Dict:
        """Insert data into a table."""
        if not self.connected:
            raise ConnectionError("Supabase not connected")

        try:
            result = self.supabase.table(table).insert(data).execute()
            logger.debug(f"Data inserted successfully into {table}")
            return result.data[0] if result.data else {}
        except Exception as e:
            logger.error(f"Error inserting data: {e}")
            raise DatabaseError(f"Data insertion failed: {e}")

    def execute_many(self, table: str, data_list: List[Dict]) -> List[Dict]:
        """Insert multiple rows into a table."""
        if not self.connected:
            raise ConnectionError("Supabase not connected")

        try:
            result = self.supabase.table(table).insert(data_list).execute()
            logger.debug(
                f"Batch insert executed successfully with {len(data_list)} items"
            )
            return result.data
        except Exception as e:
            logger.error(f"Error executing batch insert: {e}")
            raise DatabaseError(f"Batch insert failed: {e}")

    def fetch_one(
        self, table: str, query_params: Dict = None, select: str = "*"
    ) -> Optional[Dict]:
        """Fetch a single row from a table with optional query parameters."""
        if not self.connected:
            raise ConnectionError("Supabase not connected")

        try:
            query = self.supabase.table(table).select(select)

            if query_params:
                for key, value in query_params.items():
                    query = query.eq(key, value)

            result = query.limit(1).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            logger.error(f"Error fetching data: {e}")
            raise DatabaseError(f"Data fetch failed: {e}")

    def fetch_all(
        self,
        table: str,
        query_params: Dict = None,
        select: str = "*",
        order_by: str = None,
        limit: int = None,
        offset: int = None,
        eq_filters: Dict = None,
    ) -> List[Dict]:
        """
        Fetch multiple rows from a table with optional query parameters.

        Args:
            table: Table name
            query_params: Filter conditions (DEPRECATED - use eq_filters)
            select: Fields to select (supports JOIN syntax like "*, jobs!inner(title)")
            order_by: Order by clause (str or tuple(column, desc))
            limit: Maximum number of records to return
            offset: Number of records to skip
            eq_filters: Advanced filter conditions (supports joined table filters like {"jobs.organization_id": "value"})

        Returns:
            List of records (supports nested data from JOINs)
        """
        if not self.connected:
            raise ConnectionError("Supabase not connected")

        try:
            query = self.supabase.table(table).select(select)

            # Handle legacy query_params for backward compatibility
            if query_params:
                for key, value in query_params.items():
                    query = query.eq(key, value)

            # Handle advanced eq_filters (supports joined table filtering)
            if eq_filters:
                for key, value in eq_filters.items():
                    query = query.eq(key, value)

            if order_by:
                # Support both simple and complex order_by
                if isinstance(order_by, str):
                    query = query.order(order_by)
                elif isinstance(order_by, tuple) and len(order_by) == 2:
                    # Support (column, desc=True/False)
                    column, desc = order_by
                    query = query.order(column, desc=desc)

            if limit:
                query = query.limit(limit)

            if offset:
                query = query.offset(offset)

            result = query.execute()
            return result.data
        except Exception as e:
            logger.error(f"Error fetching data: {e}")
            raise DatabaseError(f"Data fetch failed: {e}")

    def update(self, table: str, data: Dict, query_params: Dict) -> List[Dict]:
        """Update rows in a table that match the query parameters."""
        if not self.connected:
            raise ConnectionError("Supabase not connected")

        try:
            query = self.supabase.table(table).update(data)

            for key, value in query_params.items():
                query = query.eq(key, value)

            result = query.execute()
            return result.data
        except Exception as e:
            logger.error(f"Error updating data: {e}")
            raise DatabaseError(f"Data update failed: {e}")

    def delete(self, table: str, query_params: Dict) -> List[Dict]:
        """Delete rows from a table that match the query parameters."""
        if not self.connected:
            raise ConnectionError("Supabase not connected")

        try:
            query = self.supabase.table(table).delete()

            for key, value in query_params.items():
                query = query.eq(key, value)

            result = query.execute()
            return result.data
        except Exception as e:
            logger.error(f"Error deleting data: {e}")
            raise DatabaseError(f"Data deletion failed: {e}")

    def fetch_scalar(self, table: str, column: str, query_params: Dict = None) -> Any:
        """Fetch a single value from a table."""
        if not self.connected:
            raise ConnectionError("Supabase not connected")

        try:
            result = self.fetch_one(table, query_params, select=column)
            return result.get(column) if result else None
        except Exception as e:
            logger.error(f"Error fetching scalar result: {e}")
            raise DatabaseError(f"Query fetch failed: {e}")
