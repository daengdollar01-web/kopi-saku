"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

type Bill = {
  id: number
  bill_number: string
  owner_name: "Reza" | "Thato"
  total_amount: number
  paid_amount: number
  status: string
  created_at: string
  transaction_id?: number | null
}

type Transaction = {
  id: number
  invoice_number: string
  transaction_date: string
  subtotal: number
  discount: number
  total: number
}

type TransactionItem = {
  id: number
  product_name: string
  quantity: number
  price: number
  subtotal: number
}

type Payment = {
  id: number
  amount: number
  payment_method: "cash" | "qris"
  payment_date: string
}

export default function BillGantungPage() {
  const [bills, setBills] = useState<Bill[]>([])
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null)
  const [transaction, setTransaction] = useState<Transaction | null>(null)
  const [items, setItems] = useState<TransactionItem[]>([])
  const [payments, setPayments] = useState<Payment[]>([])

  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)

  const [showPayment, setShowPayment] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "qris">("cash")
  const [savingPayment, setSavingPayment] = useState(false)

  const formatRupiah = (value: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(value)

  const formatDate = (value: string) =>
    new Date(value).toLocaleString("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
    })

  const loadBills = async () => {
    setLoading(true)

    const { data, error } = await supabase
      .from("bills")
      .select("*")
      .in("owner_name", ["Reza", "Thato"])
      .order("created_at", { ascending: false })

    if (error) {
      console.error(error)
      alert("Gagal mengambil data Bill Gantung.")
      setLoading(false)
      return
    }

    setBills((data || []) as Bill[])
    setLoading(false)
  }

  useEffect(() => {
    loadBills()
  }, [])

  const openDetail = async (bill: Bill) => {
    setSelectedBill(bill)
    setTransaction(null)
    setItems([])
    setPayments([])
    setDetailLoading(true)

    /*
      Ambil transaksi yang terhubung dengan bill.
      Kita menggunakan bill_id pada transactions.
    */
    const { data: transactionData, error: transactionError } =
      await supabase
        .from("transactions")
        .select("*")
        .eq("bill_id", bill.id)
        .maybeSingle()

    if (transactionError) {
      console.error(transactionError)
    }

    if (transactionData) {
      setTransaction(transactionData as Transaction)

      const { data: itemData, error: itemError } = await supabase
        .from("transaction_items")
        .select("*")
        .eq("transaction_id", transactionData.id)
        .order("id", { ascending: true })

      if (itemError) {
        console.error(itemError)
      } else {
        setItems((itemData || []) as TransactionItem[])
      }
    }

    const { data: paymentData, error: paymentError } = await supabase
      .from("bill_payments")
      .select("*")
      .eq("bill_id", bill.id)
      .order("payment_date", { ascending: false })

    if (paymentError) {
      console.error(paymentError)
    } else {
      setPayments((paymentData || []) as Payment[])
    }

    setDetailLoading(false)
  }

  const getRemaining = (bill: Bill) =>
    Math.max(Number(bill.total_amount) - Number(bill.paid_amount), 0)

  const getOwnerTotal = (owner: "Reza" | "Thato") =>
    bills
      .filter((bill) => bill.owner_name === owner)
      .reduce((sum, bill) => sum + Number(bill.total_amount), 0)

  const getOwnerPaid = (owner: "Reza" | "Thato") =>
    bills
      .filter((bill) => bill.owner_name === owner)
      .reduce((sum, bill) => sum + Number(bill.paid_amount), 0)

  const getOwnerRemaining = (owner: "Reza" | "Thato") =>
    Math.max(getOwnerTotal(owner) - getOwnerPaid(owner), 0)

  const openPayment = (bill: Bill) => {
    setSelectedBill(bill)
    setPaymentAmount("")
    setPaymentMethod("cash")
    setShowPayment(true)
  }

  const savePayment = async () => {
    if (!selectedBill) return

    const amount = Number(paymentAmount)
    const remaining = getRemaining(selectedBill)

    if (!amount || amount <= 0) {
      alert("Masukkan nominal pembayaran.")
      return
    }

    if (amount > remaining) {
      alert("Nominal pembayaran tidak boleh lebih besar dari sisa bill.")
      return
    }

    setSavingPayment(true)

    const {
      data: {
        user,
      },
    } = await supabase.auth.getUser()

    if (!user) {
      alert("Sesi login tidak ditemukan.")
      setSavingPayment(false)
      return
    }

    const { error: paymentError } = await supabase
      .from("bill_payments")
      .insert({
        bill_id: selectedBill.id,
        amount,
        payment_method: paymentMethod,
        paid_by: user.id,
        payment_date: new Date().toISOString(),
      })

    if (paymentError) {
      console.error(paymentError)
      alert("Gagal menyimpan pembayaran: " + paymentError.message)
      setSavingPayment(false)
      return
    }

    const newPaid = Number(selectedBill.paid_amount) + amount
    const newStatus = newPaid >= Number(selectedBill.total_amount)
      ? "paid"
      : "partial"

    const { error: billError } = await supabase
      .from("bills")
      .update({
        paid_amount: newPaid,
        status: newStatus,
      })
      .eq("id", selectedBill.id)

    if (billError) {
      console.error(billError)
      alert("Pembayaran tersimpan tetapi status bill gagal diperbarui.")
      setSavingPayment(false)
      return
    }

    alert(
      newStatus === "paid"
        ? "Bill berhasil dilunasi."
        : "Pembayaran berhasil disimpan."
    )

    setShowPayment(false)
    setPaymentAmount("")
    setSavingPayment(false)

    await loadBills()

    const { data: updatedBill } = await supabase
      .from("bills")
      .select("*")
      .eq("id", selectedBill.id)
      .single()

    if (updatedBill) {
      await openDetail(updatedBill as Bill)
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl">

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Bill Gantung
          </h1>
          <p className="mt-1 text-gray-500">
            Tagihan internal Owner KOPI SAKU.
          </p>
        </div>

        {/* RINGKASAN OWNER */}
        <div className="mb-6 grid gap-5 md:grid-cols-2">

          {(["Reza", "Thato"] as const).map((owner) => (
            <div
              key={owner}
              className="rounded-2xl bg-white p-6 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">
                    Bill Gantung
                  </p>
                  <h2 className="mt-1 text-2xl font-bold">
                    {owner}
                  </h2>
                </div>

                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 font-bold">
                  {owner.charAt(0)}
                </div>
              </div>

              <div className="mt-6 grid grid-cols-3 gap-3">
                <div>
                  <p className="text-xs text-gray-500">Total</p>
                  <p className="mt-1 font-semibold">
                    {formatRupiah(getOwnerTotal(owner))}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">Dibayar</p>
                  <p className="mt-1 font-semibold">
                    {formatRupiah(getOwnerPaid(owner))}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">Sisa</p>
                  <p className="mt-1 font-bold">
                    {formatRupiah(getOwnerRemaining(owner))}
                  </p>
                </div>
              </div>
            </div>
          ))}

        </div>

        {/* DAFTAR BILL */}
        <div className="rounded-2xl bg-white shadow-sm">

          <div className="border-b border-gray-100 p-5">
            <h2 className="text-xl font-bold">
              Daftar Bill
            </h2>
          </div>

          {loading ? (
            <div className="p-10 text-center text-gray-500">
              Memuat Bill Gantung...
            </div>
          ) : bills.length === 0 ? (
            <div className="p-10 text-center text-gray-500">
              Belum ada Bill Gantung.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-5 py-4 text-left text-sm">
                      Bill
                    </th>
                    <th className="px-5 py-4 text-left text-sm">
                      Owner
                    </th>
                    <th className="px-5 py-4 text-left text-sm">
                      Tanggal
                    </th>
                    <th className="px-5 py-4 text-right text-sm">
                      Total
                    </th>
                    <th className="px-5 py-4 text-right text-sm">
                      Dibayar
                    </th>
                    <th className="px-5 py-4 text-right text-sm">
                      Sisa
                    </th>
                    <th className="px-5 py-4 text-center text-sm">
                      Status
                    </th>
                    <th className="px-5 py-4 text-center text-sm">
                      Aksi
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {bills.map((bill) => {
                    const remaining = getRemaining(bill)

                    return (
                      <tr
                        key={bill.id}
                        className="border-t border-gray-100"
                      >
                        <td className="px-5 py-4 font-semibold">
                          {bill.bill_number}
                        </td>

                        <td className="px-5 py-4">
                          {bill.owner_name}
                        </td>

                        <td className="px-5 py-4 text-sm text-gray-600">
                          {formatDate(bill.created_at)}
                        </td>

                        <td className="px-5 py-4 text-right">
                          {formatRupiah(Number(bill.total_amount))}
                        </td>

                        <td className="px-5 py-4 text-right">
                          {formatRupiah(Number(bill.paid_amount))}
                        </td>

                        <td className="px-5 py-4 text-right font-semibold">
                          {formatRupiah(remaining)}
                        </td>

                        <td className="px-5 py-4 text-center">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-medium ${
                              bill.status === "paid"
                                ? "bg-gray-200 text-gray-700"
                                : "bg-gray-100 text-gray-900"
                            }`}
                          >
                            {bill.status === "paid"
                              ? "Lunas"
                              : bill.status === "partial"
                              ? "Sebagian"
                              : "Belum Dibayar"}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => openDetail(bill)}
                              className="rounded-lg border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50"
                            >
                              Detail
                            </button>

                            {remaining > 0 && (
                              <button
                                onClick={() => openPayment(bill)}
                                className="rounded-lg bg-black px-3 py-2 text-sm text-white hover:bg-gray-800"
                              >
                                Bayar
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

        </div>

        {/* MODAL DETAIL */}
        {selectedBill && !showPayment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6">

              <div className="mb-6 flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500">
                    {selectedBill.bill_number}
                  </p>
                  <h2 className="text-2xl font-bold">
                    Bill {selectedBill.owner_name}
                  </h2>
                </div>

                <button
                  onClick={() => setSelectedBill(null)}
                  className="text-2xl text-gray-400 hover:text-gray-700"
                >
                  ×
                </button>
              </div>

              {detailLoading ? (
                <div className="py-10 text-center text-gray-500">
                  Memuat detail...
                </div>
              ) : (
                <>
                  {transaction && (
                    <div className="mb-5 rounded-xl bg-gray-50 p-4">
                      <p className="text-sm text-gray-500">
                        Waktu Transaksi
                      </p>
                      <p className="mt-1 font-semibold">
                        {formatDate(transaction.transaction_date)}
                      </p>
                    </div>
                  )}

                  <div className="space-y-3">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className="flex justify-between border-b border-gray-100 pb-3"
                      >
                        <div>
                          <p className="font-medium">
                            {item.product_name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {item.quantity} ×{" "}
                            {formatRupiah(Number(item.price))}
                          </p>
                        </div>

                        <p className="font-semibold">
                          {formatRupiah(Number(item.subtotal))}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 space-y-2 border-t pt-4">
                    <div className="flex justify-between">
                      <span className="text-gray-500">
                        Total Bill
                      </span>
                      <span className="font-bold">
                        {formatRupiah(
                          Number(selectedBill.total_amount)
                        )}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-gray-500">
                        Sudah Dibayar
                      </span>
                      <span>
                        {formatRupiah(
                          Number(selectedBill.paid_amount)
                        )}
                      </span>
                    </div>

                    <div className="flex justify-between text-lg font-bold">
                      <span>Sisa</span>
                      <span>
                        {formatRupiah(getRemaining(selectedBill))}
                      </span>
                    </div>
                  </div>

                  {payments.length > 0 && (
                    <div className="mt-6">
                      <h3 className="mb-3 font-bold">
                        Riwayat Pembayaran
                      </h3>

                      <div className="space-y-2">
                        {payments.map((payment) => (
                          <div
                            key={payment.id}
                            className="flex justify-between rounded-lg bg-gray-50 p-3"
                          >
                            <div>
                              <p className="font-medium">
                                {payment.payment_method.toUpperCase()}
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatDate(payment.payment_date)}
                              </p>
                            </div>

                            <p className="font-semibold">
                              {formatRupiah(Number(payment.amount))}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {getRemaining(selectedBill) > 0 && (
                    <button
                      onClick={() => openPayment(selectedBill)}
                      className="mt-6 w-full rounded-xl bg-black py-3 font-semibold text-white hover:bg-gray-800"
                    >
                      Bayar Bill
                    </button>
                  )}
                </>
              )}

            </div>
          </div>
        )}

        {/* MODAL BAYAR */}
        {showPayment && selectedBill && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6">

              <div className="mb-6 flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500">
                    Bill {selectedBill.owner_name}
                  </p>
                  <h2 className="text-2xl font-bold">
                    Bayar Bill
                  </h2>
                </div>

                <button
                  onClick={() => setShowPayment(false)}
                  className="text-2xl text-gray-400"
                >
                  ×
                </button>
              </div>

              <div className="mb-5 rounded-xl bg-gray-50 p-4">
                <p className="text-sm text-gray-500">
                  Sisa Bill
                </p>
                <p className="mt-1 text-2xl font-bold">
                  {formatRupiah(getRemaining(selectedBill))}
                </p>
              </div>

              <label className="mb-2 block text-sm font-medium">
                Nominal Pembayaran
              </label>

              <input
                type="number"
                min="1"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="Masukkan nominal"
                className="mb-5 w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-gray-500"
              />

              <label className="mb-2 block text-sm font-medium">
                Metode Pembayaran
              </label>

              <div className="mb-6 grid grid-cols-2 gap-3">
                <button
                  onClick={() => setPaymentMethod("cash")}
                  className={`rounded-xl border p-3 font-medium ${
                    paymentMethod === "cash"
                      ? "border-black bg-black text-white"
                      : "border-gray-200"
                  }`}
                >
                  Cash
                </button>

                <button
                  onClick={() => setPaymentMethod("qris")}
                  className={`rounded-xl border p-3 font-medium ${
                    paymentMethod === "qris"
                      ? "border-black bg-black text-white"
                      : "border-gray-200"
                  }`}
                >
                  QRIS
                </button>
              </div>

              <button
                onClick={savePayment}
                disabled={savingPayment}
                className="w-full rounded-xl bg-black py-3 font-semibold text-white disabled:opacity-50"
              >
                {savingPayment ? "Menyimpan..." : "Bayar Bill"}
              </button>

            </div>
          </div>
        )}

      </div>
    </main>
  )
}
