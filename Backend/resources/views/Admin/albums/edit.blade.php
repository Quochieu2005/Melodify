@extends('layouts.admin')

@section('content')
    @include('Admin.albums.form', ['isEditing' => true])
@endsection
