declare module "markdown-it";
declare module "markdown-it-chords";

// Tipos para API de rejeição de submissões
interface SubmissionRejectionRequest {
  rejectionReason: string;
  deleteFiles?: boolean;
}

interface FileDeleteResult {
  path: string;
  success: boolean;
  error?: string;
}

interface SubmissionRejectionResponse {
  success: boolean;
  message: string;
  data: {
    submissionId: string;
    title: string;
    submitter: {
      id: number;
      name: string | null;
      email: string;
    };
    reviewer: {
      id: number;
      name: string | null;
      email: string;
    };
    rejectionReason: string;
    reviewedAt: Date;
    filesDeleted: boolean;
    deletionSummary: {
      total: number;
      successful: number;
      failed: number;
    };
  };
}
