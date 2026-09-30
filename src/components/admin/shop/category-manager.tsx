'use client';

import { useState, useTransition } from 'react';
import { ArrowDown, ArrowUp, Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  createCategory,
  deleteCategory,
  reorderCategories,
  updateCategory,
  type CategoryView,
} from '@/server/actions/product-category';
import { moveItem } from '@/lib/shop/product-form';
import { safeAction } from '@/lib/courses/safe-action';

const inputClass = 'border-border bg-background w-full rounded-lg border px-3 py-2 text-sm';

function CategoryRow({
  category,
  first,
  last,
  onMove,
  onSaved,
  onDeleted,
  onError,
}: {
  category: CategoryView;
  first: boolean;
  last: boolean;
  onMove: (direction: -1 | 1) => void;
  onSaved: (patch: Partial<CategoryView>) => void;
  onDeleted: () => void;
  onError: (message: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(category.name);
  const [hasCondition, setHasCondition] = useState(category.hasCondition);
  const [pending, startTransition] = useTransition();

  const save = () =>
    startTransition(async () => {
      const result = await safeAction(() =>
        updateCategory({ id: category.id, name, hasCondition }),
      );
      if (!result.ok) return onError(result.error);
      onSaved({ name: name.trim(), hasCondition, slug: result.data.slug });
      setEditing(false);
    });

  const remove = () => {
    if (!window.confirm(`Xóa danh mục "${category.name}"?`)) return;
    startTransition(async () => {
      const result = await safeAction(() => deleteCategory(category.id));
      if (!result.ok) return onError(result.error);
      onDeleted();
    });
  };

  return (
    <li className="flex flex-wrap items-center gap-3 px-4 py-3">
      <div className="flex flex-col">
        <button
          type="button"
          disabled={first || pending}
          onClick={() => onMove(-1)}
          className="text-muted-foreground hover:text-foreground disabled:opacity-20"
          title="Lên trên"
        >
          <ArrowUp className="size-3.5" />
        </button>
        <button
          type="button"
          disabled={last || pending}
          onClick={() => onMove(1)}
          className="text-muted-foreground hover:text-foreground disabled:opacity-20"
          title="Xuống dưới"
        >
          <ArrowDown className="size-3.5" />
        </button>
      </div>

      {editing ? (
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
          <input
            className={`${inputClass} max-w-64`}
            value={name}
            autoFocus
            maxLength={60}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') save();
              if (event.key === 'Escape') setEditing(false);
            }}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="accent-primary size-4"
              checked={hasCondition}
              onChange={(event) => setHasCondition(event.target.checked)}
            />
            Có tình trạng máy (mới / cũ)
          </label>
        </div>
      ) : (
        <div className="min-w-0 flex-1">
          <p className="font-medium">{category.name}</p>
          <p className="text-muted-foreground text-xs">
            /shop?c={category.slug} · {category.productCount} sản phẩm
            {category.hasCondition && ' · có tình trạng máy'}
          </p>
        </div>
      )}

      <div className="flex gap-1">
        {editing ? (
          <>
            <Button type="button" size="sm" onClick={save} disabled={pending || !name.trim()}>
              <Check className="size-4" /> Lưu
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setName(category.name);
                setHasCondition(category.hasCondition);
                setEditing(false);
              }}
            >
              <X className="size-4" />
            </Button>
          </>
        ) : (
          <>
            <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(true)}>
              <Pencil className="size-4" /> Sửa
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={remove}
              disabled={pending || category.productCount > 0}
              title={
                category.productCount > 0
                  ? 'Danh mục đang có sản phẩm, chuyển sản phẩm sang danh mục khác trước khi xóa'
                  : 'Xóa danh mục'
              }
              className="hover:text-destructive"
            >
              <Trash2 className="size-4" />
            </Button>
          </>
        )}
      </div>
    </li>
  );
}

export function CategoryManager({ initial }: { initial: CategoryView[] }) {
  const [categories, setCategories] = useState(initial);
  const [name, setName] = useState('');
  const [hasCondition, setHasCondition] = useState(false);
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();

  const add = () =>
    startTransition(async () => {
      const result = await safeAction(() => createCategory({ name, hasCondition }));
      if (!result.ok) return setError(result.error);
      setCategories((prev) => [...prev, result.data]);
      setName('');
      setHasCondition(false);
      setError('');
    });

  const move = (index: number, direction: -1 | 1) => {
    const next = moveItem(categories, index, index + direction);
    setCategories(next);
    startTransition(async () => {
      const result = await safeAction(() => reorderCategories(next.map((category) => category.id)));
      if (!result.ok) setError(result.error);
    });
  };

  return (
    <div className="space-y-5">
      <section className="border-border bg-card space-y-3 rounded-xl border p-5">
        <h2 className="font-semibold">Thêm danh mục</h2>
        <div className="flex flex-wrap items-center gap-3">
          <input
            className={`${inputClass} max-w-72 flex-1`}
            value={name}
            maxLength={60}
            placeholder="Ví dụ: Giày dép"
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') add();
            }}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="accent-primary size-4"
              checked={hasCondition}
              onChange={(event) => setHasCondition(event.target.checked)}
            />
            Có tình trạng máy (mới / cũ)
          </label>
          <Button type="button" onClick={add} disabled={pending}>
            <Plus className="size-4" /> Thêm
          </Button>
        </div>
      </section>

      {error && (
        <p role="alert" className="rounded-lg bg-red-500/10 p-3 text-sm text-red-600">
          {error}
        </p>
      )}

      {categories.length === 0 ? (
        <p className="text-muted-foreground border-border rounded-xl border border-dashed p-6 text-center text-sm">
          Chưa có danh mục nào.
        </p>
      ) : (
        <ul className="border-border bg-card divide-border divide-y rounded-xl border">
          {categories.map((category, index) => (
            <CategoryRow
              key={category.id}
              category={category}
              first={index === 0}
              last={index === categories.length - 1}
              onMove={(direction) => move(index, direction)}
              onSaved={(patch) =>
                setCategories((prev) =>
                  prev.map((item) => (item.id === category.id ? { ...item, ...patch } : item)),
                )
              }
              onDeleted={() =>
                setCategories((prev) => prev.filter((item) => item.id !== category.id))
              }
              onError={setError}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
