import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Dáblio — Fotografia e Filmagem';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0e0e0d',
        color: '#f2efe9',
        fontFamily: 'Georgia, serif',
      }}>
        <div style={{
          width: 150,
          height: 150,
          border: '2px solid #d9a441',
          borderRadius: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#d9a441',
          fontSize: 100,
          marginBottom: 35,
        }}>W</div>
        <div style={{ fontSize: 82, letterSpacing: 8 }}>DÁBLIO</div>
        <div style={{ fontSize: 28, color: '#d9a441', marginTop: 18, letterSpacing: 5 }}>FOTOGRAFIA · FILMAGEM</div>
      </div>
    ),
    { ...size }
  );
}
