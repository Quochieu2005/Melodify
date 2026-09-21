<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\CloudinaryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MediaController extends Controller
{
    public function storeImage(Request $request, CloudinaryService $cloudinary): JsonResponse
    {
        $validated = $request->validate(['image' => ['required', 'file', 'image', 'max:10240']]);
        $asset = $cloudinary->uploadImage($validated['image']);

        return response()->json(['data' => [
            'public_id' => $asset['public_id'],
            'url' => $asset['secure_url'],
            'width' => $asset['width'] ?? null,
            'height' => $asset['height'] ?? null,
            'format' => $asset['format'] ?? null,
        ]], 201);
    }
}
