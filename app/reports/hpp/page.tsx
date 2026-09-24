"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Product = {
  id: number;
  name: string;
  price: number;
  category_id: number | null;
  is_available: boolean;
  categories?: { name: string }[] | null;
};

type Recipe = {
  id: number;
  product_id: number;
  inventory_item_id: number;
  quantity: number;
  inventory_items?: {
    name: string;
    unit: string;
    purchase_price: number;
  }[] | null;
};

type HppRow = {
  product: Product;
  category: string;
  hpp: number;
  profit: number;
  margin: number;
  ingredients: number;
};

const rupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value || 0);

export default function HppReportPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Semua");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);

    const [{ data: productData }, { data: recipeData }] = await Promise.all([
      supabase
        .from("products")
        .select(`
          id,
          name,
          price,
          category_id,
          is_available,
          categories(name)
        `)
        .order("name"),
      supabase
        .from("recipes")
        .select(`
          id,
          product_id,
          inventory_item_id,
          quantity,
          inventory_items(
            name,
            unit,
            purchase_price
          )
        `),
    ]);

    setProducts((productData || []) as Product[]);
    setRecipes((recipeData || []) as Recipe[]);
    setLoading(false);
  }

  const categories = useMemo(() => {
    const names = products
      .map((p) => p.categories?.[0]?.name)
      .filter(Boolean) as string[];

    return ["Semua", ...Array.from(new Set(names)).sort()];
  }, [products]);

  const rows = useMemo<HppRow[]>(() => {
    return products
      .map((product) => {
        const productRecipes = recipes.filter(
          (recipe) => recipe.product_id === product.id
        );

        const hpp = productRecipes.reduce((total, recipe) => {
          const ingredient = recipe.inventory_items?.[0];

          return (
            total +
            Number(recipe.quantity || 0) *
              Number(ingredient?.purchase_price || 0)
          );
        }, 0);

        const profit = Number(product.price || 0) - hpp;
        const margin =
          Number(product.price || 0) > 0
            ? (profit / Number(product.price)) * 100
            : 0;

        return {
          product,
          category: product.categories?.[0]?.name || "-",
          hpp,
          profit,
          margin,
          ingredients: productRecipes.length,
        };
      })
      .filter((row) => {
        const matchesSearch = row.product.name
          .toLowerCase()
          .includes(search.toLowerCase());

        const matchesCategory =
          category === "Semua" || row.category === category;

        return matchesSearch && matchesCategory;
      });
  }, [products, recipes, search, category]);

  const summary = useMemo(() => {
    const totalProducts = rows.length;
    const withRecipe = rows.filter((row) => row.ingredients > 0).length;
    const totalHpp = rows.reduce((sum, row) => sum + row.hpp, 0);
    const totalSalesValue = rows.reduce(
      (sum, row) => sum + Number(row.product.price || 0),
      0
    );
    const totalProfit = rows.reduce((sum, row) => sum + row.profit, 0);

    return {
      totalProducts,
      withRecipe,
      totalHpp,
      totalSalesValue,
      totalProfit,
    };
  }, [rows]);

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Laporan HPP
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Harga pokok produksi setiap menu berdasarkan resep dan harga bahan
            baku.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-5">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Total Menu</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {summary.totalProducts}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Sudah Ada Resep</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {summary.withRecipe}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Total HPP</p>
            <p className="mt-2 text-xl font-bold text-slate-900">
              {rupiah(summary.totalHpp)}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Total Harga Jual</p>
            <p className="mt-2 text-xl font-bold text-slate-900">
              {rupiah(summary.totalSalesValue)}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Laba Kotor</p>
            <p className="mt-2 text-xl font-bold text-emerald-600">
              {rupiah(summary.totalProfit)}
            </p>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama menu..."
              className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
            />

            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none"
            >
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-left">
                <tr>
                  <th className="px-5 py-4">No</th>
                  <th className="px-5 py-4">Menu</th>
                  <th className="px-5 py-4">Kategori</th>
                  <th className="px-5 py-4 text-right">Harga Jual</th>
                  <th className="px-5 py-4 text-right">HPP</th>
                  <th className="px-5 py-4 text-right">Laba Kotor</th>
                  <th className="px-5 py-4 text-right">Margin</th>
                  <th className="px-5 py-4 text-center">Bahan</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-5 py-10 text-center text-slate-500"
                    >
                      Memuat data...
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-5 py-10 text-center text-slate-500"
                    >
                      Belum ada data.
                    </td>
                  </tr>
                ) : (
                  rows.map((row, index) => (
                    <tr
                      key={row.product.id}
                      className="border-t border-slate-100 hover:bg-slate-50"
                    >
                      <td className="px-5 py-4">{index + 1}</td>

                      <td className="px-5 py-4 font-semibold text-slate-900">
                        {row.product.name}
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {row.category}
                      </td>

                      <td className="px-5 py-4 text-right">
                        {rupiah(row.product.price)}
                      </td>

                      <td className="px-5 py-4 text-right font-medium">
                        {row.ingredients > 0 ? rupiah(row.hpp) : "-"}
                      </td>

                      <td className="px-5 py-4 text-right font-semibold text-emerald-600">
                        {row.ingredients > 0 ? rupiah(row.profit) : "-"}
                      </td>

                      <td className="px-5 py-4 text-right">
                        {row.ingredients > 0
                          ? `${row.margin.toFixed(1)}%`
                          : "-"}
                      </td>

                      <td className="px-5 py-4 text-center">
                        {row.ingredients}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
          <strong>Catatan:</strong> HPP hanya akan dihitung untuk menu yang
          sudah memiliki resep. Rumus yang digunakan adalah jumlah bahan ×
          harga beli bahan baku.
        </div>
      </div>
    </main>
  );
}
