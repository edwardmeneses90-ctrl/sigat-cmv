import { useEffect, useState } from "react";
import {
  CheckCircle2,
  CircleAlert,
  Database,
  LoaderCircle,
} from "lucide-react";
import {
  supabase,
  supabaseConfigurado,
} from "../../lib/supabase";

export default function ConnectionStatus() {
  const [estado, setEstado] = useState(
    supabaseConfigurado ? "probando" : "sin-configurar",
  );
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    if (!supabaseConfigurado || !supabase) {
      return;
    }

    let activo = true;

    async function probarConexion() {
      setEstado("probando");
      setMensaje("");

      const { error } = await supabase
        .from("tipos_activo")
        .select("id")
        .limit(1);

      if (!activo) return;

      if (error) {
        setEstado("error");
        setMensaje(error.message);
        return;
      }

      setEstado("correcto");
      setMensaje("Base inicial de SIGAT CMV disponible.");
    }

    probarConexion();

    return () => {
      activo = false;
    };
  }, []);

  const contenido = {
    "sin-configurar": {
      Icon: CircleAlert,
      titulo: "Supabase sin configurar",
      texto:
        "Crea .env.local y agrega VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY.",
      clases: "border-amber-200 bg-amber-50 text-amber-900",
      icono: "text-amber-600",
    },
    probando: {
      Icon: LoaderCircle,
      titulo: "Probando conexión",
      texto: "Validando comunicación con Supabase...",
      clases: "border-blue-200 bg-blue-50 text-blue-900",
      icono: "animate-spin text-blue-600",
    },
    correcto: {
      Icon: CheckCircle2,
      titulo: "Conexión correcta",
      texto: mensaje || "Supabase responde correctamente.",
      clases: "border-emerald-200 bg-emerald-50 text-emerald-900",
      icono: "text-emerald-600",
    },
    error: {
      Icon: CircleAlert,
      titulo: "Error de conexión",
      texto: mensaje || "No fue posible conectar con Supabase.",
      clases: "border-red-200 bg-red-50 text-red-900",
      icono: "text-red-600",
    },
  }[estado];

  const Icon = contenido.Icon;

  return (
    <section
      className={[
        "rounded-2xl border p-5",
        contenido.clases,
      ].join(" ")}
    >
      <div className="flex items-start gap-4">
        <div className="mt-0.5">
          <Icon size={23} className={contenido.icono} />
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Database size={16} />
            <p className="text-xs font-semibold uppercase tracking-wider">
              Estado de Supabase
            </p>
          </div>

          <h3 className="mt-2 font-semibold">
            {contenido.titulo}
          </h3>

          <p className="mt-1 break-words text-sm opacity-80">
            {contenido.texto}
          </p>
        </div>
      </div>
    </section>
  );
}
