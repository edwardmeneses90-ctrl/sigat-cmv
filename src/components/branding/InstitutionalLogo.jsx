export default function InstitutionalLogo({
  className = "",
  showSystemName = true,
}) {
  return (
    <div className={`flex flex-col items-center ${className}`}>
      <img
        src="/logo-concejo-villavicencio.png"
        alt="Concejo Municipal de Villavicencio"
        className="block h-auto w-full max-w-md object-contain"
      />

      {showSystemName && (
        <div className="mt-5 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            SIGAT CMV
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Sistema de Gestión de Activos Tecnológicos
          </p>
        </div>
      )}
    </div>
  );
}
