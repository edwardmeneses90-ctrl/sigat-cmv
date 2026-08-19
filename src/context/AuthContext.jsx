import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "../lib/supabase";

const AuthContext = createContext(null);

function normalizarUsuario(usuario) {
  return usuario.trim().toLowerCase();
}

function usuarioAEmailTecnico(usuario) {
  return `${normalizarUsuario(usuario)}@sigat.local`;
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [usuarioAuth, setUsuarioAuth] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [cargando, setCargando] = useState(true);

  async function cargarPerfil(user) {
    if (!user) {
      setPerfil(null);
      return null;
    }

    const { data, error } = await supabase
      .from("perfiles")
      .select(
        "id, usuario, nombres, apellidos, rol, activo",
      )
      .eq("id", user.id)
      .single();

    if (error) {
      console.error("Error cargando perfil:", error);
      setPerfil(null);
      return null;
    }

    setPerfil(data);
    return data;
  }

  useEffect(() => {
    let activo = true;

    async function iniciar() {
      const {
        data: { session: initialSession },
      } = await supabase.auth.getSession();

      if (!activo) return;

      setSession(initialSession);
      setUsuarioAuth(initialSession?.user ?? null);

      if (initialSession?.user) {
        await cargarPerfil(initialSession.user);
      }

      if (activo) {
        setCargando(false);
      }
    }

    iniciar();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        setSession(nextSession);
        setUsuarioAuth(nextSession?.user ?? null);

        window.setTimeout(async () => {
          if (nextSession?.user) {
            await cargarPerfil(nextSession.user);
          } else {
            setPerfil(null);
          }

          setCargando(false);
        }, 0);
      },
    );

    return () => {
      activo = false;
      subscription.unsubscribe();
    };
  }, []);

  async function iniciarSesion(usuario, password) {
    const usuarioNormalizado = normalizarUsuario(usuario);

    if (!/^[a-z0-9._-]{3,40}$/.test(usuarioNormalizado)) {
      throw new Error(
        "El usuario ingresado no tiene un formato válido.",
      );
    }

    const emailTecnico =
      usuarioAEmailTecnico(usuarioNormalizado);

    const { data, error } =
      await supabase.auth.signInWithPassword({
        email: emailTecnico,
        password,
      });

    if (error) {
      throw error;
    }

    const perfilUsuario = await cargarPerfil(data.user);

    if (!perfilUsuario) {
      await supabase.auth.signOut();
      throw new Error(
        "La cuenta existe, pero no tiene un perfil válido en SIGAT CMV.",
      );
    }

    if (!perfilUsuario.activo) {
      await supabase.auth.signOut();
      throw new Error(
        "Tu usuario está inactivo. Contacta al administrador.",
      );
    }

    return data;
  }

  async function cerrarSesion() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw error;
    }

    setSession(null);
    setUsuarioAuth(null);
    setPerfil(null);
  }

  const value = useMemo(
    () => ({
      session,
      usuarioAuth,
      perfil,
      cargando,
      autenticado: Boolean(
        session && usuarioAuth && perfil?.activo,
      ),
      iniciarSesion,
      cerrarSesion,
    }),
    [session, usuarioAuth, perfil, cargando],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth debe utilizarse dentro de AuthProvider.",
    );
  }

  return context;
}
