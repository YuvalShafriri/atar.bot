import React from 'react';

const AtarBotTab: React.FC = () => {
  return (
    <div className="atarbot-iframe-container" style={{ height: '80vh', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <iframe
        src="https://chatgpt.com/g/g-684fc78f67e0819189f359c7a02ae390-tr-bvt-qvrs-vtntyvt-tknyvn"
        title="אתר.בוט ChatGPT"
        style={{ border: 'none', width: '100%', height: '100%', minHeight: 500, borderRadius: 12, background: '#f9fafb' }}
        allow="clipboard-write; clipboard-read;"
        loading="lazy"
      />
    </div>
  );
};

export default AtarBotTab;
