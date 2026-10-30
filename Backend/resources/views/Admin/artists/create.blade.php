@extends('layouts.admin')

@section('content')
    @include('Admin.artists.form', ['item' => null, 'isEditing' => false])
@endsection
