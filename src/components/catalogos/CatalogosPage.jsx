import { useState } from "react";
import {
  Boxes,
  Building2,
  Tags,
} from "lucide-react";
import CatalogoSimple from "./CatalogoSimple";

const tabs = [
  {
    id: "tipos",
    label: "Tipos de activo",
    Icon: Boxes,
  },
  {
    id: "marcas",
    label: "Marcas",
    Icon: Tags,
  },
  {
    id: "dependencias",
    label: "Dependencias",
    Icon: Building2,
  },
];

export default function CatalogosPage() {
  const [tab, setTab] = useState("tipos");

  return (
    <div className="mx-auto max-w-7xl">
      <section className="mb-7">
        <p className="text-sm font-semibold uppercase tracking-wider text-blue-700">
          Administración
        </p>

        <h2 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
          Catálogos maestros
        </h2>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          Configura los datos base que utilizará el inventario de SIGAT CMV.
        </p>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex gap-1 overflow-x-auto border-b border-slate-200 p-2">
          {tabs.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={[
                "flex shrink-0 items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition",
                tab === id
                  ? "bg-blue-600 text-white"
                  : "text-slate-600 hover:bg-slate-100",
              ].join(" ")}
            >
              <Icon size={17} />
              {label}
            </button>
          ))}
        </div>

        <div className="p-5 md:p-6">
          {tab === "tipos" && (
            <CatalogoSimple
              tabla="tipos_activo"
              titulo="Tipos de activo"
              descripcion="Clasificación principal de los elementos tecnológicos."
              campos={[
                {
                  key: "nombre",
                  label: "Nombre",
                  required: true,
                },
                {
                  key: "prefijo",
                  label: "Prefijo",
                  required: true,
                  placeholder: "PC",
                },
                {
                  key: "descripcion",
                  label: "Descripción",
                },
              ]}
              columnas={[
                { key: "nombre", label: "Nombre" },
                { key: "prefijo", label: "Prefijo" },
                { key: "descripcion", label: "Descripción" },
              ]}
            />
          )}

          {tab === "marcas" && (
            <CatalogoSimple
              tabla="marcas"
              titulo="Marcas"
              descripcion="Fabricantes o marcas comerciales de los activos."
              campos={[
                {
                  key: "nombre",
                  label: "Nombre",
                  required: true,
                  placeholder: "Dell",
                },
              ]}
              columnas={[
                { key: "nombre", label: "Nombre" },
              ]}
            />
          )}

          {tab === "dependencias" && (
            <CatalogoSimple
              tabla="dependencias"
              titulo="Dependencias"
              descripcion="Áreas o dependencias a las que pueden asignarse los activos."
              campos={[
                {
                  key: "nombre",
                  label: "Nombre de la dependencia",
                  required: true,
                  placeholder: "Contabilidad",
                },
              ]}
              columnas={[
                {
                  key: "nombre",
                  label: "Nombre de la dependencia",
                },
              ]}
            />
          )}
        </div>
      </section>
    </div>
  );
}
