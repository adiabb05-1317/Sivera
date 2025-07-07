"use client";

import { useState, FormEvent, useRef, DragEvent } from "react";
import { supabase } from "@/lib/supabase";
import { authenticatedFetch } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, Building2, X, Loader2, ShieldCloseIcon } from "lucide-react";
import { DrawerClose } from "./ui/drawer";

interface CompanySetupModalProps {
  open: boolean;
  organizationId: string;
  onCompleted: () => void;
  onCancel?: () => void;
  isEditing?: boolean;
  existingName?: string;
  existingLogoUrl?: string;
}

export default function CompanySetupModal({
  open,
  organizationId,
  onCompleted,
  onCancel,
  isEditing = false,
  existingName = "",
  existingLogoUrl = "",
}: CompanySetupModalProps) {
  const [name, setName] = useState(existingName);
  const [file, setFile] = useState<File | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track if there are changes from the original values
  const hasNameChanged = name.trim() !== existingName.trim();
  const hasLogoChanged = file !== null;
  const hasChanges = hasNameChanged || hasLogoChanged;

  if (!open) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Company name is required");
      return;
    }
    setError(null);
    setIsSubmitting(true);

    let logoUrl: string | null = null;

    try {
      if (file) {
        const path = `${organizationId}/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("company-logos")
          .upload(path, file);
        if (uploadError) throw uploadError;
        const secondsInYear = 60 * 60 * 24 * 365;
        const { data: signedData, error: signedError } = await supabase.storage
          .from("company-logos")
          .createSignedUrl(path, secondsInYear);
        if (signedError) {
          console.error("Error creating signed URL:", signedError);
          return null;
        }
        logoUrl = signedData?.signedUrl || null;
      }

      const response = await authenticatedFetch(
        `${process.env.NEXT_PUBLIC_SIVERA_BACKEND_URL}/api/v1/organizations/${organizationId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, logo_url: logoUrl }),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to update organization (${response.status})`);
      }

      onCompleted();
    } catch (err: any) {
      console.error("Company setup error", err);
      setError(err.message || "Unexpected error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileRemove = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile && droppedFile.type.startsWith("image/")) {
      setFile(droppedFile);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white dark:bg-gray-900 shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-md bg-blue-50 dark:bg-blue-900/20">
                <Building2 className="w-5 h-5 text-app-blue-600 dark:text-app-blue-400" />
              </div>
              <div className="space-y-0.5">
                <h2 className="text-md font-semibold leading-none text-gray-900 dark:text-white">
                  Company Setup
                </h2>
                <p className="text-xs text-muted-foreground max-w-xs">
                  Let's configure your organization profile to get started. You
                  can modify these details anytime.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-8 py-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Company Name */}
            <div className="space-y-3">
              <label
                htmlFor="company-name"
                className="block text-sm font-semibold text-gray-800 dark:text-gray-200"
              >
                Company Name <span className="text-red-500">*</span>
              </label>
              <Input
                id="company-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Acme Corporation"
                className="w-full border-gray-300 dark:border-gray-600 focus:border-app-blue-500 focus:ring-app-blue-500 dark:focus:border-app-blue-400 dark:focus:ring-app-blue-400 text-base shadow-sm"
                required
                autoComplete="off"
              />
            </div>

            {/* Logo Upload */}
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200">
                Company Logo{" "}
                <span className="text-gray-500 text-sm font-normal">
                  (optional)
                </span>
              </label>
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative group border-2 border-dashed rounded-xl p-8 transition-all duration-200 cursor-pointer ${
                  isDragActive
                    ? "border-app-blue-400 bg-app-blue-50 dark:bg-app-blue-900/20"
                    : "border-gray-300 dark:border-gray-600 hover:border-app-blue-300 dark:hover:border-app-blue-500 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                }`}
              >
                {file ? (
                  <div className="flex items-center justify-center">
                    <div className="relative">
                      <img
                        src={URL.createObjectURL(file)}
                        alt="Logo preview"
                        className="w-20 h-20 object-cover rounded-lg border border-gray-200 dark:border-gray-600"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFileRemove();
                        }}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-app-blue-500 hover:bg-app-blue-600 text-white rounded-full flex items-center justify-center shadow-md transition-colors cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ) : existingLogoUrl ? (
                  <div className="flex items-center justify-center">
                    <div className="relative">
                      <Button
                        variant="ghost"
                        className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center shadow-md cursor-pointer bg-app-blue-500 hover:bg-app-blue-600 hover:text-white text-white dark:text-white"
                        onClick={handleFileRemove}
                      >
                        <X className="w-2 h-2" />
                      </Button>
                      <img
                        src={existingLogoUrl}
                        alt="Current logo"
                        className="w-20 h-20 object-cover rounded-lg border border-gray-200 dark:border-gray-600"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="mx-auto w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center mb-3">
                      <Upload className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-2 font-medium">
                      Click to upload or drag and drop your logo
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Supports PNG's, JPG's up to 10MB
                    </p>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-xs text-red-600 dark:text-red-400">
                  {error}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4">
              {isEditing && onCancel && (
                <Button
                  type="button"
                  onClick={onCancel}
                  disabled={isSubmitting}
                  variant="outline"
                  className="cursor-pointer border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
                >
                  Cancel
                </Button>
              )}
              {(!isEditing || hasChanges) && (
                <Button
                  type="submit"
                  disabled={isSubmitting || !name.trim()}
                  className="cursor-pointer border border-app-blue-500/80 dark:border-app-blue-400/80 hover:bg-app-blue-500/10 dark:hover:bg-app-blue-900/20 text-app-blue-5/00 dark:text-app-blue-3/00 hover:text-app-blue-6/00 dark:hover:text-app-blue-2/00 focus:ring-app-blue-5/00 focus:ring-offset-2 focus:ring-offset-gray-50 dark:focus:ring-offset-gray-900"
                  variant="outline"
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </div>
                  ) : (
                    "Continue"
                  )}
                </Button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
