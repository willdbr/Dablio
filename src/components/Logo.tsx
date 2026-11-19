import Link from 'next/link';

export default function Logo() {
  return (
    <Link href="/" className="brand">
      <span className="brand-mark" aria-hidden="true">W</span>
      <span>Dáblio</span>
    </Link>
  );
}
