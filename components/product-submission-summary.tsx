import type { ProductDescriptionInput } from "@/lib/validation/product-description";

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[7rem_1fr] gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-foreground">{value}</dd>
    </div>
  );
}

export function ProductSubmissionSummary({
  product,
}: {
  product: ProductDescriptionInput;
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">Submitted product</h3>
      <dl className="space-y-2 text-sm">
        <SummaryRow label="Product name" value={product.productName} />
        <SummaryRow label="Category" value={product.category} />
        <SummaryRow label="Tone" value={product.tone} />
        <SummaryRow label="Features" value={product.features} />
      </dl>
    </div>
  );
}
