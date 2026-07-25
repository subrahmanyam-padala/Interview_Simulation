function MetricCard({ label, value, hint }) {
  return (
    <article className="bg-[#FFFFFF] border border-[#E2E8F0] p-4 rounded-xl shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
      <p className="text-[12px] font-bold text-[#64748B] uppercase tracking-wider">{label}</p>
      <p className="mt-1 text-[24px] font-bold text-[#0F172A]">{value}</p>
      {hint ? <p className="mt-1 text-[11px] font-medium text-[#94A3B8]">{hint}</p> : null}
    </article>
  );
}

export default MetricCard;
