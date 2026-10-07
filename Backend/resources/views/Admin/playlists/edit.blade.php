@extends('layouts.admin')

@section('content')
    @include('Admin.playlists.form', ['isEditing' => true])
@endsection
