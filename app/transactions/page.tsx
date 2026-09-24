"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"

type Category = {
  id: number
  name: string
}

type Product = {
  id: number
  name: string
  price: number
  category_id: number | null
  is_available: boolean
  categories?: { name: string }[] | null
}

type CartItem = Product & {
  quantity: number
}

type PaymentMethod = "cash" | "qris" | "bill"

type PromoType =
  | "percentage"
  | "nominal"
  | "fixed_price"
  | "buy_one_get_one"
  | "buy_x_get_y"

type Promo = {
  id: number
  name: string
  description: string | null
  promo_type: PromoType
  discount_value: number
  minimum_purchase: number
  start_date: string | null
  end_date: string | null
  is_active: boolean
  apply_scope: "all" | "selected"
  fixed_price: number | null
  buy_quantity: number | null
  get_quantity: number | null
  buy_product_id: number | null
  get_product_id: number | null
  promo_products?: { product_id: number }[] | null
}

export default function TransactionsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [promos, setPromos] = useState<Promo[]>([])

  const [cart, setCart] = useState<CartItem[]>([])
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null)

  const [selectedPromoId, setSelectedPromoId] = useState<number | null>(null)

  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("cash")

  const [cashReceived, setCashReceived] = useState<number>(0)

  const [billOwner, setBillOwner] =
    useState<"Reza" | "Thato">("Reza")

  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)

  const rupiah = (value: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(value)

  const todayString = () => {
    const date = new Date()

    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")

    return `${year}-${month}-${day}`
  }

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoadingData(true)

    const [
      { data: productData, error: productError },
      { data: categoryData, error: categoryError },
      { data: promoData, error: promoError },
    ] = await Promise.all([
      supabase
        .from("products")
        .select("*, categories(name)")
        .eq("is_available", true)
        .order("name"),

      supabase
        .from("categories")
        .select("*")
        .order("name"),

      supabase
        .from("promos")
        .select("*, promo_products(product_id)")
        .eq("is_active", true)
        .order("name"),
    ])

    if (productError) {
      console.error(productError)
      alert("Gagal memuat menu.")
    }

    if (categoryError) {
      console.error(categoryError)
    }

    if (promoError) {
      console.error(promoError)
      alert("Gagal memuat promo.")
    }

    setProducts((productData || []) as Product[])
    setCategories((categoryData || []) as Category[])
    setPromos((promoData || []) as Promo[])

    setLoadingData(false)
  }

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch = product.name
        .toLowerCase()
        .includes(search.toLowerCase())

      const matchesCategory =
        selectedCategory === null ||
        product.category_id === selectedCategory

      return matchesSearch && matchesCategory
    })
  }, [products, search, selectedCategory])

  function addToCart(product: Product) {
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id)

      if (existing) {
        return current.map((item) =>
          item.id === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
              }
            : item
        )
      }

      return [
        ...current,
        {
          ...product,
          quantity: 1,
        },
      ]
    })
  }

  function increaseQuantity(id: number) {
    setCart((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              quantity: item.quantity + 1,
            }
          : item
      )
    )
  }

  function decreaseQuantity(id: number) {
    setCart((current) =>
      current
        .map((item) =>
          item.id === id
            ? {
                ...item,
                quantity: item.quantity - 1,
              }
            : item
        )
        .filter((item) => item.quantity > 0)
    )
  }

  function removeFromCart(id: number) {
    setCart((current) =>
      current.filter((item) => item.id !== id)
    )
  }

  const subtotal = useMemo(() => {
    return cart.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    )
  }, [cart])

  function getEligibleSubtotal(promo: Promo) {
    if (promo.apply_scope === "all") {
      return subtotal
    }

    const selectedIds = new Set(
      (promo.promo_products || []).map((item) => item.product_id)
    )

    return cart.reduce((sum, item) => {
      if (!selectedIds.has(item.id)) return sum

      return sum + item.price * item.quantity
    }, 0)
  }

  function isPromoUsable(promo: Promo) {
    if (!promo.is_active) return false

    const today = todayString()

    if (promo.start_date && promo.start_date > today) {
      return false
    }

    if (promo.end_date && promo.end_date < today) {
      return false
    }

    const eligibleSubtotal = getEligibleSubtotal(promo)

    if (eligibleSubtotal <= 0) {
      return false
    }

    if (
      promo.minimum_purchase > 0 &&
      eligibleSubtotal < promo.minimum_purchase
    ) {
      return false
    }

    if (promo.apply_scope === "selected") {
      const selectedIds = new Set(
        (promo.promo_products || []).map(
          (item) => item.product_id
        )
      )

      const hasEligibleProduct = cart.some((item) =>
        selectedIds.has(item.id)
      )

      if (!hasEligibleProduct) {
        return false
      }
    }

    if (
      promo.promo_type === "buy_one_get_one" ||
      promo.promo_type === "buy_x_get_y"
    ) {
      if (!promo.buy_product_id || !promo.get_product_id) {
        return false
      }

      const buyItem = cart.find(
        (item) => item.id === promo.buy_product_id
      )

      const getItem = cart.find(
        (item) => item.id === promo.get_product_id
      )

      if (!buyItem || !getItem) {
        return false
      }

      if (promo.apply_scope === "selected") {
        const selectedIds = new Set(
          (promo.promo_products || []).map(
            (item) => item.product_id
          )
        )

        if (
          !selectedIds.has(promo.buy_product_id) ||
          !selectedIds.has(promo.get_product_id)
        ) {
          return false
        }
      }
    }

    return true
  }

  const usablePromos = useMemo(() => {
    return promos.filter((promo) =>
      isPromoUsable(promo)
    )
  }, [promos, cart, subtotal])

  const selectedPromo = useMemo(() => {
    return (
      promos.find(
        (promo) => promo.id === selectedPromoId
      ) || null
    )
  }, [promos, selectedPromoId])

  function calculatePromoDiscount(promo: Promo | null) {
    if (!promo || !isPromoUsable(promo)) {
      return 0
    }

    const eligibleSubtotal = getEligibleSubtotal(promo)

    if (promo.promo_type === "percentage") {
      return Math.min(
        eligibleSubtotal,
        Math.round(
          eligibleSubtotal *
            (Number(promo.discount_value) / 100)
        )
      )
    }

    if (promo.promo_type === "nominal") {
      return Math.min(
        eligibleSubtotal,
        Number(promo.discount_value) || 0
      )
    }

    if (promo.promo_type === "fixed_price") {
      const selectedIds =
        promo.apply_scope === "selected"
          ? new Set(
              (promo.promo_products || []).map(
                (item) => item.product_id
              )
            )
          : null

      return cart.reduce((discount, item) => {
        if (
          selectedIds &&
          !selectedIds.has(item.id)
        ) {
          return discount
        }

        const fixedPrice =
          Number(promo.fixed_price) || 0

        const itemDiscount = Math.max(
          item.price - fixedPrice,
          0
        )

        return (
          discount +
          itemDiscount * item.quantity
        )
      }, 0)
    }

    const buyProductId = promo.buy_product_id
    const getProductId = promo.get_product_id

    if (!buyProductId || !getProductId) {
      return 0
    }

    const buyItem = cart.find(
      (item) => item.id === buyProductId
    )

    const getItem = cart.find(
      (item) => item.id === getProductId
    )

    if (!buyItem || !getItem) {
      return 0
    }

    let buyQuantity = 1
    let getQuantity = 1

    if (promo.promo_type === "buy_x_get_y") {
      buyQuantity =
        Number(promo.buy_quantity) || 1

      getQuantity =
        Number(promo.get_quantity) || 1
    }

    let freeQuantity = 0

    if (buyProductId === getProductId) {
      const bundleSize =
        buyQuantity + getQuantity

      const bundleCount = Math.floor(
        buyItem.quantity / bundleSize
      )

      freeQuantity =
        bundleCount * getQuantity
    } else {
      const buyBundles = Math.floor(
        buyItem.quantity / buyQuantity
      )

      const getBundles = Math.floor(
        getItem.quantity / getQuantity
      )

      const bundleCount = Math.min(
        buyBundles,
        getBundles
      )

      freeQuantity =
        bundleCount * getQuantity
    }

    return Math.min(
      subtotal,
      freeQuantity * getItem.price
    )
  }

  const promoDiscount = useMemo(() => {
    return calculatePromoDiscount(selectedPromo)
  }, [selectedPromo, cart, subtotal])

  const total = Math.max(
    subtotal - promoDiscount,
    0
  )

  const change =
    paymentMethod === "cash"
      ? Math.max(
          Number(cashReceived) - total,
          0
        )
      : 0

  function promoTypeLabel(type: PromoType) {
    switch (type) {
      case "percentage":
        return "Diskon Persentase"

      case "nominal":
        return "Potongan Nominal"

      case "fixed_price":
        return "Harga Khusus"

      case "buy_one_get_one":
        return "Buy 1 Get 1"

      case "buy_x_get_y":
        return "Buy X Get Y"

      default:
        return type
    }
  }

  function resetTransaction() {
    setCart([])
    setSelectedPromoId(null)
    setPaymentMethod("cash")
    setCashReceived(0)
    setBillOwner("Reza")
  }

  async function saveTransaction() {
    if (cart.length === 0) {
      alert("Keranjang masih kosong.")
      return
    }

    if (selectedPromo && !isPromoUsable(selectedPromo)) {
      alert("Promo tidak lagi memenuhi syarat.")
      return
    }

    if (
      paymentMethod === "cash" &&
      Number(cashReceived) < total
    ) {
      alert("Uang tunai kurang.")
      return
    }

    const userResult = await supabase.auth.getUser()

    if (userResult.error || !userResult.data.user) {
      alert("Sesi login tidak ditemukan.")
      return
    }

    const user = userResult.data.user

    setLoading(true)

    try {
      const invoiceNumber =
        `KS-${Date.now()}`

      let billId: number | null = null

      if (paymentMethod === "bill") {
        const { data: billData, error: billError } =
          await supabase
            .from("bills")
            .insert({
              bill_number: invoiceNumber,
              owner_name: billOwner,
              created_by: user.id,
              total_amount: total,
              paid_amount: 0,
              status: "unpaid",
              notes: null,
            })
            .select("id")
            .single()

        if (billError) {
          console.error(billError)
          throw new Error(
            billError.message
          )
        }

        billId = billData.id
      }

      const { data: transactionData, error: transactionError } =
        await supabase
          .from("transactions")
          .insert({
            invoice_number: invoiceNumber,
            user_id: user.id,
            subtotal,
            discount: promoDiscount,
            total,
            payment_method: paymentMethod,
            payment_status:
              paymentMethod === "bill"
                ? "bill"
                : "paid",
            notes: null,
            bill_id: billId,
            promo_id:
              selectedPromo?.id || null,
          })
          .select("id")
          .single()

      if (transactionError) {
        console.error(transactionError)
        throw new Error(
          transactionError.message
        )
      }

      const transactionItems = cart.map(
        (item) => ({
          transaction_id:
            transactionData.id,
          product_id: item.id,
          product_name: item.name,
          quantity: item.quantity,
          price: item.price,
          subtotal:
            item.price * item.quantity,
        })
      )

      const { error: itemsError } =
        await supabase
          .from("transaction_items")
          .insert(transactionItems)

      if (itemsError) {
        console.error(itemsError)
        throw new Error(
          itemsError.message
        )
      }

      alert(
        paymentMethod === "bill"
          ? `Bill Gantung ${billOwner} berhasil dibuat.`
          : `Transaksi ${invoiceNumber} berhasil disimpan.`
      )

      resetTransaction()
    } catch (error) {
      console.error(error)

      alert(
        error instanceof Error
          ? error.message
          : "Gagal menyimpan transaksi."
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl">

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900">
            Kasir
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Buat transaksi penjualan KOPI SAKU
          </p>
        </div>

        {loadingData ? (
          <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
            Memuat data...
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

            {/* MENU */}
            <div className="lg:col-span-2">

              <div className="mb-4 rounded-2xl bg-white p-4 shadow-sm">

                <input
                  type="text"
                  placeholder="Cari menu..."
                  value={search}
                  onChange={(e) =>
                    setSearch(e.target.value)
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
                />

                <div className="mt-3 flex gap-2 overflow-x-auto pb-1">

                  <button
                    onClick={() =>
                      setSelectedCategory(null)
                    }
                    className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium ${
                      selectedCategory === null
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    Semua
                  </button>

                  {categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() =>
                        setSelectedCategory(
                          category.id
                        )
                      }
                      className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium ${
                        selectedCategory ===
                        category.id
                          ? "bg-slate-900 text-white"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {category.name}
                    </button>
                  ))}

                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 md:grid-cols-3">

                {filteredProducts.map((product) => (
                  <button
                    key={product.id}
                    onClick={() =>
                      addToCart(product)
                    }
                    className="rounded-2xl bg-white p-4 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                  >
                    <div className="mb-3 flex h-24 items-center justify-center rounded-xl bg-slate-100 text-3xl">
                      ☕
                    </div>

                    <div className="font-semibold text-slate-900">
                      {product.name}
                    </div>

                    <div className="mt-1 text-sm text-slate-500">
                      {product.categories?.[0]?.name ||
                        "-"}
                    </div>

                    <div className="mt-2 font-bold text-slate-900">
                      {rupiah(product.price)}
                    </div>
                  </button>
                ))}

              </div>
            </div>

            {/* CART */}
            <div className="rounded-2xl bg-white p-5 shadow-sm">

              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900">
                  Pesanan
                </h2>

                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">
                  {cart.reduce(
                    (sum, item) =>
                      sum + item.quantity,
                    0
                  )}{" "}
                  item
                </span>
              </div>

              {cart.length === 0 ? (
                <div className="rounded-xl bg-slate-50 p-8 text-center text-sm text-slate-500">
                  Belum ada menu dipilih.
                </div>
              ) : (
                <div className="space-y-3">

                  {cart.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-slate-100 p-3"
                    >

                      <div className="flex justify-between gap-3">

                        <div>
                          <div className="font-semibold text-slate-900">
                            {item.name}
                          </div>

                          <div className="text-sm text-slate-500">
                            {rupiah(item.price)}
                          </div>
                        </div>

                        <button
                          onClick={() =>
                            removeFromCart(
                              item.id
                            )
                          }
                          className="text-sm text-red-500"
                        >
                          Hapus
                        </button>

                      </div>

                      <div className="mt-3 flex items-center justify-between">

                        <div className="flex items-center gap-2">

                          <button
                            onClick={() =>
                              decreaseQuantity(
                                item.id
                              )
                            }
                            className="h-8 w-8 rounded-lg bg-slate-100 font-bold"
                          >
                            −
                          </button>

                          <span className="w-6 text-center font-semibold">
                            {item.quantity}
                          </span>

                          <button
                            onClick={() =>
                              increaseQuantity(
                                item.id
                              )
                            }
                            className="h-8 w-8 rounded-lg bg-slate-100 font-bold"
                          >
                            +
                          </button>

                        </div>

                        <div className="font-semibold">
                          {rupiah(
                            item.price *
                              item.quantity
                          )}
                        </div>

                      </div>
                    </div>
                  ))}

                </div>
              )}

              {/* PROMO */}
              <div className="mt-5 rounded-xl border border-slate-200 p-4">

                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-900">
                      Promo
                    </div>

                    <div className="text-xs text-slate-500">
                      Pilih promo yang sedang berlaku
                    </div>
                  </div>

                  <span className="text-lg">
                    🎁
                  </span>
                </div>

                <select
                  value={
                    selectedPromoId ?? ""
                  }
                  onChange={(e) =>
                    setSelectedPromoId(
                      e.target.value
                        ? Number(e.target.value)
                        : null
                    )
                  }
                  disabled={
                    cart.length === 0 ||
                    usablePromos.length === 0
                  }
                  className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-slate-400"
                >
                  <option value="">
                    Tanpa Promo
                  </option>

                  {usablePromos.map((promo) => (
                    <option
                      key={promo.id}
                      value={promo.id}
                    >
                      {promo.name} —{" "}
                      {promoTypeLabel(
                        promo.promo_type
                      )}
                    </option>
                  ))}
                </select>

                {selectedPromo && (
                  <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                    <div className="font-semibold text-slate-800">
                      {selectedPromo.name}
                    </div>

                    {selectedPromo.description && (
                      <div className="mt-1">
                        {
                          selectedPromo.description
                        }
                      </div>
                    )}

                    {selectedPromo.minimum_purchase >
                      0 && (
                      <div className="mt-1">
                        Minimal pembelian:{" "}
                        {rupiah(
                          selectedPromo.minimum_purchase
                        )}
                      </div>
                    )}
                  </div>
                )}

                {cart.length > 0 &&
                  usablePromos.length === 0 && (
                    <div className="mt-2 text-xs text-slate-500">
                      Tidak ada promo yang memenuhi
                      syarat pesanan saat ini.
                    </div>
                  )}

              </div>

              {/* SUMMARY */}
              <div className="mt-5 space-y-3 border-t border-slate-200 pt-5">

                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">
                    Subtotal
                  </span>

                  <span className="font-medium">
                    {rupiah(subtotal)}
                  </span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">
                    Promo
                  </span>

                  <span className="font-medium text-green-600">
                    - {rupiah(promoDiscount)}
                  </span>
                </div>

                <div className="flex justify-between border-t border-slate-200 pt-3 text-lg">
                  <span className="font-bold">
                    Total
                  </span>

                  <span className="font-bold">
                    {rupiah(total)}
                  </span>
                </div>

              </div>

              {/* PAYMENT */}
              <div className="mt-5">

                <div className="mb-2 font-semibold">
                  Metode Pembayaran
                </div>

                <div className="grid grid-cols-3 gap-2">

                  <button
                    onClick={() =>
                      setPaymentMethod("cash")
                    }
                    className={`rounded-xl px-3 py-3 text-sm font-semibold ${
                      paymentMethod === "cash"
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100"
                    }`}
                  >
                    Cash
                  </button>

                  <button
                    onClick={() =>
                      setPaymentMethod("qris")
                    }
                    className={`rounded-xl px-3 py-3 text-sm font-semibold ${
                      paymentMethod === "qris"
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100"
                    }`}
                  >
                    QRIS
                  </button>

                  <button
                    onClick={() =>
                      setPaymentMethod("bill")
                    }
                    className={`rounded-xl px-3 py-3 text-sm font-semibold ${
                      paymentMethod === "bill"
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100"
                    }`}
                  >
                    Bill
                  </button>

                </div>

              </div>

              {/* CASH */}
              {paymentMethod === "cash" && (
                <div className="mt-4">

                  <label className="mb-2 block text-sm font-medium">
                    Uang Diterima
                  </label>

                  <input
                    type="number"
                    min="0"
                    value={
                      cashReceived || ""
                    }
                    onChange={(e) =>
                      setCashReceived(
                        Number(e.target.value)
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
                    placeholder="Masukkan uang"
                  />

                  <div className="mt-2 flex justify-between text-sm">
                    <span className="text-slate-500">
                      Kembalian
                    </span>

                    <span className="font-bold">
                      {rupiah(change)}
                    </span>
                  </div>

                </div>
              )}

              {/* BILL GANTUNG */}
              {paymentMethod === "bill" && (
                <div className="mt-4 rounded-xl bg-amber-50 p-4">

                  <div className="mb-2 text-sm font-semibold text-amber-900">
                    Bill Gantung
                  </div>

                  <select
                    value={billOwner}
                    onChange={(e) =>
                      setBillOwner(
                        e.target.value as
                          | "Reza"
                          | "Thato"
                      )
                    }
                    className="w-full rounded-xl border border-amber-200 bg-white px-3 py-3 text-sm outline-none"
                  >
                    <option value="Reza">
                      Reza
                    </option>

                    <option value="Thato">
                      Thato
                    </option>
                  </select>

                  <div className="mt-2 text-xs text-amber-700">
                    Transaksi akan masuk ke Bill
                    Gantung {billOwner}.
                  </div>

                </div>
              )}

              {/* SAVE */}
              <button
                onClick={saveTransaction}
                disabled={
                  loading ||
                  cart.length === 0
                }
                className="mt-5 w-full rounded-xl bg-slate-900 px-4 py-4 font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading
                  ? "Menyimpan..."
                  : paymentMethod === "bill"
                  ? `Simpan Bill Gantung ${billOwner}`
                  : "Simpan Transaksi"}
              </button>

              <button
                onClick={resetTransaction}
                disabled={loading}
                className="mt-2 w-full rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700"
              >
                Reset
              </button>

            </div>

          </div>
        )}

      </div>
    </div>
  )
}
