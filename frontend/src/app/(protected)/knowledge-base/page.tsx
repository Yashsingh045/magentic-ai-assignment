"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { IconKnowledge, IconRefresh, IconTrash } from "@/components/icons";
import { UploadDropzone } from "@/components/knowledge/UploadDropzone";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { PageHeader } from "@/components/ui/PageHeader";
import { api } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/errors";
import { formatBytes, formatDate } from "@/lib/format";
import type { DocumentStatus, KbDocument } from "@/lib/types";

function StatusBadge({ status }: { status: DocumentStatus }) {
  if (status === "INDEXED")
    return (
      <Badge tone="green" dot>
        Indexed
      </Badge>
    );
  if (status === "FAILED")
    return (
      <Badge tone="red" dot>
        Failed
      </Badge>
    );
  return (
    <Badge tone="amber" dot pulse>
      Processing
    </Badge>
  );
}

export default function KnowledgeBasePage() {
  const [docs, setDocs] = useState<KbDocument[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [reindexing, setReindexing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchDocs = useCallback(async () => {
    try {
      const { data } = await api.get<KbDocument[]>("/documents");
      setDocs(data);
      setError(null);
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }, []);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  // Poll while any document is still PROCESSING so statuses update live.
  useEffect(() => {
    if (!docs?.some((d) => d.status === "PROCESSING")) return;
    pollRef.current = setTimeout(fetchDocs, 2500);
    return () => {
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, [docs, fetchDocs]);

  async function handleFiles(files: File[]) {
    setUploading(true);
    setError(null);
    try {
      for (const file of files) {
        const form = new FormData();
        form.append("file", file);
        // Override the client's default JSON content-type so axios sends the
        // FormData (with a multipart boundary) instead of serializing it.
        await api.post("/documents", form, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }
      await fetchDocs();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await api.delete(`/documents/${id}`);
      setDocs((prev) => prev?.filter((d) => d.id !== id) ?? null);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setDeletingId(null);
    }
  }

  async function handleReindex() {
    setReindexing(true);
    setError(null);
    try {
      await api.post("/documents/reindex");
      await fetchDocs();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setReindexing(false);
    }
  }

  const loading = docs === null;
  const hasDocs = !!docs && docs.length > 0;

  return (
    <div>
      <PageHeader
        title="Knowledge Base"
        description="Upload documents your AI uses to answer customer questions."
        action={
          <Button
            variant="secondary"
            onClick={handleReindex}
            loading={reindexing}
            disabled={!hasDocs}
          >
            <IconRefresh className="h-4 w-4" />
            Re-index
          </Button>
        }
      />

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mb-6">
        <UploadDropzone onFiles={handleFiles} uploading={uploading} />
      </div>

      {loading ? (
        <ListSkeleton rows={4} />
      ) : hasDocs ? (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium">Document</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">
                  Chunks
                </th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">
                  Size
                </th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">
                  Uploaded
                </th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {docs.map((doc) => (
                <tr key={doc.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 text-gray-500">
                        <IconKnowledge className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-gray-900">
                          {doc.filename}
                        </p>
                        <p className="text-xs text-gray-400">{doc.fileType}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={doc.status} />
                  </td>
                  <td className="hidden px-4 py-3 text-gray-600 sm:table-cell">
                    {doc.chunkCount}
                  </td>
                  <td className="hidden px-4 py-3 text-gray-600 sm:table-cell">
                    {formatBytes(doc.sizeBytes)}
                  </td>
                  <td className="hidden px-4 py-3 text-gray-600 md:table-cell">
                    {formatDate(doc.uploadedAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(doc.id)}
                      loading={deletingId === doc.id}
                      className="text-red-600 hover:bg-red-50"
                      aria-label={`Delete ${doc.filename}`}
                    >
                      <IconTrash className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          icon={<IconKnowledge className="h-6 w-6" />}
          title="No documents yet"
          description="Upload PDF, DOCX, TXT, or Markdown files above. They'll be parsed, chunked, and embedded for retrieval."
        />
      )}
    </div>
  );
}
