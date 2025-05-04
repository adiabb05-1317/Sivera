import { useState } from "react";
import { addCandidate, fetchJobs } from "@/lib/supabase-candidates";

export function useJobs() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadJobs() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchJobs();
      setJobs(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return { jobs, loading, error, loadJobs };
}

export function useAddCandidate() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function submitCandidate(candidate: { name: string; email: string; orgEmail: string; jobTitle: string; resumeFile?: File }) {
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      await addCandidate(candidate);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return { submitCandidate, loading, error, success };
}
