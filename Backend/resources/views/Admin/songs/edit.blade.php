@extends('layouts.admin')

@section('content')
    @include('Admin.songs.form', ['isEditing' => true])
@endsection
