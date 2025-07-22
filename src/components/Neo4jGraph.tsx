import { useEffect, useRef, useState } from 'react';
import neo4j from 'neo4j-driver';
// @ts-ignore
import { Network } from 'vis-network';
// @ts-ignore
import { DataSet } from 'vis-data';

export default function Neo4jGraph() {
  const containerRef = useRef<HTMLDivElement>(null);
  const driverRef = useRef<any>(null);
  const networkRef = useRef<any>(null);
  const nodesRef = useRef<any>(null);
  const edgesRef = useRef<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [graphLoaded, setGraphLoaded] = useState(false);

  // פונקציה להבאת הקשרים של צומת מסוימת
  const fetchConnections = async (nodeId: string) => {
    console.log(`🚀 fetchConnections התחיל עם nodeId: ${nodeId}`);
    console.log('בדיקת תנאים:', { driver: !!driverRef.current, network: !!networkRef.current, nodes: !!nodesRef.current, edges: !!edgesRef.current });
    
    const driver = driverRef.current;
    const network = networkRef.current;
    const nodes = nodesRef.current;
    const edges = edgesRef.current;
    
    if (!driver || !network || !nodes || !edges) {
      console.log('❌ חסר driver או network או nodes או edges - יוצא מהפונקציה');
      return;
    }
    
    try {
      console.log(`🔍 מביא קשרים עבור צומת ${nodeId}...`);
      setLoading(true);
      
      const session = driver.session();
      const nodeIdNum = Number(nodeId);
      
      // שאילתה פשוטה: תן לי את כל הצמתים והקשרים הקשורים לצומת הזה
      const query = `
        MATCH (center)-[r]-(connected) 
        WHERE id(center) = ${nodeIdNum}
        RETURN center, r, connected
      `;
      
      const result = await session.run(query);
      console.log(`📊 נמצאו ${result.records.length} קשרים`);
      console.log('תוצאות גולמיות:', result.records.map(r => ({
        center: r.get('center')?.properties?.title_he,
        connected: r.get('connected')?.properties?.title_he,
        relationship: r.get('r')?.type
      })));
      
      if (result.records.length === 0) {
        alert('לא נמצאו קשרים לצומת זו במסד הנתונים!');
        return;
      }
      
      // צור מפות חדשות לצמתים וקשרים
      const newNodes: any[] = [];
      const newEdges: any[] = [];
      const existingNodeIds = new Set(nodes.getIds());
      const existingEdgeIds = new Set(edges.getIds());
      
      result.records.forEach(record => {
        const center = record.get('center');
        const connected = record.get('connected');
        const relationship = record.get('r');
        
        // הוסף צמתים חדשים
        [center, connected].forEach(node => {
          if (node && node.identity) {
            const id = node.identity.toNumber();
            if (!existingNodeIds.has(id)) {
              const props = node.properties || {};
              const nodeType = node.labels && node.labels[0] || 'Node';
              const displayName = props.title_he || props.name || nodeType;
              
              newNodes.push({
                id: id,
                label: displayName,
                group: nodeType,
                title: JSON.stringify(props, null, 2)
              });
              existingNodeIds.add(id);
              console.log(`➕ צומת חדש: ${id} - ${displayName}`);
            }
          }
        });
        
        // הוסף קשר חדש
        if (relationship && center && connected) {
          const fromId = center.identity.toNumber();
          const toId = connected.identity.toNumber();
          // יצירת ID לא מכוון (מניעת קישור ההפוך)
          const [minId, maxId] = fromId < toId ? [fromId, toId] : [toId, fromId];
          const edgeId = `${minId}-${relationship.type}-${maxId}`;
          
          if (!existingEdgeIds.has(edgeId)) {
            newEdges.push({
              id: edgeId,
              from: fromId,
              to: toId,
              label: relationship.type,
              arrows: 'to',
              width: 3,
              color: '#0077cc'
            });
            existingEdgeIds.add(edgeId);
            console.log(`➕ קשר חדש: ${fromId} -> ${toId} (${relationship.type})`);
          }
        }
      });
      
      // הוסף את הצמתים והקשרים החדשים
      if (newNodes.length > 0) {
        nodes.add(newNodes);
        console.log(`✅ נוספו ${newNodes.length} צמתים חדשים`);
      }
      
      if (newEdges.length > 0) {
        edges.add(newEdges);
        console.log(`✅ נוספו ${newEdges.length} קשרים חדשים`);
      }
      
      await session.close();
      
    } catch (e: any) {
      console.error('❌ שגיאה בהבאת קשרים:', e);
      setError(`שגיאה בהבאת קשרים: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };async function loadGraph() {
    if (graphLoaded) return;
    setLoading(true);
    setError(null);
    
    try {
      console.log("🔑 מתחבר ל-Neo4j AuraDB...");
      const neo4jDriver = neo4j.driver(
        'neo4j+s://86300179.databases.neo4j.io',
        neo4j.auth.basic('neo4j', 'CzfvS8NMiK7tuBbMx-woUDdj_-mROPdNvOxrLIfDSV8')
      );
      driverRef.current = neo4jDriver;
      
      console.log("🔍 מריץ שאילתה להבאת נכסים בלבד...");
      const session = neo4jDriver.session();
        // שאילתה להבאת נכסים בלבד (צמתים מסוג HeritageAsset)
      const assetsQuery = await session.run('MATCH (a:HeritageAsset) RETURN a LIMIT 50');
      
      console.log("📊 מעבד תוצאות...", assetsQuery.records.length, "נכסים");
      console.log("📊 מעבד תוצאות...", assetsQuery.records.length, "נכסים (HeritageAsset)");
      const nodesDataSet = new DataSet<any>();
      const edgesDataSet = new DataSet<any>();
      nodesRef.current = nodesDataSet;
      edgesRef.current = edgesDataSet;
      
      // פונקציה להוספת צומת לגרף
      function addNodeToGraph(node: any) {
        if (node && node.identity && typeof node.identity.toNumber === 'function') {
          const nodeId = node.identity.toNumber();
              console.log("Adding node to graph:", nodeId, node.properties?.title_he);

          if (!nodesDataSet.get(nodeId)) {
            const nodeProps = node.properties || {};
            const nodeType = node.labels && node.labels[0] || 'Node';
            const displayName = nodeProps.title_he || '';
            nodesDataSet.add({
              id: nodeId,
              label: displayName,
              group: nodeType,
              title: JSON.stringify(nodeProps, null, 2)
            });
          }
        } else if (node) {
          console.warn('⚠️ Node missing identity or toNumber:', node);
        }
      }
      
      // הוספת נכסים בלבד
      assetsQuery.records.forEach(record => {
        addNodeToGraph(record.get('a'));
      });
      
      console.log("🎨 יוצר גרף ויזואלי ראשוני (רק נכסים)...");
      // יצירת רשת
      if (containerRef.current) {
        const networkInstance = new Network(containerRef.current, { nodes: nodesDataSet, edges: edgesDataSet }, {
          physics: { 
            enabled: true,
            barnesHut: { 
              gravitationalConstant: -3000, 
              centralGravity: 0.1,         
              springLength: 250,           
              springConstant: 0.04,         
              damping: 0.09                
            },
            stabilization: {
              iterations: 200             
            }
          },
          nodes: { 
            shape: 'dot',
            size: 40,                     
            font: { 
              size: 20,
              color: '#000000',
              face: 'arial'
            },
            shadow: true,
            borderWidth: 2
          },
          edges: { 
            width: 3,                     
            color: { color: '#0077cc', highlight: '#3399ff' },
            font: { size: 16, color: '#444444' },
            smooth: { enabled: true, type: 'dynamic', roundness: 0.5 },
            shadow: true
          },
          groups: {
            HeritageAsset: { color: '#4286f4', size: 60 },
            Asset: { color: '#4286f4', size: 60 },  // למקרה שיש גם תווית מסוג זה
            Person: { color: '#7BE141' },
            Value: { color: '#FFA500' },
            Place: { color: '#C2FABC' },
            Event: { color: '#EE6AA7' },
          },
          interaction: {
            hover: true,
            hoverConnectedEdges: true,
            multiselect: true,
            tooltipDelay: 200
          }
        });
        networkRef.current = networkInstance;
        
        // אירוע לחיצה כפולה - להצגת קשרים של נכס
        networkInstance.on('doubleClick', async function(params) {
          console.log("params:",params)
          if (params.nodes && params.nodes.length > 0) {
            const nodeId = params.nodes[0];
                console.log("Double click on nodeId:", nodeId);

            await fetchConnections(nodeId);
          }
        });
      }
      
      await session.close();
      setGraphLoaded(true);
    } catch (e: any) {
      console.error('❌ שגיאה בטעינת הגרף:', e);
      setError(e.message || 'שגיאה בטעינת הגרף');
    } finally {
      setLoading(false);
    }  }

  // סגירת החיבור כשהקומפוננטה מתפרקת
  useEffect(() => {
    return () => {
      if (driverRef.current) {
        driverRef.current.close();
      }
    };
  }, []);
  
  return (
    <div className="p-4 rtl">
      <h1 className="text-2xl mb-4">גרף Neo4j - AuraDB</h1>
      <div className="mb-4 text-gray-700">
        לחץ כפול על נכס כדי לראות את הקשרים שלו לצמתים אחרים
      </div>
      <button 
        onClick={loadGraph}
        disabled={loading || graphLoaded}
        className="px-4 py-2 bg-blue-500 text-white rounded mb-4 hover:bg-blue-600 transition">
        {loading ? '🔄 טוען...' : graphLoaded ? '✅ הגרף נטען' : '📊 טען גרף Neo4j'}
      </button>
      <button 
        onClick={() => { setGraphLoaded(false); setError(null); }}
        disabled={loading || !graphLoaded}
        className="px-4 py-2 bg-gray-500 text-white rounded mb-4 mr-2 hover:bg-gray-600 transition">
        טען מחדש
      </button>
      {loading && <span className="mr-2 text-blue-600">🔄 מעבד...</span>}
      {error && <div className="text-red-500 mb-4 p-2 bg-red-50 border border-red-200 rounded">{error}</div>}
      <div 
        ref={containerRef} 
        className={`border border-gray-300 rounded ${graphLoaded ? '' : 'hidden'}`}
        style={{height: '80vh', width: '100%'}} 
      />
      {!graphLoaded && !loading && !error && (
        <div className="text-gray-500 p-8 text-center border border-gray-200 rounded bg-gray-50">
          לחץ על הכפתור כדי לטעון את גרף הנכסים מ-Neo4j AuraDB
        </div>
      )}
    </div>
  );
}