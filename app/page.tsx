import { ApplicationHeader } from "@/components/application-header";
import { ProductContentWorkflow } from "@/components/product-content-workflow";

export default function Home() {
  return (
    <>
      <ApplicationHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        <div className="max-w-2xl space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            Product Content Studio
          </h1>
          <p className="text-sm text-muted-foreground">
            Generate ecommerce product descriptions with Orchestra. Copy or
            download the draft, or submit again for a new version.
          </p>
        </div>
        <div className="mt-10">
          <ProductContentWorkflow />
        </div>
      </main>
    </>
  );
}
