import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CalendarRange, Pencil, Plus } from "lucide-react";
import {
  deleteCategoryAction,
  saveCategoryAction,
} from "@/app/actions/admin";
import { ActionForm } from "@/components/dashboard/action-form";
import { ImageUpload } from "@/components/dashboard/image-upload";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CategoryIcon } from "@/components/ui/category-icon";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import {
  TableContainer,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "@/components/ui/table";
import { requireAdmin } from "@/lib/auth";
import { listAdminCategories } from "@/lib/data/admin";

export const metadata: Metadata = { title: "Categories" };

const ICONS = [
  "Music",
  "Laptop",
  "Palette",
  "UtensilsCrossed",
  "Trophy",
  "Users",
  "BriefcaseBusiness",
  "Sparkles",
] as const;

export default async function AdminCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  await requireAdmin("/admin/categories");
  const { edit } = await searchParams;
  const categories = await listAdminCategories();
  const editing = categories.find((category) => category.id === edit) ?? null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operations"
        title="Categories"
        description="The labels used across discovery and event forms. Icon names map to the icons available in the public catalogue."
        actions={
          <Link
            href="/admin/categories"
            className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-4 py-2 text-[12px] font-semibold text-ink transition hover:border-brand-300"
          >
            <Plus className="h-3.5 w-3.5" />
            New category
          </Link>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="overflow-hidden glass rounded-2xl shadow-card">
          {categories.length === 0 ? (
            <EmptyState
              icon={CalendarRange}
              title="No categories yet"
              description="Create the first category to organize the event catalogue."
            />
          ) : (
            <TableContainer>
              <THead>
                <TH>Category</TH>
                <TH>Slug</TH>
                <TH>Order</TH>
                <TH>Visibility</TH>
                <TH>Actions</TH>
              </THead>
              <TBody>
                {categories.map((category) => (
                  <TR key={category.id}>
                    <TD>
                      <div className="flex items-center gap-2.5">
                        {category.image_url ? (
                          <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded-lg border border-line">
                            <Image
                              src={category.image_url}
                              alt=""
                              fill
                              sizes="32px"
                              className="object-cover"
                            />
                          </span>
                        ) : (
                          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-accent-300">
                            <CategoryIcon
                              name={category.icon}
                              className="h-4 w-4"
                            />
                          </span>
                        )}
                        <div>
                          <p className="font-medium text-ink">{category.name}</p>
                          {category.description ? (
                            <p className="mt-0.5 max-w-[230px] truncate text-[10.5px] text-muted">
                              {category.description}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </TD>
                    <TD>
                      <span className="font-mono text-[10.5px] text-muted">
                        {category.slug}
                      </span>
                    </TD>
                    <TD className="text-[12px]">{category.sort_order}</TD>
                    <TD>
                      <Badge tone={category.is_active ? "success" : "neutral"}>
                        {category.is_active ? "Active" : "Hidden"}
                      </Badge>
                    </TD>
                    <TD>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/categories?edit=${category.id}`}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent-300 hover:underline"
                        >
                          <Pencil className="h-3 w-3" />
                          Edit
                        </Link>
                        <ActionForm
                          action={deleteCategoryAction}
                          hidden={{ category_id: category.id }}
                          submitLabel="Delete"
                          pendingLabel="Deleting…"
                          variant="ghost"
                          buttonClassName="text-[11px] text-danger hover:bg-danger/15"
                          confirm={`Delete ${category.name}? Existing events will keep their history but lose this label.`}
                        />
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </TableContainer>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{editing ? "Edit category" : "New category"}</CardTitle>
            <p className="mt-1 text-[11px] leading-5 text-muted">
              {editing
                ? "Changes appear on the public discovery pages immediately."
                : "Categories help attendees find the right events."}
            </p>
          </CardHeader>
          <CardContent className="pt-4">
            <ActionForm
              action={saveCategoryAction}
              hidden={{ category_id: editing?.id ?? "" }}
              submitLabel={editing ? "Save changes" : "Create category"}
              pendingLabel="Saving…"
              className="space-y-4"
            >
              <div>
                <Label htmlFor="category-name">Name</Label>
                <Input
                  id="category-name"
                  name="name"
                  defaultValue={editing?.name ?? ""}
                  placeholder="e.g. Concerts"
                  minLength={2}
                  maxLength={80}
                  required
                />
              </div>
              <div>
                <Label htmlFor="category-slug">Slug</Label>
                <Input
                  id="category-slug"
                  name="slug"
                  defaultValue={editing?.slug ?? ""}
                  placeholder="Generated from the name if left blank"
                  maxLength={80}
                  pattern="[a-z0-9-]*"
                />
              </div>
              <div>
                <Label htmlFor="category-description">Description</Label>
                <Textarea
                  id="category-description"
                  name="description"
                  defaultValue={editing?.description ?? ""}
                  className="min-h-[76px] text-[12px]"
                  maxLength={500}
                  placeholder="A short line about this category."
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="category-icon">Icon</Label>
                  <Select
                    id="category-icon"
                    name="icon"
                    defaultValue={editing?.icon ?? "Sparkles"}
                    className="h-10 text-[12px]"
                  >
                    {ICONS.map((icon) => (
                      <option key={icon} value={icon}>
                        {icon}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label htmlFor="category-color">Colour</Label>
                  <Input
                    id="category-color"
                    name="color"
                    type="color"
                    defaultValue={editing?.color ?? "#3B82F6"}
                    className="h-10 w-full cursor-pointer p-1"
                  />
                </div>
              </div>
              <ImageUpload
                bucket="category-media"
                folder="categories"
                name="image_url"
                label="Category image"
                hint="Optional artwork shown on discovery pages. JPG, PNG, WebP or AVIF up to 2 MB."
                defaultValue={editing?.image_url}
                previewClassName="h-28"
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="category-order">Sort order</Label>
                  <Input
                    id="category-order"
                    name="sort_order"
                    type="number"
                    min={0}
                    max={999}
                    defaultValue={editing?.sort_order ?? 100}
                  />
                </div>
                <div>
                  <Label htmlFor="category-active">Visibility</Label>
                  <Select
                    id="category-active"
                    name="is_active"
                    defaultValue={
                      editing ? String(editing.is_active) : "true"
                    }
                    className="h-10 text-[12px]"
                  >
                    <option value="true">Active</option>
                    <option value="false">Hidden</option>
                  </Select>
                </div>
              </div>
              {editing ? (
                <Link
                  href="/admin/categories"
                  className="block text-[11px] font-medium text-muted hover:text-ink"
                >
                  Cancel editing
                </Link>
              ) : null}
            </ActionForm>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
