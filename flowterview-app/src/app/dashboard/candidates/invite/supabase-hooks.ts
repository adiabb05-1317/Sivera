import { useState, useCallback } from "react";
import { toast } from "sonner";
import {
  addCandidate,
  addBulkCandidates,
  fetchJobs,
  fetchCandidatesByJob,
  checkEmailExists,
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
      // Validate email uniqueness before submission
      const emailExists = await checkEmailExists(
        candidate.email,
        candidate.jobId
      );
      if (emailExists) {
        throw new Error("Email already exists for this job");
      }

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
      // Validate email uniqueness before submission
      setProgress("Validating email addresses...");

      const emails = data.candidates.map((c) => c.email);
      const duplicates = new Set<string>();
      const emailSet = new Set<string>();

      // Check for duplicates within the batch
      for (const email of emails) {
        const normalizedEmail = email.toLowerCase().trim();
        if (emailSet.has(normalizedEmail)) {
          duplicates.add(email);
        } else {
          emailSet.add(normalizedEmail);
        }
      }

      if (duplicates.size > 0) {
        throw new Error(
          `Duplicate emails found: ${Array.from(duplicates).join(", ")}`
        );
      }

      // Check against existing candidates in the database
      const validationPromises = emails.map(async (email) => {
        const exists = await checkEmailExists(email, data.jobId);
        return { email, exists };
      });

      const validationResults = await Promise.all(validationPromises);
      const existingEmails = validationResults
        .filter((r) => r.exists)
        .map((r) => r.email);

      if (existingEmails.length > 0) {
        throw new Error(
          `Email(s) already exist for this job: ${existingEmails.join(", ")}`
        );
      }

      setProgress("Email validation passed. Uploading candidates...");

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

export function useEmailValidation() {
  const [validatingEmails, setValidatingEmails] = useState<Set<string>>(
    new Set()
  );
  const [emailErrors, setEmailErrors] = useState<Record<string, string>>({});

  const validateEmail = useCallback(async (email: string, jobId?: string) => {
    if (!email.trim()) {
      setEmailErrors((prev) => ({ ...prev, [email]: "" }));
      return true;
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      const errorMessage = "Invalid email format";
      setEmailErrors((prev) => ({ ...prev, [email]: errorMessage }));
      toast.error("Email validation failed", {
        description: `${email}: ${errorMessage}`,
      });
      return false;
    }

    setValidatingEmails((prev) => new Set(prev).add(email));
    setEmailErrors((prev) => ({ ...prev, [email]: "" }));

    toast.loading("Validating email...", {
      id: `validate-${email}`,
      description: email,
    });

    try {
      const exists = await checkEmailExists(email, jobId);
      if (exists) {
        const errorMessage = jobId
          ? "Email already exists for this job"
          : "Email already exists";
        setEmailErrors((prev) => ({
          ...prev,
          [email]: errorMessage,
        }));
        toast.error("Email validation failed", {
          id: `validate-${email}`,
          description: `${email}: ${errorMessage}`,
        });
        return false;
      }
      toast.success("Email validated", {
        id: `validate-${email}`,
        description: `${email} is available`,
      });
      return true;
    } catch (error) {
      console.error("Email validation error:", error);
      const errorMessage = "Failed to validate email";
      setEmailErrors((prev) => ({
        ...prev,
        [email]: errorMessage,
      }));
      toast.error("Email validation failed", {
        id: `validate-${email}`,
        description: `${email}: ${errorMessage}`,
      });
      return false;
    } finally {
      setValidatingEmails((prev) => {
        const newSet = new Set(prev);
        newSet.delete(email);
        return newSet;
      });
    }
  }, []);

  const validateBulkEmails = useCallback(
    async (emails: string[], jobId?: string) => {
      const duplicates = new Set<string>();
      const emailSet = new Set<string>();
      const validationResults: Record<string, boolean> = {};

      // Check for duplicates within the batch
      for (const email of emails) {
        const normalizedEmail = email.toLowerCase().trim();
        if (emailSet.has(normalizedEmail)) {
          duplicates.add(email);
        } else {
          emailSet.add(normalizedEmail);
        }
      }

      // Mark duplicates as invalid
      duplicates.forEach((email) => {
        setEmailErrors((prev) => ({
          ...prev,
          [email]: "Duplicate email in batch",
        }));
        validationResults[email] = false;
      });

      // Validate unique emails against database
      const uniqueEmails = emails.filter((email) => !duplicates.has(email));
      const validationPromises = uniqueEmails.map(async (email) => {
        const isValid = await validateEmail(email, jobId);
        validationResults[email] = isValid;
        return { email, isValid };
      });

      await Promise.all(validationPromises);
      return validationResults;
    },
    [validateEmail]
  );

  const clearEmailError = useCallback((email: string) => {
    setEmailErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[email];
      return newErrors;
    });
  }, []);

  const clearAllEmailErrors = useCallback(() => {
    setEmailErrors({});
  }, []);

  return {
    validateEmail,
    validateBulkEmails,
    validatingEmails,
    emailErrors,
    clearEmailError,
    clearAllEmailErrors,
  };
}

export function useCandidatesByJob() {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCandidates = useCallback(async (jobId: string) => {
    if (!jobId) return;

    setLoading(true);
    setError(null);
    try {
      const data = await fetchCandidatesByJob(jobId);
      setCandidates(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { candidates, loading, error, loadCandidates };
}
