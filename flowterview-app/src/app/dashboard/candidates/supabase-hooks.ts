import { useState, useEffect } from "react";
import { fetchCandidatesSortedByJob } from "@/lib/supabase-candidates";

export function useCandidatesSortedByJob() {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadCandidates() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCandidatesSortedByJob();
      setCandidates(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCandidates();
  }, []);

  return { candidates, loading, error, reload: loadCandidates };
}
