@extends('layouts.admin')

@section('content')
    @include('Admin.genres.form', ['item' => null, 'isEditing' => false])
@endsection
