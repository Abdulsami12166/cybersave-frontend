import React from 'react';

interface CyberSaveLogoProps {
  collapsed?: boolean;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export const CyberSaveLogo: React.FC<CyberSaveLogoProps> = ({
  collapsed = false,
  size = 'medium',
  className = '',
}) => {
  if (collapsed) {
    return (
      <div 
        className={className}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          userSelect: 'none'
        }}
        title="CyberSave"
      >
        <div style={{
          fontSize: '24px',
          fontWeight: 900,
          letterSpacing: '-0.04em',
          lineHeight: 1,
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          display: 'flex',
          alignItems: 'center'
        }}>
          <span style={{ color: '#082567' }}>C</span>
          <span style={{ color: '#1668FE' }}>s</span>
        </div>
      </div>
    );
  }

  const titleSize = size === 'small' ? '19px' : size === 'large' ? '28px' : '23px';
  const subtitleSize = size === 'small' ? '4.0px' : size === 'large' ? '5.2px' : '4.5px';
  const lineWidth = size === 'small' ? '18px' : size === 'large' ? '30px' : '22px';

  return (
    <div 
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none',
        padding: '2px 0'
      }}
      title="CyberSave — DIGITAL SERVICES • TRUSTED ALWAYS"
    >
      <div style={{
        fontSize: titleSize,
        fontWeight: 900,
        letterSpacing: '-0.035em',
        lineHeight: 1.1,
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        display: 'flex',
        alignItems: 'baseline'
      }}>
        <span style={{ color: '#082567' }}>Cyber</span>
        <span style={{ color: '#1668FE' }}>save</span>
      </div>
      
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '5px',
        width: '100%',
        marginTop: '2px'
      }}>
        <div style={{
          width: lineWidth,
          height: '1px',
          background: '#082567',
          opacity: 0.65,
          borderRadius: '1px'
        }} />
        <span style={{
          fontSize: subtitleSize,
          fontWeight: 800,
          color: '#082567',
          letterSpacing: '0.14em',
          whiteSpace: 'nowrap',
          textTransform: 'uppercase',
          opacity: 0.85,
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        }}>
          DIGITAL SERVICES &bull; TRUSTED ALWAYS
        </span>
        <div style={{
          width: lineWidth,
          height: '1px',
          background: '#082567',
          opacity: 0.65,
          borderRadius: '1px'
        }} />
      </div>
    </div>
  );
};

export default CyberSaveLogo;
