import React from 'react';

const AllAssetsGraph: React.FC = () => {
  return (
    <iframe
      src="/icomos/atar.bot/data/allGraphesData.html"
      title="All Assets Knowledge Graph"
      style={{ width: '100%', height: '800px', border: 'none' }}
    />
  );
};

export default AllAssetsGraph;