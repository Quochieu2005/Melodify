@extends('layouts.admin')

@section('content')
    @include('Admin.albums.form', ['item' => null, 'isEditing' => false])
@endsection
