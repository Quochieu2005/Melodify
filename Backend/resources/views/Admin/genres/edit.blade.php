@extends('layouts.admin')

@section('content')
    @include('Admin.genres.form', ['isEditing' => true])
@endsection
