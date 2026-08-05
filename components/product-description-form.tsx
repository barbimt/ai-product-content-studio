"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ProductFormField } from "./product-form-field";
import { ToneSelect } from "./tone-select";
import { SubmitButton } from "./submit-button";
import {
  productDescriptionSchema,
  type ProductDescriptionInput,
} from "@/lib/validation/product-description";

type ProductDescriptionFormProps = {
  onSubmit: (values: ProductDescriptionInput) => void;
  isSubmitting: boolean;
  defaultValues?: ProductDescriptionInput;
};

export function ProductDescriptionForm({
  onSubmit,
  isSubmitting,
  defaultValues,
}: ProductDescriptionFormProps) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ProductDescriptionInput>({
    resolver: zodResolver(productDescriptionSchema),
    defaultValues: defaultValues ?? {
      productName: "",
      category: "",
      features: "",
      tone: undefined,
    },
  });

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <ProductFormField
        label="Product name"
        fieldId="productName"
        description="Example: TrailFlex Running Shoes"
        error={errors.productName?.message}
        required
      >
        {(controlProps) => (
          <Input
            {...register("productName")}
            {...controlProps}
            placeholder="TrailFlex Running Shoes"
          />
        )}
      </ProductFormField>

      <ProductFormField
        label="Category"
        fieldId="category"
        description="Example: Sports footwear"
        error={errors.category?.message}
        required
      >
        {(controlProps) => (
          <Input
            {...register("category")}
            {...controlProps}
            placeholder="Sports footwear"
          />
        )}
      </ProductFormField>

      <ProductFormField
        label="Features"
        fieldId="features"
        description="Example: Lightweight mesh upper, cushioned sole, reflective details and rubber grip"
        error={errors.features?.message}
        required
      >
        {(controlProps) => (
          <Textarea
            {...register("features")}
            {...controlProps}
            rows={4}
            placeholder="Lightweight mesh upper, cushioned sole, reflective details and rubber grip"
          />
        )}
      </ProductFormField>

      <Controller
        control={control}
        name="tone"
        render={({ field }) => (
          <ProductFormField
            label="Tone"
            fieldId="tone"
            error={errors.tone?.message}
            required
          >
            {(controlProps) => (
              <ToneSelect
                id={controlProps.id}
                name={field.name}
                value={field.value ?? null}
                onValueChange={field.onChange}
                onBlur={field.onBlur}
                inputRef={field.ref}
                aria-describedby={controlProps["aria-describedby"]}
                aria-invalid={controlProps["aria-invalid"]}
              />
            )}
          </ProductFormField>
        )}
      />

      <SubmitButton pending={isSubmitting} />
    </form>
  );
}
