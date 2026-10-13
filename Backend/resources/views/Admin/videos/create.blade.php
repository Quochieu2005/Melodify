@extends('layouts.admin')

@section('content')
    @include('Admin.videos.form', ['item' => null, 'isEditing' => false])
@endsection
