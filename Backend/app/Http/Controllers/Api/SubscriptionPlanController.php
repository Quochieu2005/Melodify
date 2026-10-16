<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SubscriptionPlan;
use Illuminate\Http\JsonResponse;

class SubscriptionPlanController extends Controller
{
    public function index(): JsonResponse
    {
        $plans = SubscriptionPlan::query()
            ->where('status', 'active')
            ->orderBy('price')
            ->get()
            ->map(fn (SubscriptionPlan $plan): array => [
                'id' => (string) $plan->getKey(),
                'name' => (string) $plan->name,
                'slug' => $plan->slug,
                'price' => (float) $plan->price,
                'billing_cycle' => $plan->billing_cycle ?: 'monthly',
                'billing_months' => max(1, (int) ($plan->billing_months ?: 1)),
                'description' => $plan->description,
                'offline_download' => (bool) $plan->offline_download,
                'ads_enabled' => (bool) $plan->ads_enabled,
                'unlimited_skip' => (bool) $plan->unlimited_skip,
            ])
            ->values();

        return response()->json(['data' => $plans]);
    }
}
