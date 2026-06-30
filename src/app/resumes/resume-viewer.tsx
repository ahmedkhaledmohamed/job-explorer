"use client";

import { useState } from "react";

type Tab = "pm" | "em";

export function ResumeViewer({
  pmHtml,
  emHtml,
  pmMd,
  emMd,
}: {
  pmHtml: string;
  emHtml: string;
  pmMd: string;
  emMd: string;
}) {
  const [tab, setTab] = useState<Tab>("pm");
  const [copied, setCopied] = useState(false);

  async function copyMarkdown() {
    await navigator.clipboard.writeText(tab === "pm" ? pmMd : emMd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
          <button
            onClick={() => setTab("pm")}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              tab === "pm"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            PM Resume
          </button>
          <button
            onClick={() => setTab("em")}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              tab === "em"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            EM Resume
          </button>
        </div>
        <button
          onClick={copyMarkdown}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          {copied ? "Copied!" : "Copy Markdown"}
        </button>
      </div>

      <div className="rounded-lg border bg-white p-8 shadow-sm">
        <div
          className="prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{
            __html: tab === "pm" ? pmHtml : emHtml,
          }}
        />
      </div>
    </div>
  );
}
