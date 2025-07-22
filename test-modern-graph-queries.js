// test-modern-graph-queries.js
// Test script for modern LLM-based graph query system

const testQueries = [
    // Complex indirect connection queries
    "כמה נכסים קשורים עקיף לסמטת שפר",
    "מה הקשר העקיף בין בית הכנסת הגדול לשוק המחנה יהודה",
    "איזה ערכים תרבותיים קשורים עקיף לרחוב יפו",
    
    // Direct counting queries
    "כמה נכסי מורשת יש בעיר העתיקה",
    "כמה מבנים היסטוריים קשורים לערך האדריכלי",
    "מה המספר הכולל של אתרים ארכיאולוגיים",
    
    // Value-based queries
    "איזה נכסים בעלי ערך אדריכלי מיוחד",
    "מה הערכים התרבותיים של שכונת נחלאות",
    "איזה אתרים קשורים לערך היסטורי",
    
    // Relationship exploration
    "מה הקשר בין המסגד ובין התחנה המרכזית",
    "איך קשורים בתי הכנסת לשווקים בעיר",
    "מה הקשרים בין האתרים הנוצריים למוסלמיים",
    
    // Complex multi-hop queries
    "איזה נכסים קשורים לסמטת שפר דרך ערכים תרבותיים",
    "מה הנתיב מבית הכנסת הגדול לכנסיית הקבר דרך אתרים משותפים",
    "איך מגיעים מהכותל המערבי לשוק המחנה יהודה דרך קשרים תרבותיים"
];

// Function to test a query and show results
async function testQuery(query, graphData, fetchChatCompletion) {
    console.log('🔍 Testing Query:', query);
    console.log('=' .repeat(50));
    
    const startTime = Date.now();
    
    try {
        // Import the modern service
        const { chatGraphModern } = await import('../src/services/modernGraphQueryService.tsx');
        
        const result = await chatGraphModern(query, graphData, fetchChatCompletion);
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        console.log('✅ Result:', result);
        console.log(`⏱️ Duration: ${duration}ms`);
        console.log('');
        
        return { query, result, duration, success: true };
        
    } catch (error) {
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        console.error('❌ Error:', error.message);
        console.log(`⏱️ Duration: ${duration}ms`);
        console.log('');
        
        return { query, error: error.message, duration, success: false };
    }
}

// Function to run all tests
async function runAllTests(graphData, fetchChatCompletion) {
    console.log('🚀 Starting Modern Graph Query Tests');
    console.log('===================================');
    
    const results = [];
    
    for (const query of testQueries) {
        const result = await testQuery(query, graphData, fetchChatCompletion);
        results.push(result);
        
        // Small delay between queries to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Summary
    console.log('📊 Test Summary');
    console.log('===============');
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
    
    console.log(`✅ Successful: ${successful}/${results.length}`);
    console.log(`❌ Failed: ${failed}/${results.length}`);
    console.log(`⏱️ Average Duration: ${avgDuration.toFixed(0)}ms`);
    
    // Show failed queries
    if (failed > 0) {
        console.log('\n❌ Failed Queries:');
        results.filter(r => !r.success).forEach(r => {
            console.log(`- "${r.query}": ${r.error}`);
        });
    }
    
    return results;
}

// Example usage:
/*
// Load your graph data
const graphData = await fetch('data/meta-graph-from-allGrapheClean.json').then(r => r.json());

// Set up your chat completion function
const fetchChatCompletion = async (messages) => {
    // Your Gemini/OpenAI API call here
    return response;
};

// Run tests
const testResults = await runAllTests(graphData, fetchChatCompletion);
*/

export { testQueries, testQuery, runAllTests };
