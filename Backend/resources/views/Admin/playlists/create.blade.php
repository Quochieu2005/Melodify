@extends('layouts.admin')

@section('content')
    @include('Admin.playlists.form', ['item' => null, 'isEditing' => false])
@endsection
