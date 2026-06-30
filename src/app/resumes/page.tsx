import { readFileSync } from "fs";
import { join } from "path";
import { Nav } from "@/components/nav";
import { ResumeViewer } from "./resume-viewer";
import { marked } from "marked";

export default function ResumesPage() {
  const pmMd = readFileSync(
    join(process.cwd(), "public", "resumes", "pm-resume.md"),
    "utf-8"
  );
  const emMd = readFileSync(
    join(process.cwd(), "public", "resumes", "em-resume.md"),
    "utf-8"
  );

  const pmHtml = marked.parse(pmMd) as string;
  const emHtml = marked.parse(emMd) as string;

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Resumes</h1>
        <ResumeViewer
          pmHtml={pmHtml}
          emHtml={emHtml}
          pmMd={pmMd}
          emMd={emMd}
        />
      </main>
    </div>
  );
}
