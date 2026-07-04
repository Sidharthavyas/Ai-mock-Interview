"use client";

import { useState, useRef } from "react";
import { toast } from "sonner";
import { 
  Upload, 
  FileText, 
  Trash2, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Lightbulb, 
  ArrowRight, 
  Clock, 
  ArrowUpRight, 
  Loader2 
} from "lucide-react";
import { deleteResumeFromProfile, analyzeUserResumeAgainstJD, ResumeAnalysis } from "@/lib/actions/resume.action";
import { cn } from "@/lib/utils";

interface ResumeMetadata {
  filename: string;
  uploadedAt: string;
}

interface ResumeAnalyzerClientProps {
  initialResume: ResumeMetadata | null;
  userId: string;
}

export default function ResumeAnalyzerClient({ initialResume, userId }: ResumeAnalyzerClientProps) {
  const [resume, setResume] = useState<ResumeMetadata | null>(initialResume);
  const [isUploading, setIsUploading] = useState(false);
  const [jobDescription, setJobDescription] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<ResumeAnalysis | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf" && !file.name.endsWith(".pdf")) {
      toast.error("Please upload a PDF file only.");
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append("resume", file);

    try {
      const res = await fetch("/api/resume/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to upload resume.");
      }

      setResume({
        filename: data.filename,
        uploadedAt: new Date().toISOString(),
      });
      toast.success("Resume uploaded and parsed successfully!");
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Error uploading resume.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDeleteResume = async () => {
    if (!confirm("Are you sure you want to delete your resume? This will clear it from your profile.")) {
      return;
    }

    try {
      await deleteResumeFromProfile(userId);
      setResume(null);
      setAnalysisResult(null);
      toast.success("Resume removed from profile.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete resume.");
    }
  };

  const handleAnalyze = async () => {
    if (!jobDescription.trim()) {
      toast.error("Please paste a Job Description to analyze.");
      return;
    }

    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
      const res = await analyzeUserResumeAgainstJD(userId, jobDescription);
      if (res.success) {
        setAnalysisResult(res.analysis);
        toast.success("Analysis complete!");
      } else {
        toast.error(res.error || "Analysis failed.");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred during analysis.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Determine score color styling
  const getScoreColorClass = (score: number) => {
    if (score >= 80) return "text-green-400 border-green-500/20 bg-green-500/10";
    if (score >= 50) return "text-amber-400 border-amber-500/20 bg-amber-500/10";
    return "text-red-400 border-red-500/20 bg-red-500/10";
  };

  const getScoreProgressColor = (score: number) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 50) return "bg-amber-500";
    return "bg-red-500";
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start w-full">
      {/* LEFT COLUMN: Input & Upload */}
      <div className="md:col-span-5 flex flex-col gap-6 w-full">
        {/* RESUME CARD */}
        <div className="card-border w-full">
          <div className="dark-gradient p-6 rounded-2xl flex flex-col gap-4">
            <h3 className="text-xl font-semibold text-primary-100 flex items-center gap-2">
              <FileText className="size-5 text-primary-200" />
              Your Resume
            </h3>

            {resume ? (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3 p-3 bg-dark-200 rounded-xl border border-border">
                  <div className="flex-center size-10 bg-primary-100/10 text-primary-200 rounded-lg">
                    <FileText className="size-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-white truncate">{resume.filename}</p>
                    <p className="text-xs text-light-400 flex items-center gap-1 mt-0.5">
                      <Clock className="size-3" />
                      Uploaded {new Date(resume.uploadedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button 
                    onClick={handleDeleteResume}
                    className="p-2 text-light-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                    title="Delete resume"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
                <p className="text-xs text-light-400">
                  Ready to analyze. You can also re-upload a different PDF resume below.
                </p>
                <button
                  onClick={handleUploadClick}
                  className="btn-secondary w-full flex items-center justify-center gap-2 text-sm"
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="size-4" />
                      Change Resume (PDF)
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div 
                  onClick={handleUploadClick}
                  className="border-2 border-dashed border-border hover:border-primary-200/50 rounded-xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition bg-dark-200/30 hover:bg-dark-200/60 group"
                >
                  <div className="flex-center size-12 bg-dark-200 text-light-400 group-hover:text-primary-200 group-hover:bg-primary-200/10 rounded-full transition duration-300">
                    {isUploading ? (
                      <Loader2 className="size-6 animate-spin" />
                    ) : (
                      <Upload className="size-6" />
                    )}
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-sm text-white">Click to upload resume</p>
                    <p className="text-xs text-light-400 mt-1">Supports PDF (max 5MB)</p>
                  </div>
                </div>
              </div>
            )}

            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".pdf"
              className="hidden" 
            />
          </div>
        </div>

        {/* JOB DESCRIPTION CARD */}
        <div className="card-border w-full">
          <div className="dark-gradient p-6 rounded-2xl flex flex-col gap-4">
            <h3 className="text-xl font-semibold text-primary-100 flex items-center gap-2">
              <Sparkles className="size-5 text-primary-200" />
              Target Job Description
            </h3>

            <textarea
              placeholder="Paste the Job Description (JD) here..."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              className="w-full h-64 bg-dark-200 border border-border focus:border-primary-200/50 rounded-xl p-4 text-sm text-white placeholder:text-light-400 focus:outline-none resize-none transition"
              disabled={isAnalyzing}
            />

            <button
              onClick={handleAnalyze}
              className="btn-primary w-full flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isAnalyzing || !resume || !jobDescription.trim()}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Analyzing Match...
                </>
              ) : (
                <>
                  <Sparkles className="size-4" />
                  Analyze Resume Fit
                </>
              )}
            </button>

            {!resume && (
              <p className="text-xs text-amber-400/90 text-center flex items-center justify-center gap-1">
                <AlertCircle className="size-3" />
                Please upload a resume first to run the analyzer
              </p>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Analysis Dashboard Output */}
      <div className="md:col-span-7 flex flex-col gap-6 w-full min-h-[500px]">
        {isAnalyzing && (
          <div className="card-border w-full h-full min-h-[400px] flex-center">
            <div className="dark-gradient rounded-2xl w-full p-8 flex flex-col items-center justify-center gap-4 text-center">
              <div className="relative flex items-center justify-center size-20">
                <span className="absolute animate-ping rounded-full bg-primary-200/20 size-16" />
                <Loader2 className="size-8 text-primary-200 animate-spin" />
              </div>
                <h4 className="text-lg font-semibold text-white">Analyzing Match with AI</h4>
                <p className="text-sm text-light-400 max-w-sm mt-2">
                  AI is matching your resume achievements, tools, and experience levels against the JD requirements...
                </p>
            </div>
          </div>
        )}

        {!isAnalyzing && !analysisResult && (
          <div className="card-border w-full h-full min-h-[400px] flex-center">
            <div className="dark-gradient rounded-2xl w-full p-8 flex flex-col items-center justify-center gap-4 text-center text-light-400">
              <div className="flex-center size-16 bg-dark-200/50 rounded-full text-light-600">
                <Sparkles className="size-8" />
              </div>
              <div>
                <h4 className="text-lg font-semibold text-white">No Analysis Run Yet</h4>
                <p className="text-sm text-light-400 max-w-sm mt-2">
                  Upload your resume on the left, paste the job description, and click &quot;Analyze Resume Fit&quot; to get a comprehensive match rating.
                </p>
              </div>
            </div>
          </div>
        )}

        {!isAnalyzing && analysisResult && (
          <div className="flex flex-col gap-6 w-full animate-fadeIn">
            {/* SCORE CARD */}
            <div className="card-border w-full">
              <div className="dark-gradient p-6 rounded-2xl flex flex-col sm:flex-row items-center gap-6">
                {/* Visual Circle Gauge */}
                <div className={cn(
                  "flex-center flex-col size-28 rounded-full border-4 text-center font-bold text-3xl",
                  getScoreColorClass(analysisResult.matchScore)
                )}>
                  {analysisResult.matchScore}
                  <span className="text-xs font-semibold text-light-400 -mt-0.5">/ 100</span>
                </div>

                <div className="flex-1 text-center sm:text-left">
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <h3 className="text-2xl font-bold text-white">Analysis Result</h3>
                    <span className={cn(
                      "px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wider border",
                      getScoreColorClass(analysisResult.matchScore)
                    )}>
                      {analysisResult.verdict}
                    </span>
                  </div>
                  <p className="text-sm text-light-200 mt-3 leading-relaxed">
                    {analysisResult.summary}
                  </p>
                </div>
              </div>
            </div>

            {/* DETAILS ACCORDION/GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full">
              {/* MATCHED SKILLS */}
              <div className="card-border w-full">
                <div className="dark-gradient p-5 rounded-2xl flex flex-col gap-3 h-full">
                  <h4 className="font-semibold text-sm uppercase tracking-wider text-green-400 flex items-center gap-2">
                    <CheckCircle2 className="size-4" />
                    Matched Skills
                  </h4>
                  {analysisResult.matchedSkills.length > 0 ? (
                    <ul className="flex flex-col gap-2 mt-2">
                      {analysisResult.matchedSkills.map((skill, index) => (
                        <li key={index} className="text-sm text-light-200 flex items-start gap-2 list-none">
                          <span className="text-green-500 font-bold mt-0.5">•</span>
                          {skill}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-light-400 italic">No direct matches found.</p>
                  )}
                </div>
              </div>

              {/* MISSING SKILLS / GAPS */}
              <div className="card-border w-full">
                <div className="dark-gradient p-5 rounded-2xl flex flex-col gap-3 h-full">
                  <h4 className="font-semibold text-sm uppercase tracking-wider text-red-400 flex items-center gap-2">
                    <AlertCircle className="size-4" />
                    Key Skill Gaps
                  </h4>
                  {analysisResult.missingSkills.length > 0 ? (
                    <ul className="flex flex-col gap-2 mt-2">
                      {analysisResult.missingSkills.map((skill, index) => (
                        <li key={index} className="text-sm text-light-200 flex items-start gap-2 list-none">
                          <span className="text-red-500 font-bold mt-0.5">•</span>
                          {skill}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-light-400 italic">No major skill gaps identified!</p>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full">
              {/* TRANSFERABLE EXP */}
              <div className="card-border w-full">
                <div className="dark-gradient p-5 rounded-2xl flex flex-col gap-3 h-full">
                  <h4 className="font-semibold text-sm uppercase tracking-wider text-primary-200 flex items-center gap-2">
                    <Lightbulb className="size-4" />
                    Transferable Experience
                  </h4>
                  {analysisResult.transferableExperience.length > 0 ? (
                    <ul className="flex flex-col gap-2 mt-2">
                      {analysisResult.transferableExperience.map((exp, index) => (
                        <li key={index} className="text-sm text-light-200 flex items-start gap-2 list-none">
                          <span className="text-primary-200 font-bold mt-0.5">•</span>
                          {exp}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-light-400 italic">No additional transferable experience identified.</p>
                  )}
                </div>
              </div>

              {/* ATS RECOMMENDATIONS */}
              <div className="card-border w-full">
                <div className="dark-gradient p-5 rounded-2xl flex flex-col gap-3 h-full">
                  <h4 className="font-semibold text-sm uppercase tracking-wider text-light-100 flex items-center gap-2">
                    <ArrowUpRight className="size-4 text-primary-200" />
                    ATS Optimization
                  </h4>
                  {analysisResult.atsNotes.length > 0 ? (
                    <ul className="flex flex-col gap-2 mt-2">
                      {analysisResult.atsNotes.map((note, index) => (
                        <li key={index} className="text-sm text-light-200 flex items-start gap-2 list-none">
                          <span className="text-primary-100 font-bold mt-0.5">•</span>
                          {note}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-light-400 italic">Resume is well-optimized for ATS keywords!</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
