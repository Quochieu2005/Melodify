<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Support\MediaToken;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MediaTokenController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        return response()->json(MediaToken::issue($request->user()))->header('Cache-Control', 'private, no-store');
    }
}
