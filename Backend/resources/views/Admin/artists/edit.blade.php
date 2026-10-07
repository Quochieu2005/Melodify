@extends('layouts.admin')

@section('content')
    @include('Admin.artists.form', ['isEditing' => true])
@endsection
