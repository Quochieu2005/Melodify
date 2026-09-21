import Constants from "expo-constants";

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  Constants.expoConfig?.extra?.apiUrl ??
  "http://localhost:8000/api";

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { Accept: "application/json", ...init?.headers },
  });

  if (!response.ok) {
    throw new Error("API request failed");
  }

  return response.json() as Promise<T>;
}

export async function uploadImage(uri: string, fileName = 'image.jpg', mimeType = 'image/jpeg') {
  const form = new FormData();
  form.append('image', { uri, name: fileName, type: mimeType } as unknown as Blob);
  const response = await fetch(`${API_URL}/media/images`, { method: 'POST', body: form });
  if (!response.ok) throw new Error('Không thể tải ảnh lên Cloudinary');
  return response.json();
}
