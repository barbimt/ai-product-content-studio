"use client";

import { useState } from "react";
import { Check, Copy, Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { downloadTextFile, draftDownloadFilename } from "@/lib/draft-export";
import { workflowMessages } from "@/lib/messages";

export function DraftExportActions({
  draft,
  productName,
}: {
  draft: string;
  productName: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(draft);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  function handleDownload() {
    downloadTextFile(draftDownloadFilename(productName), `${draft}\n`);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
        {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
        {copied ? workflowMessages.copied : workflowMessages.copyDraft}
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={handleDownload}>
        <Download aria-hidden />
        {workflowMessages.downloadDraft}
      </Button>
    </div>
  );
}
