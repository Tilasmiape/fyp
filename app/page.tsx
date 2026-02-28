'use client';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function LandingPage() {
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(window.innerWidth < 1024);
    
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(to right, #1e3a8a, #581c87, #3f0f5c)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1rem',
    }}>
      <div style={{ width: '100%', maxWidth: '80rem' }}>
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '3rem',
        }}>
          
          {/* LEFT SIDE */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* LOGO */}
            <div style={{ marginBottom: '3rem' }}>
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                backgroundColor: 'white',
                border: '4px solid #fcd34d',
                boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
                overflow: 'hidden',
              }}>
                <img 
                  src="/images/logo.png"
                  alt="Logo"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
            </div>

            {/* TEXT */}
            <div>
              <h1 style={{
                fontSize: '3.75rem',
                fontWeight: 'bold',
                color: '#fef3c7',
                marginBottom: '1rem',
              }}>
                Step Out
              </h1>
              <p style={{
                fontSize: '1.5rem',
                color: '#fef08a',
                fontWeight: '300',
                lineHeight: '1.625',
                maxWidth: '28rem',
              }}>
                and dance to your desired style with our top choreographers.
              </p>
            </div>

            {/* BUTTONS */}
            <div style={{ display: 'flex', gap: '1.5rem', paddingTop: '2rem' }}>
              <button
                onClick={() => router.push('/signin')}
                style={{
                  padding: '0.75rem 2.5rem',
                  borderRadius: '9999px',
                  border: '2px solid #a78bfa',
                  color: '#d8b4fe',
                  backgroundColor: 'transparent',
                  fontWeight: '600',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#a78bfa';
                  e.currentTarget.style.color = 'white';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#d8b4fe';
                }}
              >
                Sign In
              </button>
              <button
                onClick={() => router.push('/signup')}
                style={{
                  padding: '0.75rem 2.5rem',
                  borderRadius: '9999px',
                  backgroundColor: '#ca8a04',
                  color: 'white',
                  border: 'none',
                  fontWeight: '600',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  boxShadow: '0 10px 15px rgba(0,0,0,0.3)',
                  transition: 'all 0.3s',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#eab308';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#ca8a04';
                }}
              >
                Sign Up
              </button>
            </div>
          </div>

          {/* RIGHT SIDE - STATUE - CENTERED */}
          <div style={{ 
            flex: 1, 
            display: 'flex', 
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '500px',
          }}>
            <div style={{ 
              width: '400px', 
              height: '500px', 
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <img 
                src="/images/shiva-statue.png"
                alt="Dancer"
                style={{
                  width: '120%',
                  height: '120%',
                  objectFit: 'contain',
                  filter: 'drop-shadow(0 20px 25px rgba(0,0,0,1))',
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
