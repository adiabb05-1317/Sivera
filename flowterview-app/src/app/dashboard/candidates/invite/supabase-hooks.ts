import { useState } from "react";
import {
  addCandidate,
  addBulkCandidates,
  fetchJobs,
  CandidateStatus,
} from "@/lib/supabase-candidates";

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

  async function submitCandidate(candidate: {
    name: string;
    email: string;
    orgEmail: string;
    jobId: string;
    resumeFile?: File;
    interviewId: string;
  }) {
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

export function useBulkAddCandidates() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [progress, setProgress] = useState<string>("");

  async function submitBulkCandidates(data: {
    candidates: Array<{
      name: string;
      email: string;
      phone: string;
      resumeFile?: File;
      status?: CandidateStatus;
    }>;
    jobId: string;
    interviewId: string;
  }) {
    setLoading(true);
    setError(null);
    setSuccess(false);
    setProgress("Starting bulk upload...");

    try {
      const result = await addBulkCandidates({
        candidates: data.candidates,
        jobId: data.jobId,
        interviewId: data.interviewId,
      });

      setSuccess(true);
      setProgress(`Successfully uploaded ${result.length} candidates`);
      return result;
    } catch (err: any) {
      setError(err.message);
      setProgress("");
      throw err;
    } finally {
      setLoading(false);
    }
  }

  return { submitBulkCandidates, loading, error, success, progress };
}
