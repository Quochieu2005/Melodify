'use client';

type UserAvatarProps = {
  name?: string | null;
  username?: string | null;
  avatarUrl?: string | null;
  className?: string;
  fallbackClassName?: string;
};

export default function UserAvatar({ name, username, avatarUrl, className = 'size-9', fallbackClassName = 'bg-[#765d8d]' }: UserAvatarProps) {
  const displayName = (name || username || 'M').trim();
  const initial = displayName.charAt(0).toUpperCase() || 'M';
  const source = avatarUrl?.trim() || null;

  return (
    <span aria-hidden="true" className={`relative grid shrink-0 place-items-center overflow-hidden rounded-full font-bold text-white ${fallbackClassName} ${className}`}>
      <span>{initial}</span>
      {source ? (
        // Avatar URLs can come from Google/Facebook/CDN hosts that are not known at build time.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={source} alt="" className="absolute inset-0 size-full object-cover" onError={(event) => event.currentTarget.remove()} />
      ) : null}
    </span>
  );
}
