@extends('layouts.admin')

@section('content')
    <div class="admin-page admin-dashboard">
        <section class="ant-card ant-card-bordered admin-dashboard-hero" aria-labelledby="dashboard-title">
            <div class="ant-card-body admin-dashboard-hero-copy">
                <div class="admin-dashboard-eyebrow">
                    <span class="admin-dashboard-live-dot" aria-hidden="true"></span>
                    <span>Trung tâm vận hành âm nhạc</span>
                    <span class="admin-dashboard-eyebrow-divider" aria-hidden="true"></span>
                    <span>{{ now()->format('d/m/Y') }}</span>
                </div>
                <h1 id="dashboard-title">Tổng quan <em>Melodify</em></h1>
                <p>Theo dõi nhịp nghe, kho nội dung và những gì đang diễn ra trong hệ thống.</p>
            </div>

            <div class="ant-card admin-dashboard-pulse" aria-label="Tóm tắt lượt nghe 7 ngày gần nhất">
                <div class="admin-dashboard-pulse-top">
                    <span>Nhịp nghe 7 ngày</span>
                    <x-anticon name="sound" aria-hidden="true" />
                </div>
                <strong>{{ number_format($playTrend->sum('value')) }}</strong>
                <div class="admin-dashboard-wave" aria-hidden="true">
                    <i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i>
                </div>
                <span class="admin-dashboard-pulse-foot">lượt nghe được ghi nhận</span>
            </div>
        </section>

        <section class="admin-dashboard-kpis" aria-label="Chỉ số tổng quan">
            <article class="ant-card ant-card-bordered admin-dashboard-kpi" data-tone="cyan">
                <div class="admin-dashboard-kpi-icon"><x-anticon name="sound" aria-hidden="true" /></div>
                <div class="ant-statistic">
                    <div class="ant-statistic-title">Bài hát trong kho</div>
                    <div class="ant-statistic-content"><strong>{{ number_format($stats['songs']) }}</strong></div>
                    <small>nội dung âm thanh</small>
                </div>
            </article>
            <article class="ant-card ant-card-bordered admin-dashboard-kpi" data-tone="violet">
                <div class="admin-dashboard-kpi-icon"><x-anticon name="team" aria-hidden="true" /></div>
                <div class="ant-statistic">
                    <div class="ant-statistic-title">Nghệ sĩ</div>
                    <div class="ant-statistic-content"><strong>{{ number_format($stats['artists']) }}</strong></div>
                    <small>hồ sơ đang quản lý</small>
                </div>
            </article>
            <article class="ant-card ant-card-bordered admin-dashboard-kpi" data-tone="amber">
                <div class="admin-dashboard-kpi-icon"><x-anticon name="user" aria-hidden="true" /></div>
                <div class="ant-statistic">
                    <div class="ant-statistic-title">Người dùng</div>
                    <div class="ant-statistic-content"><strong>{{ number_format($stats['users']) }}</strong></div>
                    <small>tài khoản trong hệ thống</small>
                </div>
            </article>
            <article class="ant-card ant-card-bordered admin-dashboard-kpi" data-tone="mint">
                <div class="admin-dashboard-kpi-icon"><x-anticon name="play-circle" aria-hidden="true" /></div>
                <div class="ant-statistic">
                    <div class="ant-statistic-title">Lượt nghe hôm nay</div>
                    <div class="ant-statistic-content"><strong>{{ number_format($stats['playsToday']) }}</strong></div>
                    <small>cập nhật theo thời gian thực</small>
                </div>
            </article>
        </section>

        <section class="admin-dashboard-main-grid">
            <article class="ant-card ant-card-bordered admin-dashboard-panel admin-dashboard-chart-panel">
                <div class="admin-dashboard-panel-heading">
                    <div>
                        <span class="admin-dashboard-panel-kicker">Phân tích</span>
                        <h2>Lượt nghe theo ngày</h2>
                        <p>Nhịp hoạt động của kho nhạc trong 7 ngày gần nhất.</p>
                    </div>
                    <a class="ant-btn ant-btn-link admin-dashboard-panel-link"
                        href="{{ route('admin.analytics.song-views') }}">Xem phân tích</a>
                </div>
                <div class="admin-dashboard-chart-summary">
                    <strong>{{ number_format($playTrend->sum('value')) }}</strong>
                    <span>lượt nghe trong 7 ngày</span>
                </div>
                <div class="admin-dashboard-chart" role="img" aria-label="Biểu đồ lượt nghe trong 7 ngày gần nhất">
                    @php($maxPlays = max(1, (int) $playTrend->max('value')))
                    @foreach ($playTrend as $point)
                        @php($barHeight = $point['value'] > 0 ? max(8, (int) round(($point['value'] / $maxPlays) * 100)) : 5)
                        <div class="admin-dashboard-chart-column">
                            <span
                                class="admin-dashboard-chart-value">{{ $point['value'] > 0 ? number_format($point['value']) : '' }}</span>
                            <div class="admin-dashboard-chart-track">
                                <span class="admin-dashboard-chart-bar" style="height: {{ $barHeight }}%;"></span>
                            </div>
                            <span class="admin-dashboard-chart-label">{{ $point['label'] }}</span>
                        </div>
                    @endforeach
                </div>
                @if ($playTrend->sum('value') === 0)
                    <div class="ant-empty admin-dashboard-chart-empty">
                        <x-anticon name="play-circle" aria-hidden="true" />
                        <span>Chưa có lượt nghe trong khoảng thời gian này.</span>
                    </div>
                @endif
            </article>

            <aside class="ant-card ant-card-bordered admin-dashboard-panel admin-dashboard-shortcuts">
                <div class="admin-dashboard-panel-heading">
                    <div>
                        <span class="admin-dashboard-panel-kicker">Thao tác nhanh</span>
                        <h2>Điều khiển nội dung</h2>
                    </div>
                </div>
                <div class="admin-dashboard-shortcut-list">
                    <a href="{{ route('admin.songs.create') }}" class="admin-dashboard-shortcut" data-accent="cyan">
                        <span class="admin-dashboard-shortcut-icon"><x-anticon name="plus" aria-hidden="true" /></span>
                        <span><strong>Thêm bài hát</strong><small>Đưa nội dung mới vào kho</small></span>
                        <span class="admin-dashboard-shortcut-arrow" aria-hidden="true">↗</span>
                    </a>
                    <a href="{{ route('admin.analytics.song-views') }}" class="admin-dashboard-shortcut"
                        data-accent="violet">
                        <span class="admin-dashboard-shortcut-icon"><x-anticon name="eye" aria-hidden="true" /></span>
                        <span><strong>Xem lượt nghe</strong><small>Đọc bảng xếp hạng bài hát</small></span>
                        <span class="admin-dashboard-shortcut-arrow" aria-hidden="true">↗</span>
                    </a>
                    <a href="{{ route('admin.playlists.index') }}" class="admin-dashboard-shortcut" data-accent="amber">
                        <span class="admin-dashboard-shortcut-icon"><x-anticon name="unordered-list"
                                aria-hidden="true" /></span>
                        <span><strong>Quản lý playlist</strong><small>Sắp xếp bộ sưu tập nghe</small></span>
                        <span class="admin-dashboard-shortcut-arrow" aria-hidden="true">↗</span>
                    </a>
                </div>
            </aside>
        </section>

        <section class="admin-dashboard-secondary-grid ant-row" aria-label="Biểu đồ người dùng và thanh toán">
            <article class="ant-card ant-card-bordered admin-dashboard-panel admin-dashboard-mini-panel">
                <div class="admin-dashboard-panel-heading">
                    <div>
                        <span class="admin-dashboard-panel-kicker">Doanh thu</span>
                        <h2>Thanh toán thành công</h2>
                        <p>Tổng tiền ghi nhận trong 7 ngày gần nhất.</p>
                    </div>
                    <a class="ant-btn ant-btn-link admin-dashboard-panel-link"
                        href="{{ route('admin.payments.index') }}">Xem giao dịch</a>
                </div>
                <div class="admin-dashboard-mini-summary">
                    <strong>{{ number_format($paymentTrend->sum('value'), 0, ',', '.') }}₫</strong>
                    <span>Hôm nay: {{ number_format($stats['paymentsToday'], 0, ',', '.') }}₫</span>
                </div>
                <div class="admin-dashboard-mini-chart" role="img"
                    aria-label="Biểu đồ thanh toán trong 7 ngày gần nhất">
                    @php($maxPayment = max(1, (float) $paymentTrend->max('value')))
                    @foreach ($paymentTrend as $point)
                        @php($barHeight = $point['value'] > 0 ? max(8, (int) round(($point['value'] / $maxPayment) * 100)) : 5)
                        <div class="admin-dashboard-chart-column"
                            title="{{ number_format($point['value'], 0, ',', '.') }}₫ - {{ $point['label'] }}">
                            <span class="admin-dashboard-chart-value"></span>
                            <div class="admin-dashboard-chart-track">
                                <span class="admin-dashboard-chart-bar admin-dashboard-payment-bar"
                                    style="height: {{ $barHeight }}%;"></span>
                            </div>
                            <span class="admin-dashboard-chart-label">{{ $point['label'] }}</span>
                        </div>
                    @endforeach
                </div>
                @if ($paymentTrend->sum('value') == 0)
                    <div class="ant-empty ant-empty-normal admin-dashboard-mini-empty">
                        <span>Chưa có giao dịch thanh toán thành công.</span>
                    </div>
                @endif
            </article>

            <article class="ant-card ant-card-bordered admin-dashboard-panel admin-dashboard-mini-panel">
                <div class="admin-dashboard-panel-heading">
                    <div>
                        <span class="admin-dashboard-panel-kicker">Tăng trưởng</span>
                        <h2>Người dùng mới</h2>
                        <p>Số tài khoản đăng ký trong 7 ngày gần nhất.</p>
                    </div>
                    <a class="ant-btn ant-btn-link admin-dashboard-panel-link"
                        href="{{ route('admin.users.index') }}">Xem người dùng</a>
                </div>
                <div class="admin-dashboard-mini-summary">
                    <strong>{{ number_format($userTrend->sum('value')) }}</strong>
                    <span>tài khoản mới trong 7 ngày</span>
                </div>
                <div class="admin-dashboard-mini-chart" role="img"
                    aria-label="Biểu đồ người dùng mới trong 7 ngày gần nhất">
                    @php($maxUsers = max(1, (int) $userTrend->max('value')))
                    @foreach ($userTrend as $point)
                        @php($barHeight = $point['value'] > 0 ? max(8, (int) round(($point['value'] / $maxUsers) * 100)) : 5)
                        <div class="admin-dashboard-chart-column"
                            title="{{ number_format($point['value']) }} người dùng - {{ $point['label'] }}">
                            <span class="admin-dashboard-chart-value"></span>
                            <div class="admin-dashboard-chart-track">
                                <span class="admin-dashboard-chart-bar admin-dashboard-user-bar"
                                    style="height: {{ $barHeight }}%;"></span>
                            </div>
                            <span class="admin-dashboard-chart-label">{{ $point['label'] }}</span>
                        </div>
                    @endforeach
                </div>
                @if ($userTrend->sum('value') == 0)
                    <div class="ant-empty ant-empty-normal admin-dashboard-mini-empty">
                        <span>Chưa có người dùng mới trong khoảng thời gian này.</span>
                    </div>
                @endif
            </article>
        </section>

        <section class="admin-dashboard-bottom-grid">
            <article class="ant-card ant-card-bordered admin-dashboard-panel admin-dashboard-recent-panel">
                <div class="admin-dashboard-panel-heading">
                    <div>
                        <span class="admin-dashboard-panel-kicker">Kho nội dung</span>
                        <h2>Bài hát mới nhất</h2>
                    </div>
                    <a class="ant-btn ant-btn-link admin-dashboard-panel-link"
                        href="{{ route('admin.songs.index') }}">Xem tất cả</a>
                </div>
                <div class="admin-dashboard-song-list">
                    @forelse($latestSongs as $song)
                        <div class="admin-dashboard-song-row">
                            <div class="admin-dashboard-song-art">
                                @if (filled($song->cover_url))
                                    <img src="{{ $song->cover_url }}" alt="" loading="lazy">
                                @else
                                    <x-anticon name="sound" aria-hidden="true" />
                                @endif
                            </div>
                            <div class="admin-dashboard-song-copy">
                                <strong>{{ $song->title }}</strong>
                                <span>{{ $song->createdByArtist?->name ?? 'Chưa có nghệ sĩ' }}</span>
                            </div>
                            <span class="admin-dashboard-song-album">{{ $song->album?->title ?? 'Đĩa đơn' }}</span>
                            <span
                                class="admin-dashboard-status {{ $song->status === 'published' ? 'is-published' : 'is-draft' }}">
                                <i
                                    aria-hidden="true"></i>{{ $song->status === 'published' ? 'Đã phát hành' : 'Bản nháp' }}
                            </span>
                        </div>
                    @empty
                        <div class="admin-dashboard-empty"><x-anticon name="sound" aria-hidden="true" /><strong>Chưa có
                                bài hát</strong><span>Bài hát mới sẽ xuất hiện tại đây.</span></div>
                    @endforelse
                </div>
            </article>

            <article class="ant-card ant-card-bordered admin-dashboard-panel admin-dashboard-ranking-panel">
                <div class="admin-dashboard-panel-heading">
                    <div>
                        <span class="admin-dashboard-panel-kicker">30 ngày qua</span>
                        <h2>Đang được nghe nhiều</h2>
                    </div>
                    <a class="ant-btn ant-btn-link admin-dashboard-panel-link"
                        href="{{ route('admin.analytics.song-views') }}">Chi tiết</a>
                </div>
                <div class="admin-dashboard-ranking-list">
                    @forelse($topSongs as $index => $item)
                        <div class="admin-dashboard-ranking-row">
                            <span
                                class="admin-dashboard-ranking-number">{{ str_pad((string) ($index + 1), 2, '0', STR_PAD_LEFT) }}</span>
                            <div class="admin-dashboard-ranking-copy">
                                <strong>{{ $item['song']->title }}</strong>
                                <span>{{ $item['song']->createdByArtist?->name ?? 'Chưa có nghệ sĩ' }}</span>
                            </div>
                            <span class="admin-dashboard-ranking-plays">{{ number_format($item['plays']) }}
                                <small>lượt</small></span>
                        </div>
                    @empty
                        <div class="admin-dashboard-empty admin-dashboard-empty-compact"><x-anticon name="play-circle"
                                aria-hidden="true" /><span>Chưa có dữ liệu xếp hạng.</span></div>
                    @endforelse
                </div>
            </article>
        </section>
    </div>
@endsection
