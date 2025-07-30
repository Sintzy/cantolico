"use client";

import React from "react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import UserHoverCard from "@/components/UserHoverCard";

type Submission = {
  id: string;
  title: string;
  createdAt: string;
  submitter: {
    id: string;
    name: string | null;
    email: string;
    role: "USER" | "TRUSTED" | "REVIEWER" | "ADMIN";
    createdAt: string;
    image: string | null;
    bio?: string;
  };
};

export default function AdminReviewPage() {
  const [submissions, setSubmissions] = React.useState<Submission[]>([]);

  React.useEffect(() => {
    const fetchSubmissions = async () => {
      const res = await fetch("/api/admin/submissions");
      const data: Submission[] = await res.json();
      setSubmissions(data);
    };

    fetchSubmissions();
  }, []);

  const handleApprove = async (submissionId: string) => {
    try {
      const formData = new FormData();
      formData.append("markdown", ""); 
      formData.append("spotifyLink", "");
      formData.append("youtubeLink", "");
      formData.append("instrument", "");
      formData.append("moments", JSON.stringify([]));
      formData.append("tags", "");
  
      const res = await fetch(`/api/admin/submission/${submissionId}/approve`, {
        method: "POST",
        body: formData,
      });
  
      if (res.ok) {
        alert("Submissão aprovada com sucesso!");
        setSubmissions((prev) =>
          prev.filter((submission) => submission.id !== submissionId)
        );
      } else {
        const error = await res.json();
        alert(`Erro ao aprovar: ${error.error}`);
      }
    } catch (err) {
      console.error("Erro ao aprovar submissão:", err);
      alert("Erro ao aprovar submissão.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold mb-6">Submissões Pendentes</h1>

      {submissions.length === 0 ? (
        <p className="text-muted-foreground">Nenhuma submissão pendente.</p>
      ) : (
        <ul className="space-y-4">
          {submissions.map((submission) => (
            <li
              key={submission.id}
              className="border rounded p-4 shadow-sm hover:shadow-md transition"
            >
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-semibold">{submission.title}</h2>
                  <div className="text-sm text-muted-foreground flex items-center gap-1">
                    <span>Enviado por</span>
                    {submission.submitter && (
                      <UserHoverCard
                        user={{
                          name: submission.submitter.name ?? "Sem nome",
                          email: submission.submitter.email,
                          image: submission.submitter.image ?? "/default-profile.png",
                          createdAt: submission.submitter.createdAt,
                          description: submission.submitter.bio ?? "",
                        }}
                      />
                    )}
                    <span>
                      há{" "}
                      {formatDistanceToNow(new Date(submission.createdAt), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/admin/review/${submission.id}`}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
                  >
                    Rever
                  </Link>
                  {submission.submitter?.role &&
                    ["ADMIN", "REVIEWER", "TRUSTED"].includes(submission.submitter.role) && (
                      <button
                        onClick={() => handleApprove(submission.id)}
                        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 text-sm"
                      >
                        Aprovar
                      </button>
                    )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}