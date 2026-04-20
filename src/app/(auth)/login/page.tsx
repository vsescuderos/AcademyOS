import { login } from "@/actions/auth";

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-sm">
        <h1 className="mb-6 text-2xl font-bold text-gray-900">Iniciar sesión</h1>

        <form action={login} className="flex flex-col gap-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <MessagesAsync searchParams={searchParams} />

          <button
            type="submit"
            className="mt-2 w-full rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Entrar
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-500">
          ¿No tienes cuenta?{" "}
          <a href="/signup" className="text-blue-600 hover:underline">
            Regístrate
          </a>
        </p>
      </div>
    </main>
  );
}

async function MessagesAsync({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;
  if (params.error) {
    return (
      <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{params.error}</p>
    );
  }
  if (params.message) {
    return (
      <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-600">{params.message}</p>
    );
  }
  return null;
}
