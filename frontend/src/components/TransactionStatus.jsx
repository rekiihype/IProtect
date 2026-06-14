// ─── TransactionStatus ───────────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  pending: {
    text: "Transaction pending...",
    className: "bg-gray-50 border border-gray-200 text-gray-600",
    showSpinner: true,
  },
  confirmed: {
    text: "Transaction confirmed.",
    className: "bg-green-50 border border-green-200 text-green-700",
    showSpinner: false,
  },
  failed: {
    text: "Transaction failed. Please try again.",
    className: "bg-red-50 border border-red-200 text-red-700",
    showSpinner: false,
  },
};

export default function TransactionStatus({ status }) {
  if (!status || status === "idle") return null;

  const config = STATUS_CONFIG[status];
  if (!config) return null;

  return (
    <div className={`mt-4 flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium ${config.className}`}>
      {config.showSpinner && (
        <svg className="h-4 w-4 animate-spin text-gray-400" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      )}
      <span>{config.text}</span>
    </div>
  );
}
