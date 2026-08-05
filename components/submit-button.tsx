import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { workflowMessages } from "@/lib/messages";

export function SubmitButton({ pending }: { pending: boolean }) {
  return (
    <>
      <Button
        type="submit"
        size="lg"
        disabled={pending}
        aria-disabled={pending}
        aria-busy={pending}
        className="w-full min-w-44 sm:w-auto"
      >
        {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
        Generate description
      </Button>
      <span role="status" aria-live="polite" className="sr-only">
        {pending ? workflowMessages.submitting : ""}
      </span>
    </>
  );
}
