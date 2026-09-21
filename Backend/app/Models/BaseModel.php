<?php

namespace App\Models;

use MongoDB\Laravel\Eloquent\Model;

abstract class BaseModel extends Model
{
    protected $connection = 'mongodb';

    protected $guarded = [];
}
