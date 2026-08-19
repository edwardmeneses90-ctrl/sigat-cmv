export default function KpiCard({ titulo, valor, Icon, detalle }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{titulo}</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{valor}</p>
          <p className="mt-2 text-xs text-slate-400">{detalle}</p>
        </div>

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
          <Icon size={22} />
        </div>
      </div>
    </article>
  );
}
