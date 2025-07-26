import React from 'react';

interface GraphDashboardProps {
    allGraphData: Record<string, any>;
    allGrapheCleanData: any;
    thematicGraphData: any;
    nodeColors: Record<string, any>;
    selectedGraph?: string;
}

const GraphDashboard: React.FC<GraphDashboardProps> = ({ 
    allGraphData, 
    allGrapheCleanData, 
    thematicGraphData, 
    nodeColors, 
    selectedGraph 
}) => {
    return (
        <div>
            <h1>Graph Dashboard Test</h1>
            <p>This is a test component to verify export functionality.</p>
        </div>
    );
};

export default GraphDashboard;
