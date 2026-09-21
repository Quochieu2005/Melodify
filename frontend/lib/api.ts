const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { Accept: "application/json", ...init?.headers },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(response.status, body.message ?? "API request failed");
  }

  return response.json() as Promise<T>;
}

export async function uploadImage(file: File) {
  const form = new FormData();
  form.append('image', file);
  return apiFetch<{ data: { public_id: string; url: string; width: number; height: number; format: string } }>(
    '/media/images', { method: 'POST', body: form },
  );
}
