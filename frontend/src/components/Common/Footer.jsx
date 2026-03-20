export default function Footer() {
  return (
    <footer className="mt-6 border-t border-slate-200 bg-white/85 px-6 py-4 backdrop-blur-sm">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-slate-600">
        <p className="font-medium">&copy; {new Date().getFullYear()} Jansewa AI • Governance Intelligence Platform</p>
        <p className="text-slate-700">Built for transparent and accountable civic response.</p>
      </div>
    </footer>
  );
}
