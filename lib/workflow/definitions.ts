export type WorkflowStepId = "submission" | "generation" | "review" | "approval";

export type WorkflowStepDefinition = {
  id: WorkflowStepId;
  label: string;
  description: string;
};

export const workflowStepDefinitions = [
  {
    id: "submission",
    label: "Product submitted",
    description: "Product details were accepted by the application.",
  },
  {
    id: "generation",
    label: "Description generation",
    description: "Orchestra generates a product description.",
  },
  {
    id: "review",
    label: "Quality review",
    description: "The description is checked for clarity and unsupported claims.",
  },
  {
    id: "approval",
    label: "Human approval",
    description: "A person makes the final content decision in Orchestra.",
  },
] satisfies readonly WorkflowStepDefinition[];
