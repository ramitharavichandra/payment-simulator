import Link from "next/link";

export default function Header() {
  return (
    <div className="bg-gray-900 text-white flex justify-between px-8 py-4">

      <h1 className="font-bold text-xl">
        Payment Simulator
      </h1>

      <div className="flex gap-6">
        <Link href="/dashboard">Dashboard</Link>
        <Link href="/payment">Make Payment</Link>
        <Link href="/check-status">Check Status</Link>
      </div>

    </div>
  );
}