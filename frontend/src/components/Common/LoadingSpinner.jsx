export default function LoadingSpinner({ size = 'md', label = 'Loading…' }) {
  const sizeMap = { sm: 'w-5 h-5', md: 'w-8 h-8', lg: 'w-12 h-12' };
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      <div className="relative">
        <div className={`${sizeMap[size]} rounded-full bg-gradient-to-r from-[#ff9933] via-[#0ea5e9] to-[#138808] p-[2px] animate-spin`}>
          <div className="h-full w-full rounded-full bg-white" />
        </div>
      </div>
      <p className="text-sm font-medium text-slate-600">{label}</p>
    </div>
  );
}
