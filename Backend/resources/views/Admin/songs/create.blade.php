@extends('layouts.admin')

@section('content')
    @include('Admin.songs.form', ['item' => null, 'isEditing' => false])
@endsection
